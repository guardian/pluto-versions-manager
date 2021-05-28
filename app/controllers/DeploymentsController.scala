package controllers

import models.DeployedImageInfo
import play.api.libs.circe.Circe
import play.api.mvc.{AbstractController, ControllerComponents}
import utils.kubernetes

import javax.inject.{Inject, Singleton}
import scala.concurrent.ExecutionContext.Implicits.global
import io.circe.syntax._
import io.circe.generic.auto._
import models.responses.GenericErrorResponse
import org.slf4j.LoggerFactory

@Singleton
class DeploymentsController @Inject() (kubernetes:kubernetes, cc:ControllerComponents) extends AbstractController(cc) with Circe {
  private val logger = LoggerFactory.getLogger(getClass)
  def listDeployments = Action.async {
    kubernetes
      .listDeployments()
      .map(_.map(DeployedImageInfo.fromDeployment))
      .map(results=>Ok(results.asJson))
      .recover({
        case err:Throwable=>
          logger.error(s"Could not get deployments: ${err.getMessage}", err)
          InternalServerError(GenericErrorResponse("error", err.toString).asJson)
      })
  }
}
