export declare enum MeritWalletType {
    EXT = "EXT",
    WEB_APP = "WEB_APP",
    DEV = "DEV",
    WEB = "WEB",
    ANDROID = "ANDROID",
    IPHONE = "IPHONE"
}
/** The type as it reads on screen: WEB_APP -> "WEB APP". */
export declare function walletTypeLabel(type: MeritWalletType): string;
/** The title of the Config tab: "Merit (DEV) Config"; a host that passes no type gets "Merit Config". */
export declare function configTitle(type: MeritWalletType | undefined): string;
