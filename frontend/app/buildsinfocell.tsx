import React, { useEffect, useState } from "react";
import { useStyles } from "./mainpage";
import { LinearProgress, Typography } from "@material-ui/core";
import { getLatestMasterBuild } from "./getbuilds";

interface BuildsInfoCellProps {
  deploymentInfo: DeployedImageInfo;
  onError?: (errorDesc: string) => void;
}

const BuildsInfoCell: React.FC<BuildsInfoCellProps> = (props) => {
  const [masterBuild, setMasterBuild] =
    useState<BuildInfo | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const classes = useStyles();

  useEffect(() => {
    getLatestMasterBuild(props.deploymentInfo)
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
        if (props.onError) props.onError(err.toString);
      });
  }, [props.deploymentInfo]);

  return (
    <>
      <Typography className={classes.cellTitle}>Available</Typography>
      {loading ? <LinearProgress variant="indeterminate" /> : null}
      {masterBuild ? (
        <Typography>
          Latest mainline version is {masterBuild.built_image} from{" "}
          {masterBuild.ci_commit_timestamp}
        </Typography>
      ) : null}
      {notFound ? (
        <Typography>
          No builds could be found. Is the deployment missing the
          'gitlab-project-id' tag?
        </Typography>
      ) : null}
    </>
  );
};

export default BuildsInfoCell;
