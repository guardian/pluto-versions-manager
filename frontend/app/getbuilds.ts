import axios from "axios";

async function getLatestMasterBuildInternal(
  projectId: string,
  buildJob: string
) {
  const url = `/api/project/${projectId}/master/${buildJob}/buildinfo`;
  return await axios.get<BuildInfo>(url);
}

function getGHProjectId(deploymentInfo: DeployedImageInfo): string | undefined {
  if (deploymentInfo.labels.hasOwnProperty("gitlab-project-id")) {
    return deploymentInfo.labels["gitlab-project-id"];
  } else {
    return undefined;
  }
}
async function getLatestMasterBuild(deploymentInfo: DeployedImageInfo) {
  const possibleJobNames = ["deploy", "uploads", "docker"];
  const maybeProjectId = getGHProjectId(deploymentInfo);
  if (!maybeProjectId) {
    return;
  }
  for (let i = 0; i < possibleJobNames.length; i += 1) {
    const jobName = possibleJobNames[i];
    console.log(jobName);
    try {
      const response = await getLatestMasterBuildInternal(
        maybeProjectId,
        jobName
      );
      switch (response.status) {
        case 200:
          return response.data;
        case 404:
          continue;
        case 500:
          continue;
        default:
          throw `Server error ${response.status}`;
      }
    } catch (e) {
      console.warn("Could not get with job name ", jobName, ": ", e);
    }
  }
}

export { getLatestMasterBuild };
