package services

import akka.util.ByteString
import models.gitlab.{Branch, GitlabProject, JobResponse, MergeRequest}
import io.circe.Error
import models.gitlab.MergeRequestState.MergeRequestState

import scala.concurrent.Future

trait CIPlatform {
  def listProjects:Future[Either[Error, Seq[GitlabProject]]]
  def jobsForProject(projectId:Long):Future[Either[Error, Seq[JobResponse]]]
  def artifactsZipForBranch(projectId:Long, branchName:String, jobName:String):Future[ByteString]
  def branchesForProject(projectId:Long):Future[Either[Error, Seq[Branch]]]
  def getOpenMergeRequests(projectId:Long, forStatus:Option[MergeRequestState]):Future[Either[Error, Seq[MergeRequest]]]
}
