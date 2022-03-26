package services

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.{ContentType, ContentTypes, HttpEntity, HttpHeader, HttpMethod, HttpMethods, HttpRequest, HttpResponse, StatusCode, StatusCodes}
import akka.stream.Materializer
import akka.stream.scaladsl.{Keep, Sink}
import akka.util.ByteString
import io.circe.syntax._
import io.circe.generic.auto._
import models.gitlab.MergeRequestState.MergeRequestState
import models.gitlab.{Branch, GitlabProject, JobResponse, MergeRequest, PipelineResponse}
import org.slf4j.LoggerFactory

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import scala.concurrent.{ExecutionContext, Future}

class GitlabAPI (token:String) (implicit actorSystem: ActorSystem, materializer: Materializer) extends VCSAPI {
  private implicit val ec:ExecutionContext = actorSystem.dispatcher
  private val logger = LoggerFactory.getLogger(getClass)

  import HttpHelpers._

  protected def http = Http()

  /**
   * prepend the base URL to the request. The "partial" url _must_ begin with a /.
   * @param partial partial url to append
   * @return the full url string
   */
  def makeFullUrl(partial:String) = "https://gitlab.com/api/v4/projects" + partial

  /**
   * makes an HTTP request to the github API, setting the authorization and content types as appropriate
   * @param method Http method for the request
   * @param url request to send to
   * @param moreHeaders if any more headers are required, then put them into this map
   * @param bodyContent optional content to send. This object will be marshalled via Circe and sent as JSON, you must
   *                    ensure that appropriate codecs are in scope for Circe to perform this
   * @tparam O data type of the expected object response, content will be unmarshalled into this format.
   * @return if the request fails, then the Future fails with an HttpError(). If the request succeeds but the data read fails,
   *         then the future completes with a Left containing the circe decoding error.  If the request completes and the
   *         data reads and unmarshals, then the future completes with a Right containing the decoded object of type O.
   */
  protected def makeRequest[O:io.circe.Decoder](method:HttpMethod, url:String, moreHeaders:Map[String,String], bodyContent:Option[ByteString]) = {
    unmarshalContent[O](makeRequestRaw(method, url, moreHeaders, bodyContent))
  }

  protected def findLocationHeader(from:Seq[HttpHeader]):Option[String] =
    from.find(_.lowercaseName() == "location").map(_.value())

  protected def makeRequestRaw(method:HttpMethod, url:String, moreHeaders:Map[String,String], bodyContent:Option[ByteString]):Future[ByteString] = {
    logger.debug(s"${method} $url")
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
          if(response.status==StatusCodes.TemporaryRedirect ||
            response.status==StatusCodes.PermanentRedirect ||
            response.status==StatusCodes.Found) {
            findLocationHeader(response.headers) match {
              case Some(nextUrl)=>
                logger.debug(s"Following ${response.status} redirect to $nextUrl...")
                makeRequestRaw(method, nextUrl, moreHeaders, bodyContent)
              case None=>
                logger.error(s"Received ${response.status} with no Location header?? Got ${response.headers}")
                Future.failed(new RuntimeException("Received redirect with no location"))
            }
          } else if(response.status==StatusCodes.OK || response.status==StatusCodes.Created || response.status==StatusCodes.Accepted) {
            contentFut
          } else {
            contentFut.flatMap(bytes=>Future.failed(new HttpError(response.status, bytes.utf8String)))
          }
        })
    }

  private def encodeParam(from:String):String =
    URLEncoder.encode(from, StandardCharsets.UTF_8)

  def listProjects = {
    makeRequest[Seq[GitlabProject]](HttpMethods.GET, makeFullUrl("?owned=true"), Map(), None)
  }

  def jobsForProject(projectId:String) = {
    makeRequest[Seq[JobResponse]](HttpMethods.GET, makeFullUrl(s"/$projectId/jobs?scope=success"), Map(), None)
  }

  def artifactsZipForBranch(projectId:String, branchName:String, jobName:String) = {
    makeRequestRaw(HttpMethods.GET,
      makeFullUrl(s"/$projectId/jobs/artifacts/${encodeParam(branchName)}/download?job=${encodeParam(jobName)}"),
      Map(),
      None
    )
  }

  def branchesForProject(projectId:String) = {
    makeRequest[Seq[Branch]](HttpMethods.GET,
      makeFullUrl(s"/$projectId/repository/branches"),
      Map(),
      None)
  }

  def getOpenMergeRequests(projectId:String, forStatus:Option[MergeRequestState]) = {
    import models.gitlab.MergeRequestCodec._

    val baseUrl = s"/$projectId/merge_requests"
    val finalUrl = forStatus match {
      case Some(status)=>baseUrl + s"?state=${encodeParam(status.toString)}"
      case None=>baseUrl
    }

    makeRequest[Seq[MergeRequest]](HttpMethods.GET,
      makeFullUrl(finalUrl),
      Map(),
      None)
  }
}
