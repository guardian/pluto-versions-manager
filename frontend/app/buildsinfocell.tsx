import React from "react";
import { Typography } from "@material-ui/core";
import GeneralInfoCell from "./generalinfocell";
import { useStyles } from "./mainpage";

interface BuildsInfoCellProps {
  deploymentInfo: DeployedImageInfo;
  branchName?: string;
  onUpdateInitiated?: () => void;
  hideOn404?: boolean;
}

const BuildsInfoCell: React.FC<BuildsInfoCellProps> = (props) => {
  const parentClasses = useStyles();

  return (
    <GeneralInfoCell gitRef={props.branchName} {...props}>
      <Typography className={parentClasses.cellTitle}>
        {props.branchName ? `Branch ${props.branchName}` : "Available"}
      </Typography>
    </GeneralInfoCell>
  );
};

export default BuildsInfoCell;
