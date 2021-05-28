package services

import akka.http.scaladsl.model.StatusCode

class HttpError(statusCode:StatusCode, errorString: String) extends RuntimeException {
  override def toString: String = s"Server replied ${statusCode}: $errorString"

  override def getMessage: String = toString
}
