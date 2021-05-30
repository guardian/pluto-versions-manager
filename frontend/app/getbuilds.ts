import axios from "axios";

async function getLatestMasterBuildInternal(
  projectId: string,
  buildJob: string
): Promise<BuildInfo> {
  const url = `/api/project/${projectId}/master/${buildJob}/buildinfo`;
  const response = await axios.get<BuildInfo>(url);
  switch (response.status) {
    case 200:
      return response.data;
    default:
      throw `Server returned ${response.status}`;
  }
}

function getGHProjectId(deploymentInfo: DeployedImageInfo): string | undefined {
  if (deploymentInfo.labels.hasOwnProperty("gitlab-project-id")) {
    return deploymentInfo.labels["gitlab-project-id"];
  } else {
    return undefined;
  }
}

function getGHPublishingJob(
  deploymentInfo: DeployedImageInfo
): string | undefined {
  if (deploymentInfo.labels.hasOwnProperty("gitlab-publishing-job")) {
    return deploymentInfo.labels["gitlab-publishing-job"];
  } else {
    return undefined;
  }
}

async function getLatestMasterBuild(deploymentInfo: DeployedImageInfo) {
  const maybeProjectId = getGHProjectId(deploymentInfo);
  if (!maybeProjectId) {
    console.log(
      `${deploymentInfo.deploymentName}: can't get build info because there is no gitlab-project-id set in the labels`
    );
    return;
  }

  const jobName = getGHPublishingJob(deploymentInfo);
  if (!jobName) {
    console.log(
      `${deploymentInfo.deploymentName}: can't get build info because there is not gitlab-publishing-job set in the labels`
    );
    return;
  }

  return getLatestMasterBuildInternal(maybeProjectId, jobName);
}

export { getLatestMasterBuild };
