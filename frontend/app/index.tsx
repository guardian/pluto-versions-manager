import React from "react";
import { render } from "react-dom";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import {
  ThemeProvider,
  createMuiTheme,
  Theme,
  CssBaseline,
} from "@material-ui/core";
import { AppSwitcher, Header } from "pluto-headers";
import MainPage from "./mainpage";
import SystemNotification from "./system_notification";
import axios from "axios";

interface RootProps {}
interface RootState {}

axios.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("pluto:access-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log(`interceptor: token is ${token}, url is ${config.url}`);

  // this is set in the index.scala.html template file and gives us the value of deployment-root from the server config
  // Only apply deployment root when url begins with /api
  if (config.url && config.url.startsWith("/api")) {
    config.baseURL = deploymentRootPath;
  }

  return config;
});

class App extends React.Component<RootProps, RootState> {
  theme: Theme;

  constructor(props: RootProps) {
    super(props);

    this.theme = createMuiTheme({
      typography: {
        fontFamily: [
          "sans-serif",
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ].join(","),
      },
      palette: {
        type: "dark",
      },
    });
  }

  render() {
    return (
      <ThemeProvider theme={this.theme}>
        <CssBaseline />
        <Header />
        <AppSwitcher />
        <Switch>
          <Route exact path="/" component={MainPage} />
        </Switch>
      </ThemeProvider>
    );
  }
}

//this is a global which is imported from the server-rendered html template
declare const deploymentRootPath: string;

render(
  <BrowserRouter basename={deploymentRootPath}>
    <App />
  </BrowserRouter>,
  document.getElementById("app")
);
