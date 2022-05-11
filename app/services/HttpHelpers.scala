package services

import akka.http.scaladsl.model.HttpResponse
import akka.stream.Materializer
import akka.stream.scaladsl.{Keep, Sink}
import akka.util.ByteString
import org.slf4j.LoggerFactory

import scala.concurrent.{ExecutionContext, Future}

object HttpHelpers {
  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * read in the server response and marshal it from raw JSON
   * @param response Akka http response
   * @return
   */
  def consumeResponseContent(response:HttpResponse)(implicit mat:Materializer, ec:ExecutionContext) =
    response
      .entity
      .dataBytes
      .toMat(Sink.reduce[ByteString]((acc, elem)=>acc.concat(elem)))(Keep.right)
      .run()


  /**
   * unmarshals content from `consumeResponseContent` to an object of the type given by O.
   * takes in a Future to make composition easier.
   * @param from a Future containing a ByteString of json content, from `consumeResponseContent`
   * @tparam O the data type to marshal out to
   * @return either a Right with the object or a Left containing a decoding error.
   */
  def unmarshalContent[O:io.circe.Decoder](from:Future[ByteString])(implicit ec:ExecutionContext) =
    from.map(bytes=>{
      val stringContent = bytes.utf8String
      logger.debug(s"Server response was $stringContent")
      io.circe.parser.parse(bytes.utf8String).flatMap(_.as[O])
    })
}
