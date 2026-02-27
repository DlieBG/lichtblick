import { AuthProvider, AuthProviderProps, useAuth } from "react-oidc-context";
import { BrowserRouter, NavLink, Route, Routes } from "react-router";
import Audi from "./assets/audi.svg";
import { Button, CircularProgress, Typography } from "@mui/material";
import HomeIcon from '@mui/icons-material/Home';

export function AuthWrapper({ children }: { children: React.ReactNode }): React.JSX.Element {

    const oidcConfig: AuthProviderProps = {
        authority: "https://sso.bschwering.de/application/o/lichtblick-dev/",
        client_id: "oWrQ5Mc2Oj3Ex2bDGmO3EzadBGSeK3NyTAZsleAo",
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
        <AuthProvider {...oidcConfig}>
            <AuthRouter>
                {children}
            </AuthRouter>
        </AuthProvider>
    );
}

function AuthRouter({ children }: { children: React.ReactNode }): React.JSX.Element {
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
