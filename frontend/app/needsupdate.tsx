import React from "react";
import { CompareVersionResult, compareVersionResults } from "./getbuilds";
import { IconButton, makeStyles, Tooltip } from "@material-ui/core";
import {
  Check,
  Compare,
  ErrorOutline,
  NotListedLocation,
  Update,
  Warning,
  WarningOutlined,
} from "@material-ui/icons";

const Updates = {
  NotRequired: "not-required",
  Downgrade: "downgrade",
  Upgrade: "upgrade",
};
type UpdateType = typeof Updates;

interface NeedsUpdateProps {
  deployment: DeployedImageInfo;
  available: BuildInfo;
  updateRequested: (updateType: string) => void;
}

const useStyles = makeStyles((theme) => ({
  ok: {
    color: theme.palette.success.dark,
  },
  warning: {
    color: theme.palette.warning.dark,
  },
  info: {
    color: theme.palette.info.dark,
  },
  error: {
    color: theme.palette.error.dark,
  },
}));

const NeedsUpdate: React.FC<NeedsUpdateProps> = (props) => {
  const classes = useStyles();

  const updateNotRequired = () => {
    props.updateRequested(Updates.NotRequired);
  };

  const downgradeRequested = () => {
    props.updateRequested(Updates.Downgrade);
  };

  const updateRequested = () => {
    props.updateRequested(Updates.Upgrade);
  };
  switch (compareVersionResults(props.deployment, props.available)) {
    case CompareVersionResult.SAME:
      return (
        <Tooltip title="No update required">
          <IconButton onClick={updateNotRequired}>
            <Check className={classes.ok} />
          </IconButton>
        </Tooltip>
      );
    case CompareVersionResult.DEPLOYMENT_AHEAD:
      return (
        <Tooltip title="Deployed version is ahead of master">
          <IconButton onClick={downgradeRequested}>
            <WarningOutlined className={classes.ok} />
          </IconButton>
        </Tooltip>
      );
    case CompareVersionResult.NEEDS_UPDATE:
      return (
        <Tooltip title="Deployed version is behind master and should be updated">
          <IconButton onClick={updateRequested}>
            <Warning className={classes.warning} />
          </IconButton>
        </Tooltip>
      );
    case CompareVersionResult.NON_NUMERIC:
      return (
        <Tooltip title="Either the current version or the build is not on the version tree">
          <IconButton onClick={updateRequested}>
            <NotListedLocation className={classes.info} />
          </IconButton>
        </Tooltip>
      );
    case CompareVersionResult.NOTHING_AVAILABLE:
      return (
        <Tooltip title="The build image name does not match the deployed image. Something is misconfigured.">
          <IconButton onClick={updateNotRequired}>
            <ErrorOutline className={classes.error} />
          </IconButton>
        </Tooltip>
      );
    default:
      const weGot = compareVersionResults(props.deployment, props.available);
      console.log("Unexpected result from compare versions: ", weGot);
      return (
        <Tooltip title="An internal error occurred, see the browser console for details">
          <IconButton onClick={updateRequested}>
            <ErrorOutline className={classes.error} />
          </IconButton>
        </Tooltip>
      );
  }
};

export { Updates };
export default NeedsUpdate;
