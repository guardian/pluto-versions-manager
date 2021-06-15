package services

import akka.actor.ActorSystem
import akka.stream.Materializer
import models.errors.{ConflictError, GenericError, LightweightError}
import models.{DeployedImageInfo, DockerImage}
import org.slf4j.LoggerFactory
import play.api.Configuration
import skuber._
import skuber.apps.v1.{Deployment, DeploymentList}

import java.io.File
import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}
import scala.io.Source

@Singleton
class kubernetes @Inject() (config:Configuration) (implicit system:ActorSystem, mat:Materializer) {
  implicit val ec:ExecutionContext = system.dispatcher
  private val logger = LoggerFactory.getLogger(getClass)
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

  def performUpdate(deployment:Deployment, to:DockerImage):Future[Either[LightweightError, Deployment]] = {
    val maybeNewContainersList = deployment
      .spec
      .flatMap(_.template.spec)
      .map(spec=>{
        spec.containers.map(c=>{
          if(c.image.startsWith(to.imageName)) {
            c.copy(image = to.toString)
          } else {
            c
          }
        })
    })

    val maybeNewInitContainersList = deployment
      .spec
      .flatMap(_.template.spec)
      .map(spec=>{
        spec.initContainers.map(c=>{
          if(c.image.startsWith(to.imageName)) {
            c.copy(image = to.toString)
          } else {
            c
          }
        })
      })

    if(maybeNewContainersList==deployment.spec.flatMap(_.template.spec).map(_.containers)) {
      logger.error(s"Can't update ${deployment.metadata.name} to $to: no matching containers to update")
      Future(Left(ConflictError.fromDeployment(deployment, to)))
    } else {
      if(maybeNewContainersList.isDefined) {
        val firstUpdateTemplateSpec = deployment.spec.flatMap(_.template.spec).map(_.copy(containers=maybeNewContainersList.get))
        val updatedTemplateSpec = maybeNewInitContainersList match {  //also update any 'init' containers in the spec
          case Some(newInitContainers)=>firstUpdateTemplateSpec.map(_.copy(initContainers = newInitContainers))
          case None=>firstUpdateTemplateSpec
        }
        val updatedTemplate = deployment.spec.map(_.template).map(_.copy(spec=updatedTemplateSpec))
        val updatedDeloymentSpec = deployment.spec.map(_.copy(template = updatedTemplate.get))
        val updatedDeployment = deployment.copy(spec=updatedDeloymentSpec)
        logger.debug(s"Updated deployment is $updatedDeployment")
        (k8s update[Deployment] updatedDeployment).map(Right.apply)
      } else {
        Future(Left(GenericError("Deployment is misconfigured, there was nothing to update")))
      }
    }
  }

  def updateDeployedSoftware(to:DockerImage, deploymentName:String) = {
    for {
      deployment <- k8s getInNamespace[Deployment](deploymentName, namespace)
      result <- performUpdate(deployment, to)
    } yield result
  }
}
