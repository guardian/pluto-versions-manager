package utils

import akka.actor.ActorSystem
import akka.stream.Materializer
import models.DeployedImageInfo
import play.api.Configuration
import skuber._
import skuber.apps.v1.{Deployment, DeploymentList}
import skuber.json.format._

import java.io.File
import javax.inject.{Inject, Singleton}
import scala.concurrent.ExecutionContext
import scala.io.Source

@Singleton
class kubernetes @Inject() (config:Configuration) (implicit system:ActorSystem, mat:Materializer) {
  implicit val ec:ExecutionContext = system.dispatcher
  val k8s = k8sInit

  val x = getInClusterNamespace
    .getOrElse(config.getOptional[String]("kubernetes.default-namespace"))

  /**
   * if we can't pick up the in-cluster namespace, fall back to a pre-configured one
   */
  val namespace:String = (getInClusterNamespace, config.getOptional[String]("kubernetes.default-namespace")) match {
    case (Some(clusterNS),_) => clusterNS
    case (_, Some(configuredNS))=>configuredNS
    case _=>
      throw new RuntimeException("Namespace is not configured properly, either run from inside a kubernetes cluster or set the 'default-namespace' configuration item under 'kubernetes'.")
  }

  def getInClusterNamespace = {
    val internalFile = new File("/var/run/secrets/kubernetes.io/serviceaccount/namespace")

    if(internalFile.exists()) {
      val dataSource = Source.fromFile(internalFile, "UTF-8")
      val content = dataSource.getLines().reduce(_ + _)
      dataSource.close()
      Some(content)
    } else {
      None
    }
  }

  def getDeploymentInfo(deploymentName:String) = {
    (k8s getInNamespace[Deployment](deploymentName, namespace)).map(DeployedImageInfo.fromDeployment)
  }

  def getDeploymentMetadata(deploymentName:String) = {
    k8s getInNamespace[Deployment](deploymentName, namespace)
  }

  def listDeployments() = {
    (k8s listInNamespace[DeploymentList] namespace)
      .map(listContent=>listContent.items)
  }
}
