import React from "react";
import { render } from "react-dom";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  Theme,
  CssBaseline,
} from "@material-ui/core";
import {
  AppSwitcher,
  Header,
  JwtDataShape,
  OAuthContextData,
  OAuthContextProvider,
  SystemNotification,
  UserContextProvider,
  verifyExistingLogin,
} from "@guardian/pluto-headers";
import MainPage from "./mainpage";
import axios from "axios";
import BranchesComponent from "./BranchesComponent";

interface RootProps {}
interface RootState {
  userProfile?: JwtDataShape;
}

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

    this.theme = createTheme({
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

    this.state = {
      userProfile: undefined,
    };

    this.oAuthConfigLoaded = this.oAuthConfigLoaded.bind(this);
  }

  haveToken() {
    return window.localStorage.getItem("pluto:access-token");
  }

  oAuthConfigLoaded(oAuthConfig: OAuthContextData) {
    //if we already have a user token at mount, verify it and update our internal state
    //if we don't, ignore for the time being; it will be set dynamically when the login occurs
    console.log("loaded oauthconfig: ", oAuthConfig);
    if (this.haveToken()) {
      verifyExistingLogin(oAuthConfig)
        .then((profile) => this.setState({ userProfile: profile }))
        .catch((err) => {
          console.error("Could not verify existing user profile: ", err);
        });
    }
  }

  render() {
    return (
      <OAuthContextProvider onLoaded={this.oAuthConfigLoaded}>
        <UserContextProvider
          value={{
            profile: this.state.userProfile,
            updateProfile: (newValue) =>
              this.setState({ userProfile: newValue }),
          }}
        >
          <ThemeProvider theme={this.theme}>
            <CssBaseline />
            <Header />
            <AppSwitcher />
            <Switch>
              <Route
                path="/:deployment_name/branches"
                component={BranchesComponent}
              />
              <Route exact path="/" component={MainPage} />
            </Switch>
            <SystemNotification />
          </ThemeProvider>
        </UserContextProvider>
      </OAuthContextProvider>
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
