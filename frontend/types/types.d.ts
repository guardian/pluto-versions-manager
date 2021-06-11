
interface DockerImage {
    imageName: string;
    version: string;
}

interface DeployedImageInfo {
    deploymentName: string;
    namespace: string;
    deployedImages: DockerImage[];
    observedGeneration?:number;
    readyReplicas?:number;
    notReadyReplicas?:number;
    labels:Record<string,string>
}

interface BuildInfo {
    ci_commit_branch?:string;
    ci_commit_ref_name?:string;
    ci_commit_sha:string;
    ci_commit_timestamp:string;
    ci_commit_title?:string;
    ci_job_url:string;
    ci_project_name:string;
    ci_merge_request_project_url?:string;
    ci_merge_request_title?:string;
    ci_pipeline_iid: number;
    built_image?:DockerImage;
}

interface UpdateDeploymentRequest {
    to: DockerImage;
    deploymentName:string;
}

interface ConflictError {
    deployed: string[];
    expected: string;
}

/*
case class Commit(
                 author_email: String,
                 author_name: Option[String],
                 authored_date: Option[ZonedDateTime],
                 committed_date: Option[ZonedDateTime],
                 committer_email: Option[String],
                 committer_name: Option[String],
                 id: String,
                 short_id: String,
                 title: Option[String],
                 message: Option[String],
                 parent_ids: Seq[String]
                 )


 */

interface GitlabCommit {
    author_email?: string;
    author_name?: string;
    authored_date?: string;
    committed_date?: string;
    committer_email?: string;
    committer_name?: string;
    id: string;
    short_id: string;
    title?: string;
    message?: string;
    parent_ids: string[];
}

interface GitlabBranch {
    name: string;
    merged: boolean;
    protected: boolean;
    default: boolean;
    developers_can_push?: boolean;
    developers_can_merge?: boolean;
    can_push?: boolean;
    web_url?: string;
    commit: GitlabCommit[];
}