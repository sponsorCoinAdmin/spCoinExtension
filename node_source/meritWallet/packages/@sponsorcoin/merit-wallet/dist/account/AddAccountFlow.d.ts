import React from 'react';
import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet } from '../wallet/wallet';
export type AddAccountEntry = 'importWallet' | 'importAccount' | 'createAccount' | 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';
/** The entries that connect an account an approver already holds (rather than adding keys here). */
export type ConnectApproverEntry = 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';
export interface AddAccountHost {
    /** Create a new account under this host's approver (the extension: derive the next account from its recovery phrase). Throw a readable message on failure. */
    createAccount(targetId?: AuthenticatorId): Promise<void>;
    /** Import one account from a private key into this host's approver. Throw a readable message on failure (wrong format is checked here first). */
    importAccount(privateKey: string, targetId?: AuthenticatorId): Promise<void>;
    /** Import a whole wallet (another Secret Recovery Phrase) into this host's approver; its first account is added. Throw a readable message on failure. A host that omits it shows the entry disabled. */
    importWallet?(mnemonic: string, targetId?: AuthenticatorId): Promise<void>;
    /**
     * 2026-10-12 (docs/connectionDesign.txt items 4 / 7 / 8, authenticationDesign row 9): connect an account that another approver holds (MetaMask, the Merit extension, a hardware wallet): ask the approver, make the account active.
     * Throw a readable message on failure. A host that omits it shows those rows disabled with the reason below (the same entries and words in every host).
     */
    connectApprover?(entry: ConnectApproverEntry): Promise<void>;
    /**
     * 2026-10-13 (docs/connectionDesign.txt item 12): the hardware wallets this host offers (Ledger, Trezor, ...). When given, "Connect a hardware wallet" opens a screen with one row per device and the chosen device is connected with connectHardwareDevice (the same flow for every device);
     * a host that omits them keeps the single connectApprover('connectHardware') row.
     */
    hardwareDevices?: Array<{
        id: string;
        title: string;
        subtitle?: string;
        unavailable?: string;
    }>;
    connectHardwareDevice?(id: string): Promise<void>;
    /** The wallets this host can really add keys to (it routes createAccount / importAccount by the target id). Omitted: every reachable wallet that keeps keys. */
    targets?: readonly AuthenticatorId[];
    /** Entries this host cannot offer, each with the reason shown on the disabled row. */
    unavailable?: Partial<Record<AddAccountEntry, string>>;
}
/** What a disabled connect row says when the host gave no reason of its own. */
export declare const DEFAULT_CONNECT_UNAVAILABLE: Record<ConnectApproverEntry, string>;
export default function AddAccountFlow({ host, onDone, wallet, activeAddress }: {
    host: AddAccountHost;
    onDone(): void;
    wallet?: Wallet;
    activeAddress?: string;
}): React.JSX.Element;
