import React, { useEffect, useState } from "react";
import { RouteComponentProps, useHistory } from "react-router";
import { Button, Chip, Grid, makeStyles, Typography } from "@material-ui/core";
import axios from "axios";
import { SystemNotification, SystemNotifcationKind } from "pluto-headers";
import DeploymentStatusIcon from "./deploymentstatusicon";
import DockerImageName from "./dockerimagename";
import { ChevronLeft, ChevronRight } from "@material-ui/icons";
import MergeRequestInfoCell from "./MergeRequestInfoCell";
import BuildsInfoCell from "./buildsinfocell";

interface BranchesRouteParams {
  deployment_name: string;
}

const useStyles = makeStyles((theme) => ({
  banner: {
    /*borderWidth: "2px",
    borderColor: theme.palette.text.secondary,
    borderRadius: "10px",*/
    marginBottom: "2em",
  },
  deploymentLabel: {
    marginRight: "1em",
    marginTop: "1em",
  },
  branchInfo: {
    marginTop: "2em",
    marginLeft: "1em",
    marginRight: "1em",
    borderStyle: "solid",
    borderRadius: "10px",
    borderColor: theme.palette.text.secondary,
  },
  endOfList: {
    width: "30vw",
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center",
    marginTop: "8em",
    fontStyle: "italic",
  },
}));

const BranchesComponent: React.FC<RouteComponentProps<BranchesRouteParams>> = (
  props
) => {
  const [knownBranches, setKnownBranches] = useState<GitlabBranch[]>([]);
  const [knownMergeRequests, setKnownMergeRequests] = useState<
    GitlabMergeRequest[]
  >([]);

  const [totalBranchesCount, setTotalBranchesCount] = useState(0);
  const [totalMRCount, setTotalMRCount] = useState(0);

  const [displayBranchesLimit, setDisplayBranchesLimit] = useState(8);

  const [currentDeployment, setCurrentDeployment] =
    useState<DeployedImageInfo | undefined>(undefined);

  const [loading, setLoading] = useState(false);

  const classes = useStyles();
  const history = useHistory();

  const refreshBranches = async (project_id: number) => {
    if (!project_id) {
      SystemNotification.open(
        SystemNotifcationKind.Error,
        "This deployment has no project id registered, can't get branches"
      );
      return;
    } else {
      setLoading(true);
      try {
        const response = await axios.get<GitlabBranch[]>(
          `/api/project/${project_id}/branches`
        );
        const branchesInMergeRequests = knownMergeRequests.map(
          (mr) => mr.source_branch
        );

        const nonDuplicateBranches = response.data.filter(
          (b) => !branchesInMergeRequests.includes(b.name)
        );

        setTotalBranchesCount(nonDuplicateBranches.length);
        if (nonDuplicateBranches.length < displayBranchesLimit) {
          setKnownBranches(nonDuplicateBranches);
        } else {
          setKnownBranches(nonDuplicateBranches.slice(0, displayBranchesLimit));
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        SystemNotification.open(
          SystemNotifcationKind.Error,
          "Could not load branch information"
        );
        setLoading(false);
      }
    }
  };

  const refreshMergeRequests = async (project_id: number) => {
    if (!project_id) {
      SystemNotification.open(
        SystemNotifcationKind.Error,
        "This deployment has no project id registered, can't get merge requests"
      );
      return;
    } else {
      setLoading(true);
      try {
        const response = await axios.get<GitlabMergeRequest[]>(
          `/api/project/${project_id}/mergerequests`
        );
        setTotalMRCount(response.data.length);
        if (response.data.length < displayBranchesLimit) {
          setKnownMergeRequests(response.data);
        } else {
          setKnownMergeRequests(response.data.slice(0, displayBranchesLimit));
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        SystemNotification.open(
          SystemNotifcationKind.Error,
          "Could not load branch information"
        );
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (currentDeployment) {
      try {
        const project_id = parseInt(
          currentDeployment.labels["gitlab-project-id"]
        );
        refreshMergeRequests(project_id);
      } catch (err) {
        console.error("Could not get project id: ", err);
        SystemNotification.open(
          SystemNotifcationKind.Error,
          "Could not find project id for this component"
        );
      }
    }
  }, [currentDeployment, displayBranchesLimit]);

  useEffect(() => {
    if (currentDeployment) {
      try {
        const project_id = parseInt(
          currentDeployment.labels["gitlab-project-id"]
        );
        refreshBranches(project_id);
      } catch (err) {
        console.error("Could not get project id: ", err);
        SystemNotification.open(
          SystemNotifcationKind.Error,
          "Could not find project id for this component"
        );
      }
    }
  }, [knownMergeRequests]);

  const refreshCurrentDeployment = async () => {
    setLoading(true);
    const name = props.match.params.deployment_name;
    try {
      const response = await axios.get<DeployedImageInfo>(
        `/api/deployment/${name}`
      );
      setLoading(false);
      setCurrentDeployment(response.data);
    } catch (err) {
      console.error(err);
      SystemNotification.open(
        SystemNotifcationKind.Error,
        "Could not load current deployment information"
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCurrentDeployment();
  }, []);

  return (
    <>
      <Grid
        container
        className={classes.banner}
        direction="row"
        spacing={2}
        justify="center"
      >
        <Grid item style={{ alignSelf: "flex-end" }}>
          <Button
            variant="outlined"
            startIcon={<ChevronLeft />}
            onClick={() => history.goBack()}
          >
            Back
          </Button>
        </Grid>
        <Grid item>
          <Typography variant="h4">
            {currentDeployment?.deploymentName ?? ""}
          </Typography>
          <Typography>
            {currentDeployment?.readyReplicas} ready and{" "}
            {currentDeployment?.notReadyReplicas} not ready
            {currentDeployment?.readyReplicas &&
            currentDeployment?.notReadyReplicas ? (
              <DeploymentStatusIcon
                availableReplicas={currentDeployment?.readyReplicas}
                notAvailableReplicas={currentDeployment?.notReadyReplicas}
              />
            ) : null}
          </Typography>
          {currentDeployment
            ? Object.keys(currentDeployment.labels).map((labelName) => (
                <Chip
                  key={labelName}
                  label={`${labelName}: ${currentDeployment.labels[labelName]}`}
                  className={classes.deploymentLabel}
                />
              ))
            : null}
        </Grid>
        <Grid>
          <ul>
            {currentDeployment
              ? currentDeployment.deployedImages.map((imageInfo, idx) => (
                  <li key={idx}>
                    <DockerImageName image={imageInfo} />
                  </li>
                ))
              : null}
          </ul>
        </Grid>
      </Grid>
      {/* merge request information */}
      <Grid container justify="center" spacing={3}>
        {currentDeployment
          ? knownMergeRequests.map((mr, idx) => (
              <Grid item className={classes.branchInfo} key={idx} xs={3}>
                <MergeRequestInfoCell
                  deploymentInfo={currentDeployment}
                  mr={mr}
                />
              </Grid>
            ))
          : undefined}
      </Grid>
      {/* branches information */}
      <Grid container justify="center" spacing={3}>
        {currentDeployment
          ? knownBranches.map((branch, idx) => (
              <Grid item className={classes.branchInfo} key={idx} xs={3}>
                <BuildsInfoCell
                  deploymentInfo={currentDeployment}
                  branchName={branch.name}
                />
              </Grid>
            ))
          : undefined}
      </Grid>
      {totalBranchesCount > displayBranchesLimit ? (
        <div className={classes.endOfList}>
          <Typography>
            There are {totalBranchesCount - displayBranchesLimit} more branches
            not shown here
          </Typography>
          <Button
            onClick={() => setDisplayBranchesLimit((prev) => prev + 8)}
            endIcon={<ChevronRight />}
          >
            Show more
          </Button>
        </div>
      ) : undefined}
    </>
  );
};

export default BranchesComponent;
