package models

import scala.util.Try
import scala.util.matching.Regex

case class DockerImage (imageName:String, version:String) {
  def isEqualOrLater(than:DockerImage):Option[Boolean] = {
    (version.toLongOption, than.version.toLongOption) match {
      case (Some(myVersion), Some(otherVersion))=>
        Some(myVersion>=otherVersion)
      case _=>
        None
    }
  }

  override def toString = s"$imageName:$version"

  def fixedUpAwsImage(awsAccount:String, awsRegion:String):DockerImage = {
    copy(imageName=imageName.replaceAll("AWS_ACCOUNT_ID", awsAccount).replaceAll("AWS_REGION", awsRegion))
  }
}

object DockerImage {
  private val xtractor = "^([^:]*):([^:]+)".r

  def parseName(rawName:String) = {
    rawName match {
      case xtractor(image, version)=>Some(new DockerImage(image, version))
      case _=>None
    }
  }
}