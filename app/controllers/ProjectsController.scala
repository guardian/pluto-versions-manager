package controllers

import akka.actor.ActorSystem
import akka.http.scaladsl.model.{ContentType, ContentTypes, HttpEntity, HttpResponse, MediaTypes, StatusCodes}
import akka.stream.Materializer
import play.api.Configuration
import play.api.mvc.{AbstractController, ControllerComponents, ResponseHeader, Result}
import services.{GitlabAPI, HttpError, ZipReader}

import javax.inject.{Inject, Singleton}
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global
import io.circe.syntax._
import io.circe.generic.auto._
import models.BuildInfo
import models.responses.GenericErrorResponse
import org.slf4j.LoggerFactory
import play.api.libs.circe.Circe
import scalacache.memcached._
import scalacache.serialization.circe._
import scalacache.modes.scalaFuture._

import scala.concurrent.duration.Duration

@Singleton
class ProjectsController @Inject() (config:Configuration, cc:ControllerComponents)
                                   (implicit actorSystem: ActorSystem, mat:Materializer) extends AbstractController(cc) with Circe {
  private implicit val memcachedCache = MemcachedCache[BuildInfo](config.get[String]("memcached.location"))
  private val maybeCacheTTL = config.getOptional[Duration]("memcached.ttl")

  private val api = new GitlabAPI(config.get[String]("gitlab.api-token"))
  private val logger = LoggerFactory.getLogger(getClass)

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

  def knownProjects = Action.async {
    genericOutput(api.listProjects)
  }

  def jobsForProject(projectId:Long) = Action.async {
    genericOutput(api.jobsForProject(projectId))
  }

  def checkArtifacts(projectId:Long, branchName:String, jobName:String) = Action.async {
    api.artifactsZipForBranch(projectId, branchName, jobName)
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

  def getBuildInfo(projectId:Long, branchName:String, jobName:String) = Action.async {
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
    for {
      zipContent <- api.artifactsZipForBranch(projectId, branchName, jobName)
      zipReader <- Future(new ZipReader(zipContent.toArray))
      maybeBuildInfo <- Future.fromTry(zipReader.locateBuildInfo())
    } yield maybeBuildInfo

  }

}
