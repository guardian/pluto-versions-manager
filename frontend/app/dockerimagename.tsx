import React from "react";
import { makeStyles, Typography } from "@material-ui/core";

interface DockerImageNameProps {
  image: DockerImage;
}

const useStyles = makeStyles({
  versionText: {
    fontWeight: "bold",
    fontSize: "1.3em",
  },
});

const DockerImageName: React.FC<DockerImageNameProps> = (props) => {
  const classes = useStyles();

  return (
    <>
      <Typography>{props.image.imageName.replace("/", " / ")}</Typography>
      <Typography className={classes.versionText}>
        {props.image.version}
      </Typography>
    </>
  );
};

export default DockerImageName;
