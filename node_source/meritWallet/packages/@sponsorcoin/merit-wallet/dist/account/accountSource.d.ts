import type { Wallet } from '../wallet/wallet';
import type { MessagePanelAcknowledgement } from '../panels/MessagePanelReal';
/** What removing an account says and does (the confirm dialog's words, and the call). */
export interface AccountRemoval {
    /** The button's words ("Remove from Merit"). */
    label: string;
    /** Red (true) when the removal destroys something, as deleting a local account does; neutral blue when it only drops access that can be given again (another wallet's account). */
    destructive: boolean;
    /** Set when the button is shown but cannot be used; says why. */
    disabledReason?: string;
    title: string;
    /** 2026-11-11 (owner): the one-line heading the wallet's title bar shows over the confirmation ("Remove Merit (Web App) Local Account"). */
    panelTitle: string;
    message: string;
    confirmLabel: string;
    /** 2026-11-10 (row 9): the notice shown in MESSAGE_PANEL once the account is removed ("Removed HH_BASE_9 from Merit (Web App)"). */
    doneMessage: string;
    /** A LOCAL account (its key is kept by this app): the dialog asks for the wallet password, passes it to remove(), and can show the key first (revealKey, which asks the vault again). Absent for another wallet's account. */
    local?: {
        acknowledgements?: MessagePanelAcknowledgement[];
        revealKey?(password: string): Promise<string>; /** Plan row 13: the key as an encrypted file (locked with the wallet password) to save before removing. */
        exportKey?(password: string): Promise<{
            name: string;
            content: string;
        }>;
    };
    /** Remove the account; rejects with a readable message when the wallet cannot. A local account gets the wallet password. */
    remove(password?: string): Promise<void>;
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
