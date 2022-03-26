package models.github

import java.time.ZonedDateTime

case class GitHubArtifact(id:Long, node_id:String, name:String, size_in_bytes:Long, url:String, archive_download_url:String, expired:Boolean, created_at:ZonedDateTime, updated_at:ZonedDateTime, expires_at:ZonedDateTime)

case class GitHubArtifactsResponse(total_count:Int, artifacts:Seq[GitHubArtifact])