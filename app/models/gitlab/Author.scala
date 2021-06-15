package models.gitlab

case class Author(
                 id: Long,
                 name: Option[String],
                 username: String,
                 state: String,
                 avatar_url: Option[String],
                 web_url: Option[String]
                 )
