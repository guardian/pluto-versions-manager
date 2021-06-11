import React, { useEffect, useState } from "react";
import { useStyles } from "./mainpage";
import {
  Icon,
  IconButton,
  Link,
  makeStyles,
  Typography,
} from "@material-ui/core";
import { Launch } from "@material-ui/icons";
import { getLatestBuild } from "./getbuilds";
import GeneralInfoCell from "./generalinfocell";

interface MergeRequestInfoCellProps {
  deploymentInfo: DeployedImageInfo;
  mr: GitlabMergeRequest;
}

const useLocalStyles = makeStyles((theme) => ({
  secondary: {
    color: theme.palette.text.secondary,
    fontSize: "0.8rem",
    fontStyle: "italic",
  },
}));

const MergeRequestInfoCell: React.FC<MergeRequestInfoCellProps> = (props) => {
  const parentClasses = useStyles();
  const localClasses = useLocalStyles();

  const openMergeRequest = () => {
    if (props.mr.web_url) {
      const a = document.createElement("a");
      a.href = props.mr.web_url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
  };

  return (
    <GeneralInfoCell
      deploymentInfo={props.deploymentInfo}
      gitRef={`refs/merge-requests/${props.mr.iid}/head`}
    >
      <Typography className={parentClasses.cellTitle}>
        Pending merge request {props.mr.title}
        {props.mr.web_url ? (
          <IconButton onClick={openMergeRequest}>
            <Launch />
          </IconButton>
        ) : undefined}
      </Typography>
      <Typography className={localClasses.secondary}>
        {props.mr.author
          ? props.mr.author.name ?? props.mr.author.username
          : "Unknown author"}
      </Typography>
      <Typography className={localClasses.secondary}>
        Created at {props.mr.created_at}
      </Typography>
    </GeneralInfoCell>
  );
};

export default MergeRequestInfoCell;
