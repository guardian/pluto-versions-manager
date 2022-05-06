import axios from "axios";
import { SystemNotification, SystemNotifcationKind } from "pluto-headers";

function doubleEncode(str:string):string {
  return encodeURIComponent(encodeURIComponent(str))
}

async function getLatestBuildInternal(
  projectId: string,
  buildJob: string,
  branchName: string
): Promise<BuildInfo> {
  //the branch name may contain a /; in this case it must be _double_ encoded or the / is considered part of the html path
  const url = `/api/project/${doubleEncode(projectId)}/${doubleEncode(branchName)}/${buildJob}/buildinfo`;
  const response = await axios.get<BuildInfo>(url, {
    validateStatus: () => true,
  });
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

function getGLProjectId(deploymentInfo:DeployedImageInfo): string | undefined {
  if (deploymentInfo.labels.hasOwnProperty("github-org") && deploymentInfo.labels.hasOwnProperty("github-project-name")) {
    return deploymentInfo.labels["github-org"] + "/" + deploymentInfo.labels["github-project-name"];
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

function getGLPublishingJob(
    deploymentInfo: DeployedImageInfo
): string | undefined {
  if(deploymentInfo.labels.hasOwnProperty("github-publishing-job")) {
    return deploymentInfo.labels["github-publishing-job"];
  } else {
    return undefined;
  }
}

async function getLatestMainlineBuild(deploymentInfo: DeployedImageInfo) {
  try {
    const mainBuild = await getLatestBuild(deploymentInfo, "main");
    return mainBuild;
  } catch (err) {
    if (err == "Server returned 404") {
      return getLatestBuild(deploymentInfo, "master");
    } else {
      throw err;
    }
  }
}

async function getLatestBuild(
  deploymentInfo: DeployedImageInfo,
  branchName: string
) {
  const maybeProjectId = getGLProjectId(deploymentInfo) ?? getGHProjectId(deploymentInfo);
  if (!maybeProjectId) {
    console.log(
      `${deploymentInfo.deploymentName}: can't get build info because there is no gitlab-project-id set in the labels`
    );
    return;
  }

  const jobName = getGLPublishingJob(deploymentInfo) ?? getGHPublishingJob(deploymentInfo);
  if (!jobName) {
    console.log(
      `${deploymentInfo.deploymentName}: can't get build info because there is not gitlab-publishing-job set in the labels`
    );
    return;
  }

  return getLatestBuildInternal(maybeProjectId, jobName, branchName);
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
    if (Number.isNaN(numericVersionAvailable))
      return CompareVersionResult.NON_NUMERIC;

    const relevantDeployedImages = deployment.deployedImages.filter(
      (img) => img.imageName == available.built_image?.imageName
    );
    if (relevantDeployedImages.length == 0)
      return CompareVersionResult.NOTHING_AVAILABLE;
    const numericVersionDeployed = parseInt(relevantDeployedImages[0].version);
    if (Number.isNaN(numericVersionDeployed))
      return CompareVersionResult.NON_NUMERIC;

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

function getCookie(key: string) {
  const b = document.cookie.match("(^|;)\\s*" + key + "\\s*=\\s*([^;]+)");
  return b ? b.pop() : "";
}

async function requestUpdate(to: DockerImage, deploymentName: string) {
  const requestBody: UpdateDeploymentRequest = {
    to: to,
    deploymentName: deploymentName,
  };

  const result = await axios.post("/api/deployment/update", requestBody, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Csrf-Token": getCookie("pvm-csrf"), //this must match the value of play.filters.csrf.cookie.name in application.conf
    },
    validateStatus: (status) => true,
  });

  switch (result.status) {
    case 200:
      SystemNotification.open(
        SystemNotifcationKind.Success,
        "Update is now underway. Use the Refresh button to check when the deployment completes."
      );
      break;
    case 403 | 401:
      SystemNotification.open(
        SystemNotifcationKind.Error,
        "Permission denied. You are either not an administrator or your login expired."
      );
      break;
    case 409:
      const response = result.data as ConflictError;
      console.error(
        `Server expected one of ${response.deployed} but we requested ${response.expected}`
      );
      SystemNotification.open(
        SystemNotifcationKind.Error,
        "Could not perform the update because the deployed image has a different name to the requested one"
      );
      break;
    default:
      const responseText =
        result.data && result.data.hasOwnProperty("detail")
          ? result.data.detail
          : result.data.toString();
      SystemNotification.open(
        SystemNotifcationKind.Error,
        `Could not perform update: ${responseText}`
      );
      break;
  }
}
export {
  getLatestMainlineBuild,
  getLatestBuild,
  compareVersionResults,
  CompareVersionResult,
  requestUpdate,
};
