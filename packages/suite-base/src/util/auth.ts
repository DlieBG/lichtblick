import { User } from "oidc-client-ts";

let oidcConfig: OidcConfig | null = null;

export interface OidcConfig {
    authority: string;
    client_id: string;
}

export function getOidcConfig(): Promise<OidcConfig> {
    return fetch("/oidc-config.json")
        .then((response) => response.json())
        .then((config) => {
            oidcConfig = config;
            return config;
        });
}

export function getUser(): User | null {
    if (!oidcConfig) {
        return null;
    }

    const oidcStorage = sessionStorage.getItem(`oidc.user::${oidcConfig.authority}/${oidcConfig.client_id}`);
    if (!oidcStorage) {
        return null;
    }

    return User.fromStorageString(oidcStorage);

}
