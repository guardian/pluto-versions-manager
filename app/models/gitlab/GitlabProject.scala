package models.gitlab

case class GitlabProject(id:Long, name:String, name_with_namespace:String, http_url_to_repo:String, web_url:String, readme_url:Option[String], avatar_url:Option[String])