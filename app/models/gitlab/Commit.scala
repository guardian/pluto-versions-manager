package models.gitlab

import java.time.ZonedDateTime

/*
      "author_email": "john@example.com",
      "author_name": "John Smith",
      "authored_date": "2012-06-27T05:51:39-07:00",
      "committed_date": "2012-06-28T03:44:20-07:00",
      "committer_email": "john@example.com",
      "committer_name": "John Smith",
      "id": "7b5c3cc8be40ee161ae89a06bba6229da1032a0c",
      "short_id": "7b5c3cc",
      "title": "add projects API",
      "message": "add projects API",
      "parent_ids": [
        "4ad91d3c1144c406e50c7b33bae684bd6837faf8"
      ]
 */
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
                 parent_ids: Seq[String]
                 )
