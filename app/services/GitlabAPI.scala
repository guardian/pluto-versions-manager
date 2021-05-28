package services

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.{ContentType, ContentTypes, HttpEntity, HttpHeader, HttpMethod, HttpMethods, HttpRequest, HttpResponse, StatusCode, StatusCodes}
import akka.stream.Materializer
import akka.stream.scaladsl.{Keep, Sink}
import akka.util.ByteString
import io.circe.syntax._
import io.circe.generic.auto._
import models.gitlab.GitlabProject
import org.slf4j.LoggerFactory

import scala.concurrent.{ExecutionContext, Future}

class GitlabAPI (token:String) (implicit actorSystem: ActorSystem, materializer: Materializer){
  private implicit val ec:ExecutionContext = actorSystem.dispatcher
  private val logger = LoggerFactory.getLogger(getClass)
  protected def http = Http()

  /**
   * prepend the base URL to the request. The "partial" url _must_ begin with a /.
   * @param partial partial url to append
   * @return the full url string
   */
  def makeFullUrl(partial:String) = "https://gitlab.com/api/v4/projects" + partial

  /**
   * read in the server response and marshal it from raw JSON
   * @param response Akka http response
   * @return
   */
  protected def consumeResponseContent(response:HttpResponse) =
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
  protected def unmarshalContent[O:io.circe.Decoder](from:Future[ByteString]) =
        from.map(bytes=>{
          val stringContent = bytes.utf8String
          logger.debug(s"Server response was $stringContent")
          io.circe.parser.parse(bytes.utf8String).flatMap(_.as[O])
        })

  /**
   * makes an HTTP request to the github API, setting the authorization and content types as appropriate
   * @param method Http method for the request
   * @param url request to send to
   * @param moreHeaders if any more headers are required, then put them into this map
   * @param bodyContent optional content to send. This object will be marshalled via Circe and sent as JSON, you must
   *                    ensure that appropriate codecs are in scope for Circe to perform this
   * @tparam I data type of the body content, if used (this should be derived implicitly by the compiler)
   * @tparam O data type of the expected object response, content will be unmarshalled into this format.
   * @return if the request fails, then the Future fails with an HttpError(). If the request succeeds but the data read fails,
   *         then the future completes with a Left containing the circe decoding error.  If the request completes and the
   *         data reads and unmarshals, then the future completes with a Right containing the decoded object of type O.
   */
  protected def makeRequest[O:io.circe.Decoder](method:HttpMethod, url:String, moreHeaders:Map[String,String], bodyContent:Option[ByteString]) = {
    val entity = bodyContent match {
      case None=>
        HttpEntity.Empty
      case Some(content)=>
        HttpEntity(content).withContentType(ContentTypes.`application/json`)
    }

    val baseHeaders = Map(
      "PRIVATE-TOKEN"->token,
      "Accept"->"application/json"
    )

    val headers = (baseHeaders++moreHeaders)
      .map(kv=>HttpHeader.parse(kv._1, kv._2))
      .collect({case HttpHeader.ParsingResult.Ok(hdr,_)=>hdr})
      .toSeq

    val req = HttpRequest(method, url, headers, entity)
    http
      .singleRequest(req)
      .flatMap(response=>{
        val contentFut = consumeResponseContent(response)
        if(response.status==StatusCodes.OK || response.status==StatusCodes.Created || response.status==StatusCodes.Accepted) {
          unmarshalContent[O](contentFut)
        } else {
          contentFut.flatMap(bytes=>Future.failed(new HttpError(response.status, bytes.utf8String)))
        }
      })
  }

  def listProjects = {
    makeRequest[Seq[GitlabProject]](HttpMethods.GET, makeFullUrl("?owned=true"), Map(), None)
  }
}
