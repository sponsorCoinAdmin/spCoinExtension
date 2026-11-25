declare const TYPES: readonly ["EXT", "WEB_APP", "WEB", "ANDROID", "IPHONE"];
export type MeritWebType = (typeof TYPES)[number];
export declare function resolveWalletType(injected: string | undefined): MeritWebType;
export {};
