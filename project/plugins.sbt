logLevel := Level.Warn

resolvers += "Typesafe repository" at "https://repo.typesafe.com/typesafe/releases/"

addSbtPlugin("com.typesafe.play" % "sbt-plugin" % "2.8.9")

// sbt native packager

addSbtPlugin("com.github.sbt" % "sbt-native-packager" % "1.9.9")

// for snyk
addSbtPlugin("net.virtual-void" % "sbt-dependency-graph" % "0.10.0-RC1")
