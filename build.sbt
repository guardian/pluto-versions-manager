import com.typesafe.sbt.packager.docker
import com.typesafe.sbt.packager.docker.DockerPermissionStrategy
import com.typesafe.sbt.packager.docker._

name := "pluto_versions_manager"
 
version := "1.0"


lazy val `pluto_versions_manager` = (project in file("."))
  .enablePlugins(PlayScala, plugins.JUnitXmlReportPlugin)
  .enablePlugins(AshScriptPlugin) //needed for alpine-based images
  .settings(
    version := sys.props.getOrElse("build.number","DEV"),
    dockerExposedPorts := Seq(9000),
    dockerUsername  := sys.props.get("docker.username"),
    dockerRepository := Some("guardianmultimedia"),
    Docker / mappings ++= Seq(
      (baseDirectory.value / "/dockerfile-customisation/sysctl-local.conf") -> "dockerfile-customisation/sysctl-local.conf"
    ),
    Docker / packageName := "guardianmultimedia/pluto-versions-manager",
    Docker / dockerCommands ++= Seq(
      Cmd("USER", "root"),
      Cmd("COPY", "dockerfile-customisation/sysctl-local.conf", "/etc/sysctl.d/local.conf"),
      Cmd("USER", "demiourgos728")
    ),
    packageName := "pluto-versions-manager",
    dockerBaseImage := "amazoncorretto:11-alpine",
    dockerPermissionStrategy := DockerPermissionStrategy.CopyChown,
    dockerAlias := docker.DockerAlias(None,Some("guardianmultimedia"),"pluto-versions-manager",Some(sys.props.getOrElse("build.number","DEV"))),
    scalacOptions ++= Seq("-deprecation", "-feature"),
  )

resolvers += "Akka Snapshot Repository" at "https://repo.akka.io/snapshots/"
      
scalaVersion := "2.13.5"

libraryDependencies ++= Seq( specs2 % Test , guice )

val circeVersion = "0.14.0"

libraryDependencies ++= Seq(
  "io.circe" %% "circe-core",
  "io.circe" %% "circe-generic",
  "io.circe" %% "circe-parser"
).map(_ % circeVersion)

libraryDependencies += "io.circe" %% "circe-yaml" % "0.14.0"

libraryDependencies += "com.dripower" %% "play-circe" % "2814.2"

libraryDependencies += "io.skuber" %% "skuber" % "2.6.2"

libraryDependencies += "com.typesafe.akka" %% "akka-http" % "10.1.14"

libraryDependencies += "ch.qos.logback" % "logback-classic" % "1.2.7"

//authentication
libraryDependencies ++= Seq(
  "com.nimbusds" % "nimbus-jose-jwt" % "9.15.2",
)

//testing
Test / testOptions ++= Seq( Tests.Argument("junitxml", "junit.outdir", sys.env.getOrElse("SBT_JUNIT_OUTPUT","/tmp")), Tests.Argument("console") )
libraryDependencies ++= Seq(
  "com.novocode" % "junit-interface" % "0.11" % Test,
  "org.specs2" %% "specs2-junit" % "4.12.12" % Test
)

val scalacacheVersion = "0.28.0"
libraryDependencies ++= Seq (
  "com.github.cb372" %% "scalacache-memcached",
  "com.github.cb372" %% "scalacache-core",
  "com.github.cb372" %% "scalacache-circe",
).map(_ % scalacacheVersion)