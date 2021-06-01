package models.errors

case class GenericError(msg:String) extends LightweightError {
  override def getMessage: String = msg
}
