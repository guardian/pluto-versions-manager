import React, {useState} from "react";
import {RouteComponentProps} from "react-router";
import {OpenInBrowser} from "@material-ui/icons";
import {Snackbar, SnackbarContent} from "@material-ui/core";
import MuiAlert, {AlertProps, Color} from '@material-ui/lab/Alert';

/**
 * these values correspond to the material-ui palette labels, so are safe to use below with
 * `severity={SystemNotificationKind.toString() as Color}`
 */
export enum SystemNotifcationKind {
    Success = "success",
    Error = "error",
    Info = "info",
    Warning= "warning"
}

type OpenFunc = (kind:SystemNotifcationKind, message:string) => void;

let openSystemNotification:OpenFunc;    //allows us to access the `openSystemNotification` function from outside the component definition

function Alert(props:AlertProps) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const SystemNotification:React.FC<{}> & {open:OpenFunc} = ()=>{
    const autoHideDuration = 4000;

    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [kind, setKind] = useState<SystemNotifcationKind>(SystemNotifcationKind.Info);

    const close = ()=>{
        setOpen(false);
    }

    openSystemNotification = (kind:SystemNotifcationKind, message:string) => {
        setKind(kind);
        setMessage(message);
        setOpen(true);
    }

    return (
        <Snackbar open={open} autoHideDuration={autoHideDuration} onClose={close}
                  anchorOrigin={{vertical: "top", horizontal: "right"}}
                  >
            <Alert severity={kind.toString() as Color}>{message}</Alert>
        </Snackbar>
    )
}

SystemNotification.open = (kind:SystemNotifcationKind, message:string) => openSystemNotification(kind, message);

export default SystemNotification;