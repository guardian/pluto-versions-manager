package models.gitlab

import java.time.ZonedDateTime

/*
https://docs.gitlab.com/ee/api/jobs.html
 */
case class ArtifactsFile(filename:String, size:Long)
case class ArtifactEntry(file_type:String,
                         size:Long,
                         filename:String,
                         file_format:Option[String])
case class PipelineRef(id:Long, project_id:Long, ref:String, sha:String, status:String)
case class UserRef(id:Long,
                   name:String,
                   username:String,
                   state:String,
                   avatar_url:Option[String],
                   web_url:Option[String],
                   created_at:ZonedDateTime,
                   public_email:Option[String],
                   organization:Option[String]
                  )

case class JobResponse(id:Long,
                       name:String,
                      created_at:ZonedDateTime,
                      started_at:ZonedDateTime,
                      finished_at:ZonedDateTime,
                      duration:Float,
                      queued_duration:Float,
                      artifacts_file:Option[ArtifactsFile],
                      artifacts: Option[Seq[ArtifactEntry]],
                      artifacts_expire_at:Option[ZonedDateTime],
                      tag_list: Option[Seq[String]],
                       pipeline: Option[PipelineRef],
                       ref:String,
                       stage:String,
                       status:String,
                       web_url:String,
                       user:Option[UserRef]
                      )
