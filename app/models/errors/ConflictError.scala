package models.errors

import models.DockerImage
import skuber.apps.v1.Deployment

case class ConflictError(deployed:Seq[String], expected:String) extends LightweightError {
  override def getMessage: String = s"Expected $expected but got $deployed of which no items match"
  override def toString: String = s"Conflict: $getMessage"
}

object ConflictError {
  def fromDeployment(deployment:Deployment, to:DockerImage):ConflictError = {
    val deployedImageList = deployment.spec.flatMap(_.template.spec).map(_.containers).map(_.map(_.image))
    new ConflictError(deployedImageList.getOrElse(Seq()), to.imageName)
  }
}