import type { Wallet } from '../wallet/wallet';
/** What removing an account says and does (the confirm dialog's words, and the call). */
export interface AccountRemoval {
    /** The button's words ("Remove from Merit"). */
    label: string;
    /** Red (true) when the removal destroys something, as deleting a local account does; neutral blue when it only drops access that can be given again (another wallet's account). */
    destructive: boolean;
    /** Set when the button is shown but cannot be used; says why. */
    disabledReason?: string;
    title: string;
    message: string;
    confirmLabel: string;
    /** Remove the account; rejects with a readable message when the wallet cannot. */
    remove(): Promise<void>;
}
export interface AccountSource {
    /** The wallet that holds the account when it is not this app's own ("MetaMask", "Merit (Ext)"): the Private Key row says so. */
    heldBy?: string;
    /** 2026-11-08 (owner): the screen's title names the wallet and whether the account is its own: "MetaMask Remote Account Details", "Merit Local Account Details". */
    title: string;
    removal?: AccountRemoval;
}
/**
 * 2026-11-08 (owner): the SAME address can sit in two groups (the local Merit account and MetaMask's copy of it). `groupId` is the group of the row the person opened; it
 * decides which of the wallets holding the address the screen is about. Omitted (the header icon): the local account wins, as before.
 */
export declare function resolveAccountSource(wallet: Wallet, address: string, activeAddress: string | undefined, groupId?: string, symbol?: string): Promise<AccountSource | undefined>;
