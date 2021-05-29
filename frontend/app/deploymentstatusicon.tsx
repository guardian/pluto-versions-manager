import React from "react";
import { Block, Check, Warning, WarningOutlined } from "@material-ui/icons";
import { makeStyles, Tooltip } from "@material-ui/core";

interface DeploymentStatusIconProps {
  availableReplicas: number;
  notAvailableReplicas: number;
}

const useStyles = makeStyles((theme) => ({
  error: {
    color: theme.palette.error.dark,
  },
  warning: {
    color: theme.palette.warning.dark,
  },
  ok: {
    color: theme.palette.success.dark,
  },
}));

const DeploymentStatusIcon: React.FC<DeploymentStatusIconProps> = (props) => {
  const classes = useStyles();

  if (props.availableReplicas == 0 && props.notAvailableReplicas == 0) {
    return (
      <Tooltip title="This deployment is currently disabled">
        <Block />
      </Tooltip>
    );
  } else if (props.availableReplicas > 0 && props.notAvailableReplicas == 0) {
    return (
      <Tooltip title="This deployment is running fine">
        <Check className={classes.ok} />
      </Tooltip>
    );
  } else if (props.availableReplicas > 0 && props.notAvailableReplicas > 0) {
    return (
      <Tooltip title="This deployment is degraded. It might be in the process of rolling out, or there might be a partial failure.">
        <WarningOutlined className={classes.warning} />
      </Tooltip>
    );
  } else {
    return (
      <Tooltip title="This deployment has failed and is not currently running">
        <Warning className={classes.error} />
      </Tooltip>
    );
  }
};

export default DeploymentStatusIcon;
