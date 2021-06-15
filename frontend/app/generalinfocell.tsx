import React, { useEffect, useState } from "react";
import { useStyles } from "./mainpage";
import {
  Button,
  Dialog,
  Grid,
  LinearProgress,
  makeStyles,
  Typography,
} from "@material-ui/core";
import {
  getLatestBuild,
  getLatestMasterBuild,
  requestUpdate,
} from "./getbuilds";
import DockerImageName from "./dockerimagename";
import NeedsUpdate, { Updates } from "./needsupdate";
import clsx from "clsx";
import SystemNotification, {
  SystemNotifcationKind,
} from "./system_notification";
import { Error } from "@material-ui/icons";

interface GeneralInfoCellProps {
  deploymentInfo: DeployedImageInfo;
  gitRef?: string;
  onUpdateInitiated?: () => void;
  hideOn404?: boolean;
}

const localStyles = makeStyles((theme) => ({
  inline: {
    display: "inline",
  },
  warning: {
    color: theme.palette.warning.dark,
  },
  updateDialog: {
    padding: "1em",
  },
}));

const GeneralInfoCell: React.FC<GeneralInfoCellProps> = (props) => {
  const [masterBuild, setMasterBuild] =
    useState<BuildInfo | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showingDialog, setShowingDialog] = useState(false);
  const [updateType, setUpdateType] = useState("");
  const [failureMessage, setFailureMessage] =
    useState<string | undefined>(undefined);

  const classes = localStyles();

  useEffect(() => {
    getLatestBuild(props.deploymentInfo, props.gitRef ?? "master")
      .then((info) => {
        if (info) {
          setMasterBuild(info);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        console.error("Could not get master build info");
        if (err.toString().includes("404")) {
          if (!props.hideOn404) {
            setFailureMessage(err.toString()); //don't set failure message if we are told to hide on 404
          }
        } else {
          setFailureMessage(err.toString());
        }
      });
  }, [props.deploymentInfo]);

  const updateRequested = (updateType: string) => {
    console.log("update requested: ", updateType);
    setUpdateType(updateType);
    setShowingDialog(true);
  };

  const handleDialogClose = () => {
    setShowingDialog(false);
  };

  const performUpdate = () => {
    setShowingDialog(false);
    if (masterBuild?.built_image) {
      requestUpdate(
        masterBuild.built_image,
        props.deploymentInfo.deploymentName
      )
        .then(() =>
          props.onUpdateInitiated ? props.onUpdateInitiated() : null
        )
        .catch((err) => {
          console.error(err);
          SystemNotification.open(
            SystemNotifcationKind.Error,
            "Internal error occurred and the reqeust was not sent. See console for details."
          );
        });
    } else {
      SystemNotification.open(
        SystemNotifcationKind.Error,
        "Can't request update if there is no current build set"
      );
    }
  };

  return (
    <>
      {props.children}
      {loading ? <LinearProgress variant="indeterminate" /> : null}
      {failureMessage ? (
        <Typography id="error-message">
          <Error />
          Could not determine available versions: {failureMessage}
        </Typography>
      ) : null}

      {masterBuild?.built_image ? (
        <>
          <NeedsUpdate
            deployment={props.deploymentInfo}
            available={masterBuild}
            updateRequested={updateRequested}
          />
          <Typography className={classes.inline}>Latest version is</Typography>
          <DockerImageName image={masterBuild.built_image} />
          <Typography className={classes.inline} id="build-date">
            built at {masterBuild.ci_commit_timestamp}
          </Typography>
        </>
      ) : null}
      {notFound ? (
        <Typography>
          No builds could be found. Is the deployment missing the
          'gitlab-project-id' tag?
        </Typography>
      ) : null}
      {showingDialog && updateType == Updates.NotRequired ? (
        <Dialog
          classes={{ paper: classes.updateDialog }}
          open={showingDialog}
          onClose={handleDialogClose}
        >
          <Typography variant="h4">
            Update {props.deploymentInfo.deploymentName}
          </Typography>
          <Typography>No update is required at the moment</Typography>
          <hr />
          <Button variant="outlined" onClick={handleDialogClose}>
            Close
          </Button>
        </Dialog>
      ) : null}
      {showingDialog && updateType == Updates.Downgrade ? (
        <Dialog
          classes={{ paper: classes.updateDialog }}
          open={showingDialog}
          onClose={handleDialogClose}
        >
          <Typography variant="h4">
            Downgrade {props.deploymentInfo.deploymentName}
          </Typography>
          <Typography className={clsx(classes.inline, classes.warning)}>
            WARNING
          </Typography>
          <Typography>
            The currently running version is potentially later than the one you
            are trying to deploy. Continuing may result in a loss of
            functionality and could cause problems if any data schemas have been
            updated in the later running version. Please ensure that you are
            aware of the code differences between the versions before
            continuing.
          </Typography>
          <hr />
          <Grid container justify="space-between">
            <Grid item>
              <Button variant="outlined" onClick={handleDialogClose}>
                Cancel
              </Button>
            </Grid>
            <Grid item>
              <Button variant="contained" onClick={performUpdate}>
                Downgrade
              </Button>
            </Grid>
          </Grid>
        </Dialog>
      ) : null}
      {showingDialog && updateType == Updates.Upgrade ? (
        <Dialog
          classes={{ paper: classes.updateDialog }}
          open={showingDialog}
          onClose={handleDialogClose}
        >
          <Typography variant="h4">
            Upgrade {props.deploymentInfo.deploymentName}
          </Typography>
          <Typography>
            The current deployment will be upgraded to the latest version from{" "}
            {masterBuild?.ci_commit_ref_name}.
          </Typography>
          <Typography>
            Please be aware that this might expect data schema changes or other
            external changes that can't be managed through this app.
          </Typography>
          <Typography>
            Please ensure that you are aware of any code differences between the
            versions before continuing
          </Typography>
          {masterBuild?.ci_merge_request_project_url ? (
            <Typography>
              Merge request details are at{" "}
              <a href={masterBuild.ci_merge_request_project_url}>
                {masterBuild.ci_merge_request_project_url}
              </a>
            </Typography>
          ) : null}
          <hr />
          <Grid container justify="space-between">
            <Grid item>
              <Button variant="outlined" onClick={handleDialogClose}>
                Cancel
              </Button>
            </Grid>
            <Grid item>
              <Button variant="contained" onClick={performUpdate}>
                Upgrade
              </Button>
            </Grid>
          </Grid>
        </Dialog>
      ) : null}
    </>
  );
};

export default GeneralInfoCell;
