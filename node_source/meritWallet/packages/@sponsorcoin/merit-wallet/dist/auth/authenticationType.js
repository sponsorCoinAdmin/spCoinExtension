// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/auth/authenticationType.ts
//
// 2026-10-08 (docs/authenticationDesign.txt) -- how a Merit Wallet authenticates LOCALLY, set once by the host that mounts it:
//   KEYSTORE  the web app: keys sit in the server keystore (resources/data/meritWallet/keystore.json), signed through the meritConnect routes.
//   VAULT     the extension: keys sit in the encrypted vault in the background worker.
// The wallet reads it wherever it needs to know which local authenticator it has (for example the Config tab's Test Accounts section). It describes
// the wallet's OWN authenticator; the design's per-account "active authenticator" can still be a remote one (the extension, MetaMask, a hardware
// wallet), and those get their own values when they are built.
export var AuthenticationType;
(function (AuthenticationType) {
    AuthenticationType["KEYSTORE"] = "KEYSTORE";
    AuthenticationType["VAULT"] = "VAULT";
})(AuthenticationType || (AuthenticationType = {}));
/** Words for the screens: where this wallet's keys are kept. */
export function authenticationTypeLabel(type) {
    switch (type) {
        case AuthenticationType.KEYSTORE:
            return 'keystore';
        case AuthenticationType.VAULT:
            return 'vault';
        default:
            return 'wallet';
    }
}
