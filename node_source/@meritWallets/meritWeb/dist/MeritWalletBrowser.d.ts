import React from 'react';
import { MeritWalletType, type MeritPlatform, type SecuritySetupHost } from '@sponsorcoin/merit-wallet';
import { type BrowserDataSnapshot } from './registerBrowserData';
import { type BrowserChain, type BrowserWallet, type BrowserWalletOptions } from './createBrowserWallet';
export interface MeritWalletBrowserProps extends Omit<BrowserWalletOptions, 'chains'> {
    /** The chains the wallet works on. Ignored when `core` is given. */
    chains?: readonly BrowserChain[];
    /** The static data snapshot (the shared data package's bundledFeedData.json): networks, token lists, account lists. Without it the wallet has no network or token lists to show. */
    data?: BrowserDataSnapshot;
    /** The image on the login and setup screens. Default: the Merit login art under /assets/miscellaneous (the data package's assets folder, served by the page like every other image the wallet asks for). */
    brandLogoSrc?: string;
    /** The Config tab's Test Accounts section, built by the page (it comes from @meritWallets/meritDevSite, which never ships in a release). Omitted: no section. */
    configTestAccountsContent?: React.ReactNode;
    /** 2026-11-24 (owner): the Config tab's Test Sites section (test code from @meritWallets/meritDevSite). Omitted in a release. */
    configTestSitesContent?: React.ReactNode;
    /** A wallet the page already created (to share one wallet between several mounts). Omitted: one is created for this mount. */
    core?: BrowserWallet;
    onClose: () => void;
    docked?: boolean;
    /** 2026-11-24 (owner): the type shown in the Config title. Always WEB for this package (the public wallet and the dev app are both WEB). */
    walletType?: MeritWalletType;
    /** 2026-11-24 (owner: the iframe wallet): the device actions (copy, open an address...). Omitted: the DOM implementation, as before. A framed wallet passes one that asks its parent. */
    platform?: MeritPlatform;
    /** 2026-11-26 (owner): the sign-in options (Use password, passkey, authenticator app) the Config tab's one Wallet Security section shows, the same as the web app's. Omitted: this package makes one over this browser's local storage and passkeys. */
    securitySetup?: SecuritySetupHost;
    /** 2026-11-19: fill the width of the container the page puts the wallet in (a phone, a popup, a frame) instead of the wallet's own fixed width. */
    fullWidth?: boolean;
}
export default function MeritWalletBrowser({ chains, core: given, onClose, walletType, platform, securitySetup: givenSecuritySetup, docked, fullWidth, brandLogoSrc, configTestAccountsContent, configTestSitesContent, data: snapshot, namespace, storage, sessionStore, autoLockMs }: MeritWalletBrowserProps): React.FunctionComponentElement<import("./BrowserProviders").BrowserProvidersProps> | null;
