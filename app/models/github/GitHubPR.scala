package models.github

import models.gitlab.{Author, MergeRequest, MergeRequestState}

import java.time.ZonedDateTime

case class GitHubPR(url:String, id:Long, node_id:String, html_url:String, diff_url:String, patch_url:String, issue_url:String,
                    commits_url:String, review_comments_url:String, comments_url:String, statuses_url:String,
                    number:Int, state:String, locked:Boolean, title:String, user:GitHubActor, body:String, labels:Seq[GitHubLabel],
                    active_lock_reason:Option[String], created_at:ZonedDateTime, updated_at:Option[ZonedDateTime], closed_at:Option[ZonedDateTime],
                    merged_at:Option[ZonedDateTime], merge_commit_sha:Option[String], assignees:Seq[GitHubActor], requested_reviewers:Seq[GitHubActor],
                    author_association: Option[String], auto_merge: Option[String], draft: Boolean, head: GitHubCommit, base:GitHubCommit) {

  def mapToGitlab:MergeRequest = {
    MergeRequest(id, id, 0L, title, Some(body), MergeRequestState.fromGithub(state), created_at,
      updated_at.getOrElse(created_at), None, merged_at, None, closed_at, base.ref.getOrElse("unknown"),head.ref.getOrElse("unknown"),0,0,0,
      Some(Author(user.id, Some(user.login), user.login, "", user.avatar_url, Some(user.html_url))),
      head.sha,Some(html_url))
  }
}
