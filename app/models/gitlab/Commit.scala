package models.gitlab

import java.time.ZonedDateTime

case class Commit(
                 author_email: String,
                 author_name: Option[String],
                 authored_date: Option[ZonedDateTime],
                 committed_date: Option[ZonedDateTime],
                 committer_email: Option[String],
                 committer_name: Option[String],
                 id: String,
                 short_id: String,
                 title: Option[String],
                 message: Option[String],
                 parent_ids: Option[Seq[String]]
                 )
