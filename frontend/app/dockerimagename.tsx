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
      <Typography id="docker-image-name">
        {props.image.imageName.replace("/", " / ")}
      </Typography>
      <Typography id="docker-image-version" className={classes.versionText}>
        {props.image.version}
      </Typography>
    </>
  );
};

export default DockerImageName;
