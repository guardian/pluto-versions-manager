import React, {useState} from "react";
import {RouteComponentProps} from "react-router";
import {Chip, Grid, makeStyles, Typography} from "@material-ui/core";
import axios from "axios";
import SystemNotification, {SystemNotifcationKind} from "./system_notification";
import DeploymentStatusIcon from "./deploymentstatusicon";
import DockerImageName from "./dockerimagename";

interface BranchesRouteParams {
    project_id: string;
}

const useStyles = makeStyles((theme)=> {

});

const BranchesComponent:React.FC<RouteComponentProps<BranchesRouteParams>> = (props) => {
    const [knownBranches, setKnownBranches] = useState<GitlabBranch[]>([]);
    const [currentDeployment, setCurrentDeployment] = useState<DeployedImageInfo|undefined>(undefined);

    const [loading, setLoading] = useState(false);

    const classes = useStyles();

    const refreshBranches = async () => {
        setLoading(true);
        const project_id = props.match.params.project_id;
        try {
            const response = await axios.get<GitlabBranch[]>(`/api/project/${project_id}/branches`);
            setKnownBranches(response.data);
            setLoading(false);
        } catch(err) {
            console.error(err);
            SystemNotification.open(SystemNotifcationKind.Error, "Could not load branch information")
            setLoading(false);
        }
    }

    const refreshCurrentDeployment = async ()=> {
        setLoading(true);
        const project_id = props.match.params.project_id;
        try {
            const response = await axios.get<DeployedImageInfo[]>(`/api/project/${project_id}/deployment`);
            setLoading(false);

            if(response.data.length==0) {
                SystemNotification.open(SystemNotifcationKind.Warning, "There are no deployments for this project id")
            } else if(response.data.length==1) {
                setCurrentDeployment(response.data[0]);
            } else {
                SystemNotification.open(SystemNotifcationKind.Warning, `There are ${response.data.length-1} other deployments associated with this project`);
                setCurrentDeployment(response.data[0]);
            }
        } catch(err) {
            console.error(err);
            SystemNotification.open(SystemNotifcationKind.Error, "Could not load current deployment information")
            setLoading(false);

        }
    }
    return (
        <>
            <Grid container className={classes.banner} direction="row">
                <Grid item>
                    <Typography variant="h4">{currentDeployment?.deploymentName ?? ""}</Typography>
                    <Typography>
                        {currentDeployment?.readyReplicas} ready and {currentDeployment?.notReadyReplicas} not ready
                        {currentDeployment?.readyReplicas && currentDeployment?.notReadyReplicas ? (
                            <DeploymentStatusIcon
                                availableReplicas={currentDeployment?.readyReplicas}
                                notAvailableReplicas={currentDeployment?.notReadyReplicas}
                            />
                        ) : null}
                    </Typography>
                </Grid>
                <Grid item>
                { currentDeployment ? Object.keys(currentDeployment.labels).map((labelName) => (
                    <Chip
                        key={labelName}
                        label={`${labelName}: ${currentDeployment.labels[labelName]}`}
                        className={classes.deploymentLabel}
                    />
                )) : null }
                </Grid>
                <Grid>
                    <ul>
                        {currentDeployment ? currentDeployment.deployedImages.map((imageInfo, idx) => (
                            <li>
                                <DockerImageName key={idx} image={imageInfo} />
                            </li>
                        )) : null}
                    </ul>
                </Grid>
            </Grid>
            <Grid container
                  alignItems="center"
                  style={{ marginRight: "1em" }}>

                {
                    knownBranches.map((branch, idx)=><Grid item>
                    </Grid>)
                }
            </Grid>
        </>
    )
}

export default BranchesComponent;