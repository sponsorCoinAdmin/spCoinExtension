import React from 'react';
import type { BrowserWallet } from './createBrowserWallet';
import { type MeritPlatform } from '@sponsorcoin/merit-wallet';
import { type MeritWebInjectables } from './injectables';
export interface MountMeritWebOptions {
    element: HTMLElement;
    core: BrowserWallet;
    snapshot: Record<string, unknown>;
    /** 2026-11-25: everything the host injects, in the one shape both mounts take (wallet type, settings, host functions: copyText, openUrl, close). The options below, when given, win over it. */
    injectables?: MeritWebInjectables;
    /** the Merit type the host wants shown (EXT, WEB_APP, WEB, ANDROID, IPHONE). Omitted or unknown: WEB. */
    walletType?: string;
    /** platform behavior the host replaces (for example copy and open-link through a parent page), layered over the browser's own. Omitted: the browser's own. */
    platform?: Partial<MeritPlatform>;
    /** what the wallet's close button does. Omitted: nothing. */
    onClose?: () => void;
    /** test-only sections a test page may inject (Test Accounts, Test Sites). The package has none of its own: a release page passes nothing. */
    configTestAccountsContent?: React.ReactNode;
    configTestSitesContent?: React.ReactNode;
}
export declare function mountMeritWeb({ element, core, snapshot, injectables, walletType, platform, onClose, configTestAccountsContent, configTestSitesContent }: MountMeritWebOptions): void;
