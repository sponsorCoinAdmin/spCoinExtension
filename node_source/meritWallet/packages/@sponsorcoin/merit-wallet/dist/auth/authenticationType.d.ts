export declare enum AuthenticationType {
    KEYSTORE = "KEYSTORE",
    VAULT = "VAULT"
}
/** Words for the screens: where this wallet's keys are kept. */
export declare function authenticationTypeLabel(type: AuthenticationType | undefined): string;
