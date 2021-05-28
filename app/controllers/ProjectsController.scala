package controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import play.api.Configuration
import play.api.mvc.{AbstractController, ControllerComponents}
import services.GitlabAPI

import javax.inject.{Inject, Singleton}
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global
import io.circe.syntax._
import io.circe.generic.auto._
import models.responses.GenericErrorResponse
import org.slf4j.LoggerFactory
import play.api.libs.circe.Circe

@Singleton
class ProjectsController @Inject() (config:Configuration, cc:ControllerComponents)
                                   (implicit actorSystem: ActorSystem, mat:Materializer) extends AbstractController(cc) with Circe {
  private val api = new GitlabAPI(config.get[String]("gitlab.api-token"))
  private val logger = LoggerFactory.getLogger(getClass)

  def knownProjects = Action.async {
    api.listProjects.map({
      case Left(decodingError)=>
        logger.error(s"Could not decode response from server: $decodingError")
        InternalServerError(GenericErrorResponse("remote_error", decodingError.toString).asJson)
      case Right(projectList)=>
        Ok(projectList.asJson)
    })
      .recover({
        case err:Throwable=>
          logger.error(s"list known projects failed: ${err.getMessage}", err)
          InternalServerError(GenericErrorResponse("error", err.getMessage).asJson)
      })
  }

}
