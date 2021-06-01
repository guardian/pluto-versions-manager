package models.errors

import io.circe.{Encoder, Json}
import io.circe.generic.auto._
import io.circe.syntax._

trait LightweightError {
  def getMessage:String
}

object LightweightErrorEncoder {
  implicit def encode:Encoder[LightweightError] = new Encoder[LightweightError] {
    override def apply(a: LightweightError): Json = a match {
      case msg@GenericError(_)=>msg.asJson
      case msg@ConflictError(_,_)=>msg.asJson
    }
  }
}