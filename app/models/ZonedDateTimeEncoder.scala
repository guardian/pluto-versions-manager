package models

import io.circe.{Decoder, Encoder}

import java.time.ZonedDateTime

object ZonedDateTimeEncoder {
  implicit val zdtEncoder:Encoder[ZonedDateTime] = Encoder.encodeZonedDateTime
  implicit val zdtDecoder:Decoder[ZonedDateTime] = Decoder.decodeZonedDateTime
}
