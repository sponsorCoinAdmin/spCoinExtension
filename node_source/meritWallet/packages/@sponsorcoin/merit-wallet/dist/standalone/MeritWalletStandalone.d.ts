import React from 'react';
import { type StandaloneDataSnapshot } from './registerStandaloneData';
import { type StandaloneChain, type StandaloneWallet, type StandaloneWalletOptions } from './createStandaloneWallet';
export interface MeritWalletStandaloneProps extends Omit<StandaloneWalletOptions, 'chains'> {
    /** The chains the wallet works on. Ignored when `core` is given. */
    chains?: readonly StandaloneChain[];
    /** The static data snapshot (the shared data package's bundledFeedData.json): networks, token lists, account lists. Without it the wallet has no network or token lists to show. */
    data?: StandaloneDataSnapshot;
    /** The image on the login and setup screens. Default: the Merit login art under /assets/miscellaneous (the data package's assets folder, served by the page like every other image the wallet asks for). */
    brandLogoSrc?: string;
    /** Show the Config tab's Test Accounts section (load Hardhat's published test accounts into this wallet). Default false: those keys are public, so only a development page turns it on. */
    testAccounts?: boolean;
    /** A wallet the page already created (to share one wallet between several mounts). Omitted: one is created for this mount. */
    core?: StandaloneWallet;
    onClose: () => void;
    docked?: boolean;
}
export default function MeritWalletStandalone({ chains, core: given, onClose, docked, brandLogoSrc, testAccounts, data: snapshot, namespace, storage, sessionStore, autoLockMs }: MeritWalletStandaloneProps): React.FunctionComponentElement<import("./StandaloneProviders").StandaloneProvidersProps> | null;
