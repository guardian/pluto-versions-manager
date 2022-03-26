package models.github

import models.gitlab.JobResponse

import java.time.ZonedDateTime

case class WorkflowRun(id:Long, name: String, node_id:String, check_suite_id: Int, check_suite_node_id:String, head_branch: String, head_sha:String,
                       run_number: Int, event: String, status: String, conclusion:Option[String], workflow_id: Long, url:String, html_url:String,
                       created_at:ZonedDateTime, updated_at:ZonedDateTime, actor:GitHubActor, run_attempt:Int, run_started_at:ZonedDateTime,
                       jobs_url:Option[String], artifacts_url:String, logs_url:String, check_suite_url:String, workflow_url:String) {
  def mapToGitlab:JobResponse = {
    throw new RuntimeException("WorkflowRun.mapToGitlab not implemented yet")
//    JobResponse(
//      id = id,
//      name = name,
//      created_at = created_at,
//      started_at = run_started_at,
//    )
  }
}

case class WorkflowRunsResponse(total_count:Int, workflow_runs:Seq[WorkflowRun])