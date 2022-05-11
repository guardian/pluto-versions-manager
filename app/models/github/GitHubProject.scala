package models.github

import models.gitlab.GitlabProject

import java.time.ZonedDateTime

case class GitHubProject(id:Int, node_id:String, name:String, size_in_bytes:Long, url:String, archive_download_url:String, expired:Boolean, created_at:ZonedDateTime, expires_at:Option[ZonedDateTime], updated_at:Option[ZonedDateTime]) {
  def mapToGitlab:GitlabProject = {
    GitlabProject(
      id.toLong,
      name = name,
      name_with_namespace = name,
      http_url_to_repo = url,
      web_url = url, readme_url = None, avatar_url = None
    )
  }
}

case class GitHubProjectResponse(total_count:Int, artifacts:Seq[GitHubProject])