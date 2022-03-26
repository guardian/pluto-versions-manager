package models.github

case class GitHubActor(login:String, id:Int, node_id:String, avatar_url:Option[String], gravatar_id:Option[String], email:Option[String], url:String, html_url:String, `type`:String, site_admin:Boolean)

