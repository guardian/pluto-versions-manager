package services

import akka.util.ByteString
import io.circe.generic.auto._
import io.circe.yaml.parser
import models.BuildInfo
import org.slf4j.LoggerFactory

import java.io.ByteArrayInputStream
import java.util.zip.{ZipEntry, ZipInputStream}
import scala.util.{Failure, Success, Try}

class ZipReader(bytes:Array[Byte]) {
  private val logger = LoggerFactory.getLogger(getClass)

  /**
   * calls the given callback function with an open ZipStream of the content.
   * ensures that the streams are closed properly when the callback completes, whether successfully or not
   * @param func function to call, this must accept a ZipInputStream and return a Try
   * @tparam A data that is contained in the function's Try
   * @return the result of the function, or a Failure if the initial stream could not be set up.
   */
  private def withStreams[A](func:(ZipInputStream)=>Try[A]) = {
    Try {
      val byteStream = new ByteArrayInputStream(bytes)
      val zipStream = new ZipInputStream(byteStream)
      (byteStream, zipStream)
    } match {
      case Success((byteStream, zipStream))=>
        val finalResult = func(zipStream)
        (Try { zipStream.close() }, Try { byteStream.close() }) match {
          case (Failure(zipErr), _)=>
            logger.error(s"Could not close zip stream: ${zipErr.getMessage}", zipErr)
            finalResult
          case (_, Failure(byteErr))=>
            logger.error(s"Could not close byte stream: ${byteErr.getMessage}", byteErr)
            finalResult
          case (Success(_), Success(_))=>
            finalResult
        }
      case Failure(err)=>
        Failure(err)
    }
  }

  /**
   * gets a list of the entries for the zipfile
   * @return
   */
  def getEntries() = withStreams { zipStream =>
    Try {
      /**
       * recursively traverses the zip directory in-memory
       * @param accumulator
       * @return
       */
      def traverseEntries(accumulator: Seq[ZipEntry]): Seq[ZipEntry] = Option(zipStream.getNextEntry) match {
        case Some(entry) =>
          traverseEntries(accumulator :+ entry)
        case None => accumulator
      }

      traverseEntries(Seq())
    }
  }

  def readContent(from:ZipInputStream) = Try { from.readAllBytes() }

  /**
   * tries to locate the build-info.yaml file in the given bundle.
   * If found, returns a ByteString with the raw uncompressed data
   */
  def locateBuildInfoContent():Try[Option[ByteString]] = withStreams(zipStream => {
    import cats.implicits._

    def traverseEntries():Option[Try[ByteString]] = Option(zipStream.getNextEntry) match {
      case Some(entry) =>
        if (entry.getName.endsWith("build-info.yaml")) {
          logger.debug(s"found build-info.yaml at ${entry.getName}, streaming the content")
          val content = readContent(zipStream).map(ByteString.apply)
          zipStream.closeEntry()
          Some(content)
        } else {
          zipStream.closeEntry()
          traverseEntries()
        }
      case None=>
        logger.debug("reached end of zip file, no build-info found")
        None
    }

    //use cats to turn the Option[Try[ByteString]] into a Try[Option[ByteString]]
    traverseEntries().sequence
  })

  /**
   * calls locateBuildInfoContent and marshals the resulting bytestream info a BuildInfo object
   * @return
   */
  def locateBuildInfo() = locateBuildInfoContent().map(_.map(bytes=>{
    parser
      .parse(bytes.utf8String)
      .flatMap(_.as[BuildInfo]) match {
      case err@Left(parseErr)=>
        logger.error(s"Parsing error: $parseErr. Incoming data was: ${bytes.utf8String}")
        err
      case result@Right(_)=>result
    }
  }))

}

object ZipReader {
  def fromByteString(rawData:ByteString) = {
    new ZipReader(rawData.toArray)
  }
}
