import { AuthProvider, AuthProviderProps, useAuth } from "react-oidc-context";
import { BrowserRouter, NavLink, Route, Routes } from "react-router";
import Audi from "./assets/audi.svg";
import { Button, CircularProgress, Typography } from "@mui/material";
import HomeIcon from '@mui/icons-material/Home';
import { getOidcConfig, OidcConfig } from "@lichtblick/suite-base/util/auth";
import { Ros } from "@lichtblick/roslibjs";

export function AuthWrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const [oidcConfig, setOidcConfig] = React.useState<OidcConfig | null>(null);

    React.useEffect(() => {
        getOidcConfig().then(setOidcConfig);
    }, []);

    if (!oidcConfig) {
        return (
            <></>
        );
    }

    const oidcConfigProps: AuthProviderProps = {
        ...oidcConfig,
        redirect_uri: window.location.origin + "/login",
        scope: "openid profile email",
        loadUserInfo: true,
        onSigninCallback: (user) => {
            const originalParams = user?.state || "";
            const newUrl = window.location.origin + originalParams;
            window.location.replace(newUrl);
        },
    };

    return (
        <AuthProvider {...oidcConfigProps}>
            <AuthRouter>
                {children}
            </AuthRouter>
        </AuthProvider>
    );
}

function AuthRouter({ children }: { children: React.ReactNode }): React.JSX.Element {
    const [rosApiDataSourceActive, setRosApiDataSourceActive] = React.useState(false);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setRosApiDataSourceActive(params.get("ds") === "ros-api");
    }, [window.location.search]);

    const auth = useAuth();

    return (
        <BrowserRouter>
            <Routes>
                <Route index element={children} />
                <Route path="/login" element={
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "75%",
                        }}
                    >
                        <Audi
                            style={{
                                zoom: 10,
                            }}
                        />

                        {auth.isLoading ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "24px",
                                }}
                            >
                                <CircularProgress />

                                <Typography variant="h1">
                                    Signing in...
                                </Typography>
                            </div>
                        ) : (
                            <>
                                {auth.error && (
                                    <div
                                        style={{
                                            marginBottom: "48px",
                                        }}
                                    >
                                        <Typography variant="h4" color="error">
                                            {auth.error?.message}
                                        </Typography>
                                    </div>
                                )}
                                {!auth.isAuthenticated && rosApiDataSourceActive && auth.signinRedirect({
                                    state: window.location.search
                                })}
                                <NavLink to="/">
                                    <Button variant="outlined" startIcon={<HomeIcon />}>
                                        Home
                                    </Button>
                                </NavLink>
                            </>
                        )}
                    </div>
                } />
            </Routes>
        </BrowserRouter>
    );
}
