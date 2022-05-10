package services

import akka.util.ByteString
import models.gitlab.{Branch, GitlabProject, JobResponse, MergeRequest}
import models.gitlab.MergeRequestState.MergeRequestState
import io.circe.Error
import scala.concurrent.Future

/**
 * This trait defines the interface for a version-control system connector.
 */
trait VCSAPI {
  def listProjects:Future[Either[Error, Seq[GitlabProject]]]

  def jobsForProject(projectId:String):Future[Either[Error, Seq[JobResponse]]]

  def artifactsZipForBranch(projectId:String, branchName:String, jobName:String):Future[Option[ByteString]]

  def branchesForProject(projectId:String):Future[Either[Error, Seq[Branch]]]

  def getOpenMergeRequests(projectId:String, forStatus:Option[MergeRequestState]):Future[Either[Error, Seq[MergeRequest]]]
}
