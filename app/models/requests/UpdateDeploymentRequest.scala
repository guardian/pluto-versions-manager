package models.requests

import models.DockerImage

case class UpdateDeploymentRequest(to:DockerImage, deploymentName:String)
