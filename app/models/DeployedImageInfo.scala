package models

import skuber.apps.v1.Deployment

case class DeployedImageInfo(
                            deploymentName:String,
                            namespace:String,
                            deployedImages:Seq[DockerImage],
                            observedGeneration:Option[Int],
                            readyReplicas:Option[Int],
                            totalReplicas:Option[Int],
                            notReadyReplicas:Option[Int],
                            labels:Map[String, String]
                            )

object DeployedImageInfo {
  def fromDeployment(deployment:Deployment) = {
    val maybeContainerList = for {
      deplSpec <- deployment.spec
      templSpec <- deplSpec.template.spec
    } yield templSpec.containers

    val imagesList = maybeContainerList
      .getOrElse(List())
      .map(_.image)
      .map(DockerImage.parseName)
      .collect({case Some(img)=>img})

    DeployedImageInfo(
      deployment.metadata.name,
      deployment.metadata.namespace,
      imagesList,
      deployment.status.map(_.observedGeneration),
      deployment.status.map(_.readyReplicas),
      deployment.status.map(_.replicas),
      deployment.status.map(_.unavailableReplicas),
      deployment.metadata.labels
    )
  }
}