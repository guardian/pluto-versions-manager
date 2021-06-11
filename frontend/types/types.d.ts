
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
    parent_ids?: string[];
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
    commit: GitlabCommit;
}

interface GitlabAuthor {
    id: number;
    name?: string;
    username: string;
    state: string;
    avatar_url?: string;
    web_url?: string;
}

interface GitlabMergeRequest {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description?: string;
    state: string;
    created_at: string;
    updated_at: string;
    merged_by?: string;
    merged_at?: string;
    closed_by?: string;
    closed_at?: string;
    target_branch: string;
    source_branch: string;
    user_notes_count: number;
    upvotes: number;
    downvotes: number;
    author?: GitlabAuthor;
    sha: string;
    web_url?: string;
}