
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

/*
case class BuildInfo(
                    ci_commit_branch:Option[String],
                    ci_commit_ref_name:Option[String],
                    ci_commit_sha: String,
                    ci_commit_timestamp: ZonedDateTime,
                    ci_commit_title: Option[String],
                    ci_job_url: String,
                    ci_project_name: String,
                    ci_merge_request_project_url: Option[String],
                    ci_merge_request_title: Option[String],
                    ci_pipeline_iid: Int,
                    built_image:Option[String]
                    )

 */

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