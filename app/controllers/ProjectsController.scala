package controllers

import akka.actor.ActorSystem
import akka.http.scaladsl.model.{ContentType, ContentTypes, HttpEntity, HttpResponse, MediaTypes, StatusCodes}
import akka.stream.Materializer
import auth.{BearerTokenAuth, Security}
import play.api.Configuration
import play.api.mvc.{AbstractController, ControllerComponents, ResponseHeader, Result}
import services.{GitlabAPI, HttpError, ZipReader}

import javax.inject.{Inject, Singleton}
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global
import io.circe.syntax._
import io.circe.generic.auto._
import models.BuildInfo
import models.gitlab.MergeRequestState
import models.responses.GenericErrorResponse
import org.slf4j.LoggerFactory
import play.api.libs.circe.Circe
import scalacache.memcached._
import scalacache.serialization.circe._
import scalacache.modes.scalaFuture._

import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.time.ZonedDateTime
import scala.concurrent.duration.Duration
import scala.util.Try

@Singleton
class ProjectsController @Inject() (cc:ControllerComponents,
                                    override val bearerTokenAuth:BearerTokenAuth,
                                    override val config:Configuration)
                                   (implicit actorSystem: ActorSystem, mat:Materializer) extends AbstractController(cc) with Circe with Security {
  private implicit val memcachedCache = MemcachedCache[BuildInfo](config.get[String]("memcached.location"))
  private val maybeCacheTTL = config.getOptional[Duration]("memcached.ttl")

  private val api = new GitlabAPI(config.get[String]("gitlab.api-token"))
  override protected val logger = LoggerFactory.getLogger(getClass)

  /**
   * takes a future from the gitlab API object and converts it into a Future[Result]
   * @param from the api response to convert
   * @tparam T data type of the domain object that the response returns
   * @return a play framework result
   */
  def genericOutput[T:io.circe.Encoder](from:Future[Either[io.circe.Error, T]]) =
    from.map({
      case Left(decodingError)=>
        logger.error(s"Could not decode response from server: $decodingError")
        InternalServerError(GenericErrorResponse("remote_error", decodingError.toString).asJson)
      case Right(apiContent)=>
        Ok(apiContent.asJson)
    })
      .recover({
        case err:Throwable=>
          logger.error(s"gitlab api operation failed: ${err.getMessage}", err)
          InternalServerError(GenericErrorResponse("error", err.getMessage).asJson)
      })

  def knownProjects = IsAdminAsync { uid=> req=>
    genericOutput(api.listProjects)
  }

  def jobsForProject(projectId:Long) = IsAdminAsync { uid=> req=>
    genericOutput(api.jobsForProject(projectId.toString))
  }

  def checkArtifacts(projectId:Long, branchName:String, jobName:String) = IsAdminAsync { uid=> req=>
    api.artifactsZipForBranch(projectId.toString, branchName, jobName)
      .map(bytes=>{
        val entity = play.api.http.HttpEntity.Strict(bytes, Some("application/zip"))
        Result(
          header=ResponseHeader(200, Map.empty),
          body=entity
        )
      })
      .recover({
        case err:Throwable=>
          logger.error(s"gitlab api operation failed: ${err.getMessage}", err)
          InternalServerError(GenericErrorResponse("error", err.getMessage).asJson)
      })
  }

  def getBuildInfo(projectId:Long, branchName:String, jobName:String) = IsAdminAsync { uid=> req=>
    val cacheKey = s"$projectId-$branchName-$jobName"
    scalacache.get(cacheKey).flatMap({
      case Some(buildInfo)=>
        logger.debug(s"Serving result for project id $projectId, branch $branchName, job $jobName from cache...")
        Future(Some(Right(buildInfo)))  //we got a hit from the cache, don't bother going to the external service
      case None=> //nothing from the cache, look it up from the external service
        logger.debug(s"Serving result for project id $projectId, branch $branchName, job $jobName from origin...")
        findNewBuildInfo(projectId, branchName, jobName).flatMap({
          case result @ Some(Right(buildInfo))=>
            scalacache.put(cacheKey)(buildInfo, maybeCacheTTL).map(_=>result)
          case result @ _=>
            Future(result)
        })
    }).map({
        case Some(Right(buildInfo))=>
          Ok(buildInfo.asJson)
        case Some(Left(parseErr))=>
          InternalServerError(GenericErrorResponse("invalid_data", s"extracted information failed to parse: $parseErr").asJson)
        case None=>
          NotFound(GenericErrorResponse("not_found", "no build info can be found for that job of that branch of that project. Consult the logs for more details").asJson)
      }).recover({
      case httpErr:HttpError=>
        if(httpErr.getStatusCode==StatusCodes.NotFound) {
          NotFound(GenericErrorResponse("not_found", "build info is not available from this build").asJson)
        } else {
          logger.error(s"Could not extract build info: ${httpErr.getMessage}")
          InternalServerError(GenericErrorResponse("error", httpErr.getMessage).asJson)
        }
      case err:Throwable=>
        logger.error(s"Could not extract build info: ${err.getMessage}", err)
        InternalServerError(GenericErrorResponse("error", err.getMessage).asJson)
    })
  }

  /**
   * extract the build-info.yaml information, if available, from gitlab
   * @param projectId project ID to query
   * @param branchName branch name to query
   * @param jobName pipeline job name that outputs build-info.yaml as an artefact
   * @return A Future, which contains None if there was no build-info available; Left if there was build-info which could
   *         not be parsed; Right if there was parsable BuildInfo.
   */
  def findNewBuildInfo(projectId:Long, branchName:String, jobName:String) = {
    logger.debug(s"branchName is ${branchName}")
    logger.debug(s"jobName is $jobName")
    for {
      gitRef <- Future.fromTry(Try { URLDecoder.decode(branchName, StandardCharsets.UTF_8) })
      zipContent <- api.artifactsZipForBranch(projectId.toString, gitRef, jobName)
      zipReader <- Future(new ZipReader(zipContent.toArray))
      maybeBuildInfo <- Future.fromTry(zipReader.locateBuildInfo())
    } yield maybeBuildInfo

  }

  /**
   * proxy a request to the GitLab API for the recent branches of the project
   * @param projectId project ID to query
   */
  def branchesForProject(projectId:Long) = IsAdminAsync { uid=> req=>
    api.branchesForProject(projectId.toString).map({
      case Right(branches)=>
        Ok(branches.sortBy(_.commit.committed_date).asJson)
      case Left(err)=>
        logger.error(s"could not retrieve branches for project id $projectId: ${err.toString}")
        InternalServerError(GenericErrorResponse("error",s"gitlab api problem: ${err.toString}").asJson)
    }).recover({
      case err:Throwable=>
        logger.error(s"Get branches operation threw an exception: ${err.getMessage}", err)
        InternalServerError(GenericErrorResponse("internal_error","An unexpected exception was thrown, see server logs for details").asJson)
    })
  }

  def mrForProject(projectId:Long) = IsAdminAsync { uid=> req=>
    import models.gitlab.MergeRequestCodec._

    api.getOpenMergeRequests(projectId.toString,Some(MergeRequestState.opened)).map({
      case Right(mrs)=>
        Ok(mrs.sortBy(_.created_at).asJson)
      case Left(err)=>
        logger.error(s"Could not retrieve merge requests for project id $projectId: ${err.toString}")
        InternalServerError(GenericErrorResponse("error",s"gitlab api problem: ${err.toString}").asJson)
    }).recover({
      case err:Throwable=>
        logger.error(s"Get branches operation threw an exception: ${err.getMessage}", err)
        InternalServerError(GenericErrorResponse("internal_error","An unexpected exception was thrown, see server logs for details").asJson)
    })
  }
}
