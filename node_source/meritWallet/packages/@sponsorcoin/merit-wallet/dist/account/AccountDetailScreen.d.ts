import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { type AccountFormHost } from './form/useAccountForm';
import type { ProfileFormData } from './profileForm';
export interface AccountDetailHost {
    /** How a save is signed, who may edit whom, and how the picked avatar is processed. */
    form: AccountFormHost;
    /** May the wallet edit now (the web app: a wallet is connected or the keystore session is on). When false the table is read-only and offers the connect button. */
    connected: boolean;
    /** The wallet edits exactly the accounts this answers yes for (the extension: its vault's accounts); the account itself then signs. When given it replaces `connected` and `activeAddress`. */
    canEdit?(address: string): boolean;
    /** Called once after a save finishes, so the host can refresh its cached copy of the profile. */
    onSaved?(address: string, saved: ProfileFormData, avatarChanged: boolean): void;
    /** The connected account, if any (the signer of a save). */
    activeAddress?: string;
    /** A keystore session exists without a connected wallet (the web app's own keystore); the loaded selection is then kept when no address is set. */
    sessionWithoutConnection?: boolean;
    /** Reveal this account's private key; omitted = the row is not offered. With no password it may succeed from an approved cached one, else it throws PasswordRequiredError. */
    revealPrivateKey?(address: string, password?: string): Promise<string>;
    /** Which accounts may show the Private Key row (the ones this app holds keys for); omitted = all when revealPrivateKey exists. */
    canReveal?(address: string): boolean;
    /** Connect a wallet (the connect button shown while nothing is connected); omitted = no button. */
    connectWallet?(): void;
}
export type AccountDetailRole = SP_COIN_DISPLAY.ACTIVE_ACCOUNT | SP_COIN_DISPLAY.SPONSOR_ACCOUNT | SP_COIN_DISPLAY.RECIPIENT_ACCOUNT | SP_COIN_DISPLAY.AGENT_ACCOUNT;
/** The avatar and table flags of a role: each role has its own pair, so toggling one in the panel tree does not affect the others. */
export declare function flagsForRole(role: AccountDetailRole | undefined): [SP_COIN_DISPLAY, SP_COIN_DISPLAY];
export default function AccountDetailScreen({ account, role, host }: {
    account: spCoinAccount | undefined;
    role?: AccountDetailRole;
    host: AccountDetailHost;
}): React.JSX.Element | null;
