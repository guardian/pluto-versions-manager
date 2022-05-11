package models.gitlab

import io.circe.{Decoder, Encoder}

import java.time.ZonedDateTime
import scala.annotation.switch

case object MergeRequestState extends Enumeration {
  type MergeRequestState = Value
  val opened, closed, locked, merged = Value

  //maps the Github status values to the merge request values
  def fromGithub(status:String) = (status: @switch) match {
    case "open"=>opened
    case "closed"=>closed
    case _=>
      //this is kinda placeholder; should break in a nice obvious way if we need to add anything
      throw new NoSuchElementException(s"Did not recognise github status $status")
  }
}

object MergeRequestCodec {
  implicit val mrStateEncoder:Encoder[MergeRequestState.Value] = Encoder.encodeEnumeration(MergeRequestState)
  implicit val mrStateDecoder:Decoder[MergeRequestState.Value] = Decoder.decodeEnumeration(MergeRequestState)
}

case class MergeRequest(
                       id:Long,
                       iid: Long,
                       project_id: Long,
                       title:String,
                       description:Option[String],
                       state:MergeRequestState.Value,  //should be an enum
                       created_at: ZonedDateTime,
                       updated_at: ZonedDateTime,
                       merged_by: Option[String],
                       merged_at: Option[ZonedDateTime],
                       closed_by: Option[String],
                       closed_at: Option[ZonedDateTime],
                       target_branch: String,
                       source_branch: String,
                       user_notes_count: Int,
                       upvotes: Int,
                       downvotes: Int,
                       author: Option[Author],
                       sha: String,
                       web_url: Option[String]
                       )
