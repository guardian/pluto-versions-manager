package models.github

import models.gitlab.{Branch, Commit}

case class GitHubCommit(sha:String, ref:Option[String], url:Option[String], label:Option[String], user:Option[GitHubActor] ) {
  //hmm this is not a great mapping
  def mapToGitlab:Commit = {
    Commit(user.flatMap(_.email).getOrElse(""),
      user.map(_.login),
      None,
      None,
      None,
      None,
      sha,
      ref.getOrElse(""),
      label,
      None,None)
  }
}

case class GitHubBranch(name:String, commit:GitHubCommit, `protected`: Boolean) {
  def mapToGitlab:Branch = {
    Branch(name, false, `protected`, name=="main",None,None,None,None, commit.mapToGitlab)
  }
}
