package services
import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.headers.{Accept, Authorization, GenericHttpCredentials, Location}
import akka.http.scaladsl.model.{HttpCharsets, HttpRequest, HttpResponse, MediaRange, MediaType, MediaTypes, StatusCodes, Uri}
import akka.stream.Materializer
import akka.util.ByteString
import io.circe
import models.gitlab.{Branch, GitlabProject, JobResponse, MergeRequest}
import models.gitlab.MergeRequestState.MergeRequestState
import play.api.Configuration
import io.circe.generic.auto._

import scala.annotation.switch
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import models.github._
import org.slf4j.LoggerFactory

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import javax.inject.{Inject, Singleton}

@Singleton
class GithubAPI @Inject() (config:Configuration)(implicit actorSystem: ActorSystem, materializer: Materializer) extends VCSAPI {
  import HttpHelpers._

  private val logger = LoggerFactory.getLogger(getClass)
  private def getHttp = Http()

  val githubOrgName = config.getOptional[String]("github.orgname")
  val githubToken = config.getOptional[String]("github.token")

  val defaultGithubHeaders = Accept(MediaRange(MediaType.customWithFixedCharset("application","vnd.github.v3+json",HttpCharsets.`UTF-8`)))

  private def makeRequest(section:String, subpath:String) = {
    githubOrgName match {
      case Some(org)=>
        val uriString = s"https://api.github.com/$section/$org/$subpath"
        val actualHeaders = Seq(Some(defaultGithubHeaders), githubToken.map(t=>Authorization(GenericHttpCredentials("token", t)))).collect({case Some(h)=>h})
        logger.debug(s"Github API request is $uriString")
          HttpRequest(
          uri = uriString,
          headers = actualHeaders
        )
      case None=>throw new RuntimeException("Github integration is not configured. Please set `github.orgname` in the app config")
    }
  }

  override def listProjects: Future[Either[circe.Error, Seq[GitlabProject]]] = {
    getHttp
      .singleRequest(makeRequest("org","projects"))
      .flatMap(response => {
        (response.status: @switch) match {
          case StatusCodes.OK =>
            for {
              serverContent <- unmarshalContent[GitHubProjectResponse](consumeResponseContent(response))
              result <- Future(serverContent.map(_.artifacts.map(_.mapToGitlab)))
            } yield result
          case _=>
            consumeResponseContent(response).flatMap(content=> {
              logger.error(s"Could not list github projects, server returned ${response.status} ${content.utf8String}")
              Future.failed(new RuntimeException("External server error"))
            })
        }
      })
  }

  override def jobsForProject(projectId: String): Future[Either[circe.Error, Seq[JobResponse]]] = {
    getHttp
      .singleRequest(makeRequest("repos",s"$projectId/actions/runs"))
      .flatMap(response=>{
        (response.status: @switch) match {
          case StatusCodes.OK =>
            for {
              serverContent <- unmarshalContent[WorkflowRunsResponse](consumeResponseContent(response))
              result <- Future(serverContent.map(_.workflow_runs.map(_.mapToGitlab)))
            } yield result
          case StatusCodes.NotFound=>
            logger.warn(s"Tried to get jobs for project $projectId which does not exist")
            Future.failed(new RuntimeException("Unknown project"))
          case _=>
            consumeResponseContent(response).flatMap(content=> {
              logger.error(s"Could not list github projects, server returned ${response.status} ${content.utf8String}")
              Future.failed(new RuntimeException("External server error"))
            })
        }

      })
  }

  /**
   * Given a project and an artifact ID, download the contents of the zip as a ByteString
   * @param providedUrl a String or URI object giving the url to download from. This is obtained from the Github API
   * @return a Future containing the raw zip data. Fails on error.
   */
  private def downloadArtifactsZip(providedUrl:Uri):Future[ByteString] = {
    val maxIterationDepth = config.getOptional[Int]("github.max-redirects").getOrElse(10)

    def recursiveFind(request:HttpRequest, iterations:Int=0):Future[HttpResponse] = {
      getHttp
        .singleRequest(request)
        .flatMap(response => {
          (response.status: @switch) match {
            case StatusCodes.Found =>
              response.header[Location] match {
                case Some(realUri)=>
                  logger.info(s"Reading ${request.uri} redirected to $realUri")
                  if(iterations<maxIterationDepth) {
                    recursiveFind(HttpRequest(uri = realUri.uri), iterations + 1)
                  } else {
                    logger.error(s"Received too many layers of redirection, current limit is $maxIterationDepth.")
                    Future.failed(new RuntimeException("Too many redirects"))
                  }
                case None=>
                  Future.failed(new RuntimeException("Received a 302 redirect without a location field, this is an error with the remote service"))
              }
            case StatusCodes.OK =>
              Future(response)
            case StatusCodes.NotFound=>
              logger.error(s"No artifacts available for artifact id ${providedUrl.toString()}")
              Future.failed(new RuntimeException("No artifacts available"))
            case _=>
              consumeResponseContent(response).flatMap(content=> {
                logger.error(s"Could not get artifacts zip, server returned ${response.status} ${content.utf8String}")
                Future.failed(new RuntimeException("External server error"))
              })
          }
        })
    }

    val actualHeaders = Seq(Some(defaultGithubHeaders), githubToken.map(t=>Authorization(GenericHttpCredentials("token", t)))).collect({case Some(h)=>h})
    recursiveFind(HttpRequest(uri=providedUrl, headers=actualHeaders)).flatMap(consumeResponseContent)
  }

  private def listArtifacts(artifactsUrl:Uri):Future[Either[circe.Error, Seq[GitHubArtifact]]] = {
    getHttp
      .singleRequest(HttpRequest(uri=artifactsUrl, headers=Seq(defaultGithubHeaders)))
      .flatMap(response=>{
        (response.status: @switch) match {
          case StatusCodes.OK=>
              unmarshalContent[GitHubArtifactsResponse](consumeResponseContent(response)).map(_.map(_.artifacts))
          case _=>
            consumeResponseContent(response).flatMap(content=> {
              logger.error(s"Could not get artifacts zip, server returned ${response.status} ${content.utf8String}")
              Future.failed(new RuntimeException("External server error"))
            })
        }
      })
  }

  def workflowRunsForBranch(projectId:String, branchName:String) = {
    getHttp
      .singleRequest(makeRequest("repos", s"$projectId/actions/runs?branch=${URLEncoder.encode(branchName, StandardCharsets.UTF_8)}"))
      .flatMap(response=>{
        (response.status: @switch) match {
          case StatusCodes.OK=>
            for {
              serverContent <- unmarshalContent[WorkflowRunsResponse](consumeResponseContent(response))
              result <- Future(serverContent.map(_.workflow_runs))
            } yield result
          case StatusCodes.NotFound=>
            Future(Right(Seq()))
          case _=>
            consumeResponseContent(response).flatMap(content=> {
              logger.error(s"Could not get workflow runs for branch $branchName of $projectId, server returned ${response.status} ${content.utf8String}")
              Future.failed(new RuntimeException("External server error"))
            })
        }
      })
  }

  /**
   * gets a stream of the artifacts zip. Note that `jobName` is not currently used in the github implementation
   * @param projectId the project name to query
   * @param branchName the branch name
   * @param jobName not used
   * @return a Future, containing a ByteString representation of the entire compressed zip data. On error this will fail.
   */
  override def artifactsZipForBranch(projectId: String, branchName: String, jobName: String): Future[Option[ByteString]] = {
    for {
      maybeRun <- workflowRunsForBranch(projectId, branchName).map({
        case Left(err)=>
          logger.error(s"Could not parse workflow runs response for branch $branchName of project $projectId: $err")
          throw new RuntimeException("Bad response from server")
        case Right(runs)=>
          runs.sortBy(_.run_number)(Ordering.Int.reverse).headOption
      })
      artifacts <- if(maybeRun.isDefined) listArtifacts(maybeRun.get.artifacts_url) else Future(Right(Seq()))
      maybeArtifactInfo <- artifacts match {
        case Left(err)=>
          logger.error(s"Could not parse artifact list response for branch $branchName of project $projectId: $err")
          throw new RuntimeException("Bad response from server")
        case Right(results)=>
          if(results.length>1) {
            Future(results.filter(_.name=="build-info").filter(!_.expired).sortBy(_.created_at).headOption)
          } else {
            Future(results.find(!_.expired))
          }
      }
      content <- if(maybeArtifactInfo.isDefined) downloadArtifactsZip(maybeArtifactInfo.get.archive_download_url).map(Some.apply) else Future(None)
    } yield content
  }

  override def branchesForProject(projectId: String): Future[Either[circe.Error, Seq[Branch]]] = {
    getHttp
      .singleRequest(makeRequest("repos",s"${URLEncoder.encode(projectId, StandardCharsets.UTF_8)}/branches"))
      .flatMap(response=>{
        response.status match {
          case StatusCodes.OK=>
            unmarshalContent[Seq[GitHubBranch]](consumeResponseContent(response)).map(_.map(_.map(_.mapToGitlab)))
          case StatusCodes.NotFound=>
            logger.error(s"Project $projectId does not exist when trying to get branches")
            Future.failed(new RuntimeException("Project does not exist"))
          case _=>
            consumeResponseContent(response).flatMap(content=> {
              logger.error(s"Could not get branches for $projectId, server returned ${response.status} ${content.utf8String}")
              Future.failed(new RuntimeException("External server error"))
            })
        }
      })
  }

  override def getOpenMergeRequests(projectId: String, forStatus: Option[MergeRequestState]): Future[Either[circe.Error, Seq[MergeRequest]]] = {
    getHttp
      .singleRequest(makeRequest("repos",s"${URLEncoder.encode(projectId, StandardCharsets.UTF_8)}/pulls?state=open"))
      .flatMap(response=>{
        response.status match {
          case StatusCodes.OK=>
            unmarshalContent[Seq[GitHubPR]](consumeResponseContent(response)).map(_.map(_.map(_.mapToGitlab)))
          case _=>
            consumeResponseContent(response).flatMap(content=> {
              logger.error(s"Could not get pull requests for $projectId, server returned ${response.status} ${content.utf8String}")
              Future.failed(new RuntimeException("External server error"))
            })
        }
      })
  }
}
