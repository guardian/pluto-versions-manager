import axios from "axios";

async function getLatestBuildInternal(
  projectId: string,
  buildJob: string,
  branchName: string
): Promise<BuildInfo> {
  const url = `/api/project/${projectId}/${branchName}/${buildJob}/buildinfo`;
  const response = await axios.get<BuildInfo>(url);
  switch (response.status) {
    case 200:
      return response.data;
    default:
      throw `Server returned ${response.status}`;
  }
}

/**
 * finds the value of the "gitlab-project-id" label
 * @param deploymentInfo
 */
function getGHProjectId(deploymentInfo: DeployedImageInfo): string | undefined {
  if (deploymentInfo.labels.hasOwnProperty("gitlab-project-id")) {
    return deploymentInfo.labels["gitlab-project-id"];
  } else {
    return undefined;
  }
}

/**
 * finds the value of the "gitlab-publishing-job" label
 * @param deploymentInfo
 */
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

  return getLatestBuildInternal(maybeProjectId, jobName, "master");
}

const CompareVersionResult = {
  SAME: "same",
  NEEDS_UPDATE: "needs_update",
  DEPLOYMENT_AHEAD: "deployment_ahead",
  NON_NUMERIC: "non_numeric",
  NOTHING_AVAILABLE: "nothing_available",
};

/**
 * checks whether the deployed image is ahead or behind the one that is available.
 * this first finds an image in DeployedImageInfo that has the same name as in `available` and does a version comparison on
 * that.  If there is no such image, then CompareVersionResult.NOTHING_AVAILABLE is returned.
 *
 * @param deployment `DeployedImageInfo` representing the format that is deployed
 * @param available `BuildInfo` representing the image that is available from the server
 * @returns a value from CompareVersionResult
 */
function compareVersionResults(
  deployment: DeployedImageInfo,
  available: BuildInfo
): string {
  if (!available.built_image) {
    return CompareVersionResult.NOTHING_AVAILABLE;
  }

  try {
    const numericVersionAvailable = parseInt(available.built_image.version);
    if(Number.isNaN(numericVersionAvailable)) return CompareVersionResult.NON_NUMERIC;

    const relevantDeployedImages = deployment.deployedImages.filter(
      (img) => img.imageName == available.built_image?.imageName
    );
    if (relevantDeployedImages.length == 0)
      return CompareVersionResult.NOTHING_AVAILABLE;
    const numericVersionDeployed = parseInt(relevantDeployedImages[0].version);
    if(Number.isNaN(numericVersionDeployed)) return CompareVersionResult.NON_NUMERIC;

    if (numericVersionAvailable == numericVersionDeployed) {
      return CompareVersionResult.SAME;
    } else if (numericVersionDeployed < numericVersionAvailable) {
      return CompareVersionResult.NEEDS_UPDATE;
    } else {
      return CompareVersionResult.DEPLOYMENT_AHEAD;
    }
  } catch (e) {
    return CompareVersionResult.NON_NUMERIC;
  }
}

export { getLatestMasterBuild, compareVersionResults, CompareVersionResult };
