package models

import io.circe.Decoder.Result
import io.circe.{Decoder, HCursor}

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

case class BuildInfo(
                    ci_commit_branch:Option[String],
                    ci_commit_ref_name:Option[String],
                    ci_commit_sha: String,
                    ci_commit_timestamp: ZonedDateTime,
                    ci_commit_title: Option[String],
                    ci_job_url: String,
                    //ca_project_name: String,
                    ci_merge_request_project_url: Option[String],
                    ci_merge_request_title: Option[String],
                    ci_pipeline_iid: Int,
                    built_image:Option[String]
                    )

//object BuildInfoDecoder {
//  implicit val zdtDecoder:Decoder[ZonedDateTime] = Decoder
//    .decodeZonedDateTimeWithFormatter(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX"))
//}