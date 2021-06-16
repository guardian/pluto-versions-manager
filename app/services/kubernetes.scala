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

  private def extractContainers(deployment:Deployment) =
    for {
      spec <- deployment.spec
      templateSpec <- spec.template.spec
    } yield (templateSpec.containers, templateSpec.initContainers)

  private def updateContainersList(source:List[Container], to:DockerImage) =
    source.map(c=>{
      if(c.image.startsWith(to.imageName)) {
        c.copy(image = to.toString)
      } else {
        c
      }
    })

  def performUpdate(deployment:Deployment, to:DockerImage):Future[Either[LightweightError, Deployment]] =
    extractContainers(deployment) match {
      case Some((containers, initContainers))=>
        val updatedContainers = updateContainersList(containers, to)
        val updatedInitContainers = updateContainersList(initContainers, to)

        if(updatedContainers==containers) {
          logger.error(s"Can't update ${deployment.metadata.name} to $to: no matching containers to update")
          Future(Left(ConflictError.fromDeployment(deployment, to)))
        }
        //if there were no updates to be made to init containers, then `updatedInitContainers`==`initContainers` so there is no change here.
        val updatedTemplateSpec = deployment.spec.flatMap(_.template.spec).map(_.copy(containers=updatedContainers, initContainers=updatedInitContainers))
        val updatedTemplate = deployment.spec.map(_.template).map(_.copy(spec=updatedTemplateSpec))
        val updatedDeloymentSpec = deployment.spec.map(_.copy(template = updatedTemplate.get))
        val updatedDeployment = deployment.copy(spec=updatedDeloymentSpec)
        logger.debug(s"Updated deployment is $updatedDeployment")
        (k8s update[Deployment] updatedDeployment).map(Right.apply)
      case None=>
        Future(Left(GenericError("Deployment is misconfigured, there was nothing to update")))
    }

  def updateDeployedSoftware(to:DockerImage, deploymentName:String) = {
    for {
      deployment <- k8s getInNamespace[Deployment](deploymentName, namespace)
      result <- performUpdate(deployment, to)
    } yield result
  }
}
