package controllers

import models.DeployedImageInfo
import play.api.libs.circe.Circe
import play.api.mvc.{AbstractController, ControllerComponents}

import javax.inject.{Inject, Singleton}
import scala.concurrent.ExecutionContext.Implicits.global
import io.circe.syntax._
import io.circe.generic.auto._
import models.errors.ConflictError
import models.requests.UpdateDeploymentRequest
import models.responses.GenericErrorResponse
import org.slf4j.LoggerFactory
import services.kubernetes

@Singleton
class DeploymentsController @Inject() (kubernetes:kubernetes, cc:ControllerComponents) extends AbstractController(cc) with Circe {
  private val logger = LoggerFactory.getLogger(getClass)
  import models.errors.LightweightErrorEncoder._

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

  def updateDeployment = Action.async(circe.json[UpdateDeploymentRequest]) { req=>
    kubernetes
      .updateDeployedSoftware(req.body.to, req.body.deploymentName)
      .map({
        case err@Left(ConflictError(deployed, expected))=>
          Conflict(err.value.asJson)
        case err@Left(_)=>
          BadRequest(err.value.asJson)
        case Right(_)=>
          Ok(GenericErrorResponse("ok", "deployment update request made").asJson)
      })
  }
}
