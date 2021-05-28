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