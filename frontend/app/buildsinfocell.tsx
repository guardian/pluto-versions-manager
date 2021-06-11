import React from "react";
import { Typography } from "@material-ui/core";
import GeneralInfoCell from "./generalinfocell";
import { useStyles } from "./mainpage";

interface BuildsInfoCellProps {
  deploymentInfo: DeployedImageInfo;
  branchName?: string;
  onUpdateInitiated?: () => void;
}

const BuildsInfoCell: React.FC<BuildsInfoCellProps> = (props) => {
  const parentClasses = useStyles();

  return (
    <GeneralInfoCell
      deploymentInfo={props.deploymentInfo}
      gitRef={props.branchName}
      onUpdateInitiated={props.onUpdateInitiated}
    >
      <Typography className={parentClasses.cellTitle}>
        {props.branchName ? `Branch ${props.branchName}` : "Available"}
      </Typography>
    </GeneralInfoCell>
  );
};

export default BuildsInfoCell;
