import React, { useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import axios from "axios";
import {
  Button,
  Chip,
  Grid,
  makeStyles,
  Link,
  Typography,
} from "@material-ui/core";
import Generalinfocell from "./buildsinfocell";
import DeploymentStatusIcon from "./deploymentstatusicon";
import DockerImageName from "./dockerimagename";
import {
  SystemNotification,
  SystemNotifcationKind,
} from "@guardian/pluto-headers";
import { Cached, ChevronRight } from "@material-ui/icons";
import { Link as RouterLink } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  infoGrid: {
    marginLeft: "auto",
    marginRight: "auto",
    maxWidth: "90%",
    minWidth: "20%",
    width: "fit-content",
  },
  gridRow: {
    width: "fit-content",
    borderColor: theme.palette.common.white,
    borderWidth: "2px",
    borderRadius: "10px",
    borderStyle: "solid",
    marginBottom: "0.2em",
    padding: "0.6em",
  },
  infoCell: {
    width: "400px",
    borderWidth: "2px",
    borderRightStyle: "solid",
  },
  deployedVersionCell: {
    width: "400px",
    overflowWrap: "break-word",
    paddingLeft: "0.6em",
    paddingRight: "0.6em",
    borderWidth: "2px",
    borderRightStyle: "solid",
  },
  buildsInfoCell: {
    width: "400px",
    overflowWrap: "break-word",
    paddingLeft: "0.6em",
    paddingRight: "0.6em",
  },
  inlineText: {
    display: "inline",
    marginRight: "1em",
  },
  deploymentLabel: {
    marginRight: "1em",
    marginTop: "1em",
  },
  cellTitle: {
    fontWeight: "bold",
    fontSize: "1.3em",
    textAlign: "center",
  },
}));

const MainPage: React.FC<RouteComponentProps> = (props) => {
  const [deployments, setDeployments] = useState<DeployedImageInfo[]>([]);

  const classes = useStyles();

  const refresh = async () => {
    try {
      const response = await axios.get<DeployedImageInfo[]>(
        "/api/known_deployments"
      );
      switch (response.status) {
        case 200:
          setDeployments(
            response.data.filter(
              (info) =>
                info.labels.hasOwnProperty("gitlab-project-id") ||
                (info.labels.hasOwnProperty("github-project-name") &&
                  info.labels.hasOwnProperty("github-org"))
            )
          );
          break;
        default:
          console.error(`server returned ${response.status}`);
          SystemNotification.open(
            SystemNotifcationKind.Error,
            `Could not load deployments from cluster: server returned ${response.status}`
          );
          break;
      }
    } catch (e) {
      console.error("Could not load deployments: ", e);
      SystemNotification.open(
        SystemNotifcationKind.Error,
        `Could not load deployments from cluster: ${e}`
      );
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  /**
   * when an update is performed, then refresh the view after 1 second
   */
  const onUpdateInitiated = () => {
    console.log("update was initiated, scheduling refresh");
    window.setTimeout(() => refresh(), 1000);
  };

  return (
    <>
      <Grid
        container
        justify="space-between"
        alignItems="center"
        style={{ marginRight: "1em" }}
      >
        <Grid item>
          <Typography variant="h2">Pluto Versions Manager</Typography>
        </Grid>
        <Grid item>
          <Button variant="outlined" startIcon={<Cached />} onClick={refresh}>
            Refresh
          </Button>
        </Grid>
      </Grid>
      <Grid container className={classes.infoGrid} direction="column">
        {deployments.map((info, idx) => (
          <Grid
            item
            container
            direction="row"
            key={idx}
            className={classes.gridRow}
          >
            <Grid item className={classes.infoCell}>
              <Typography variant="h4" className={classes.inlineText}>
                {info.deploymentName}
              </Typography>
              <Typography className={classes.inlineText}>
                {info.namespace}
              </Typography>
              <br />
              <Typography>
                {info.readyReplicas} ready and {info.notReadyReplicas} not ready
                {info.readyReplicas && info.notReadyReplicas ? (
                  <DeploymentStatusIcon
                    availableReplicas={info.readyReplicas}
                    notAvailableReplicas={info.notReadyReplicas}
                  />
                ) : null}
              </Typography>
              {Object.keys(info.labels).map((labelName) => (
                <Chip
                  key={labelName}
                  label={`${labelName}: ${info.labels[labelName]}`}
                  className={classes.deploymentLabel}
                />
              ))}
            </Grid>
            <Grid item className={classes.deployedVersionCell}>
              <Typography className={classes.cellTitle}>
                Currently running
              </Typography>
              <ul>
                {info.deployedImages.map((imageInfo, idx) => (
                  <li key={idx}>
                    <DockerImageName image={imageInfo} />
                  </li>
                ))}
              </ul>
            </Grid>
            <Grid item className={classes.buildsInfoCell}>
              <Generalinfocell
                deploymentInfo={info}
                onUpdateInitiated={onUpdateInitiated}
              />
              <Button
                component={RouterLink}
                to={`/${info.deploymentName}/branches`}
                variant="outlined"
                endIcon={<ChevronRight />}
                style={{
                  display: "flex",
                  marginLeft: "auto",
                  marginRight: "auto",
                  marginTop: "1em",
                }}
              >
                Other branches
              </Button>
            </Grid>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export { useStyles };

export default MainPage;
