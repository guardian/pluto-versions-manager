package models

import io.circe.Decoder.Result
import io.circe.{Decoder, DecodingFailure, HCursor}

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

case class BuildInfo(
                    ci_commit_branch:Option[String],
                    ci_commit_ref_name:Option[String],
                    ci_commit_sha: String,
                    ci_commit_timestamp: ZonedDateTime,
                    ci_commit_title: Option[String],
                    ci_job_url: String,
                    ci_project_name: String,
                    ci_merge_request_project_url: Option[String],
                    ci_merge_request_title: Option[String],
                    built_image:Option[DockerImage]
                    ) {
  def fixedUpAwsImage(awsAccount:String, awsRegion:String):BuildInfo = {
    built_image match {
      case None=>this
      case Some(img)=>copy(built_image=Some(img.fixedUpAwsImage(awsAccount, awsRegion)))
    }
  }
}

object DockerImageDecoder {
  implicit val dockerImageDecoder:Decoder[DockerImage] = new Decoder[DockerImage] {
    override def apply(c: HCursor): Result[DockerImage] = {
      c.as[String].flatMap(stringVal=> {
        DockerImage.parseName(stringVal) match {
          case None => Left(DecodingFailure("Could not parse Docker image name", c.history))
          case Some(dockerImage)=> Right(dockerImage)
        }
      })
    }
  }
}