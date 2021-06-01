package controllers

import auth.{BearerTokenAuth, Security}
import org.slf4j.LoggerFactory
import play.api.Configuration
import play.api.mvc.{AbstractController, ControllerComponents}

import java.util.Properties
import javax.inject.{Inject, Singleton}

@Singleton
class IndexController @Inject() (cc:ControllerComponents,
                                override val bearerTokenAuth:BearerTokenAuth,
                                override val config:Configuration) extends AbstractController(cc) with Security {
  override protected val logger = LoggerFactory.getLogger(getClass)

  /**
   * Action to provide base html and frontend code to the client
   * @param path http path postfix, not used but must be included to allow an indefinite path in routes
   * @return Action containing html
   */
  def index(path:String) = Action {
    val cbVersionString = try {
      val prop = new Properties()
      prop.load(getClass.getClassLoader.getResourceAsStream("version.properties"))
      Option(prop.getProperty("build-sha"))
    } catch {
      case e:Throwable=>
        logger.warn("Could not get build-sha property: ", e)
        None
    }
    Ok(views.html.index(cbVersionString.getOrElse("none"), config.getOptional[String]("deployment-root").getOrElse("")))
  }
}
