package models.gitlab

import java.time.ZonedDateTime

case class PipelineResponse(id: Int, project_id:Long, status:String, ref:String, sha:String, web_url:String, created_at:ZonedDateTime, updated_at:ZonedDateTime)
