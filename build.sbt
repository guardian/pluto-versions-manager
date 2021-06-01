import com.typesafe.sbt.packager.docker
import com.typesafe.sbt.packager.docker.DockerPermissionStrategy

name := "pluto_versions_manager"
 
version := "1.0" 
      
lazy val `pluto_versions_manager` = (project in file("."))
  .enablePlugins(PlayScala)
  .enablePlugins(AshScriptPlugin) //needed for alpine-based images
  .settings(
    version := sys.props.getOrElse("build.number","DEV"),
    dockerExposedPorts := Seq(9000),
    dockerUsername  := sys.props.get("docker.username"),
    dockerRepository := Some("guardianmultimedia"),
    packageName in Docker := "guardianmultimedia/pluto-versions-manager",
    packageName := "pluto-versions-manager",
    dockerBaseImage := "docker.io/openjdk:11.0.10-jre",
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

libraryDependencies += "io.circe" %% "circe-yaml" % "0.12.0"

libraryDependencies += "com.dripower" %% "play-circe" % "2812.0"

libraryDependencies += "io.skuber" %% "skuber" % "2.6.0"

libraryDependencies += "com.typesafe.akka" %% "akka-http" % "10.1.14"

val scalacacheVersion = "0.28.0"
libraryDependencies ++= Seq (
  "com.github.cb372" %% "scalacache-memcached",
  "com.github.cb372" %% "scalacache-core",
  "com.github.cb372" %% "scalacache-circe",
).map(_ % scalacacheVersion)