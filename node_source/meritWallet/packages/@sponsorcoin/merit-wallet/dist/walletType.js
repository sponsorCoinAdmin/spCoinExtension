// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/walletType.ts
//
// 2026-11-24 (owner: docs/design/meritWalletDesign.txt): the type of this Merit Wallet. There is ONE wallet; a type is the set of injections its host supplies. The host passes its type in (host contract, layout section); the wallet only SHOWS it (the Config title, later the build line of the debug dump) and never branches on it.
export var MeritWalletType;
(function (MeritWalletType) {
    MeritWalletType["EXT"] = "EXT";
    MeritWalletType["WEB_APP"] = "WEB_APP";
    MeritWalletType["DEV"] = "DEV";
    MeritWalletType["WEB"] = "WEB";
    MeritWalletType["ANDROID"] = "ANDROID";
    MeritWalletType["IPHONE"] = "IPHONE";
})(MeritWalletType || (MeritWalletType = {}));
/** The type as it reads on screen: WEB_APP -> "WEB APP". */
export function walletTypeLabel(type) {
    return type.replace(/_/g, ' ');
}
/** The title of the Config tab: "Merit (DEV) Config"; a host that passes no type gets "Merit Config". */
export function configTitle(type) {
    return type ? `Merit (${walletTypeLabel(type)}) Config` : 'Merit Config';
}
