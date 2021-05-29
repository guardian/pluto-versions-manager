import React, { useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import axios from "axios";
import { Chip, Grid, makeStyles, Typography } from "@material-ui/core";
import BuildsInfoCell from "./buildsinfocell";
import DeploymentStatusIcon from "./deploymentstatusicon";

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
    width: "300px",
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
  versionText: {
    fontWeight: "bold",
    fontSize: "1.3em",
  },
}));

const MainPage: React.FC<RouteComponentProps> = (props) => {
  const [deployments, setDeployments] = useState<DeployedImageInfo[]>([]);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  const classes = useStyles();

  const refresh = async () => {
    try {
      const response = await axios.get<DeployedImageInfo[]>(
        "/api/known_deployments"
      );
      switch (response.status) {
        case 200:
          setDeployments(
            response.data.filter((info) =>
              info.labels.hasOwnProperty("gitlab-project-id")
            )
          );
          setLastError(undefined);
          break;
        default:
          console.error(`server returned ${response.status}`);
          setLastError(`server returned ${response.status}`);
          break;
      }
    } catch (e) {
      console.error("Could not load deployments: ", e);
      setLastError("Could not load data, see logs for details.");
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  return (
    <>
      <Typography variant="h2">Pluto Versions Manager</Typography>
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
                  <li>
                    <Typography>
                      {imageInfo.imageName.replace("/", " / ")}
                    </Typography>
                    <Typography className={classes.versionText}>
                      {imageInfo.version}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Grid>
            <Grid item className={classes.buildsInfoCell}>
              <BuildsInfoCell deploymentInfo={info} />
            </Grid>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export { useStyles };

export default MainPage;
