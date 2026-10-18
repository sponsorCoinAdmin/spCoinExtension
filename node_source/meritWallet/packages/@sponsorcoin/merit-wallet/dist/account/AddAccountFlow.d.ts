import React from 'react';
import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet } from '../wallet/wallet';
export type AddAccountEntry = 'importWallet' | 'importAccount' | 'createAccount' | 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';
/** The entries that connect an account an approver already holds (rather than adding keys here). */
export type ConnectApproverEntry = 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';
/** The public profile typed on the Create Account screen (a host that sets createProfile). Blank fields are left to the host's own defaults. */
export interface NewAccountProfile {
    name: string;
    symbol: string;
    description: string;
    /** The picked avatar image, if any. */
    logo: File | null;
}
export interface AddAccountHost {
    /** Create a new account under this host's approver (the extension: derive the next account from its recovery phrase). Throw a readable message on failure. `profile` is given only when the host asked for the profile form (createProfile). */
    createAccount(targetId?: AuthenticatorId, profile?: NewAccountProfile): Promise<void>;
    /** Show the name / symbol / description / avatar form on the Create Account screen and pass what was typed to createAccount. Omitted: the screen is a single Create Account button. */
    createProfile?: boolean;
    /** Import one account from a private key into this host's approver. Throw a readable message on failure (wrong format is checked here first). */
    importAccount(privateKey: string, targetId?: AuthenticatorId): Promise<void>;
    /** Import a whole wallet (another Secret Recovery Phrase) into this host's approver; its first account is added. Throw a readable message on failure. A host that omits it shows the entry disabled. */
    importWallet?(mnemonic: string, targetId?: AuthenticatorId): Promise<void>;
    /**
     * 2026-10-12 (docs/design/accountAuthDesign.txt section 17 items 4 / 7 / 8, accountAuthDesign row 9): connect an account that another approver holds (MetaMask, the Merit extension, a hardware wallet): ask the approver, make the account active.
     * Throw a readable message on failure. A host that omits it shows those rows disabled with the reason below (the same entries and words in every host).
     */
    connectApprover?(entry: ConnectApproverEntry): Promise<void>;
    /**
     * 2026-10-13 (docs/design/accountAuthDesign.txt section 17 item 12): the hardware wallets this host offers (Ledger, Trezor, ...). When given, "Connect a hardware wallet" opens a screen with one row per device and the chosen device is connected with connectHardwareDevice (the same flow for every device);
     * a host that omits them keeps the single connectApprover('connectHardware') row.
     */
    hardwareDevices?: {
        id: string;
        title: string;
        subtitle?: string;
        unavailable?: string;
    }[];
    connectHardwareDevice?(id: string): Promise<void>;
    /** Stop a connect that is still waiting (the Cancel button of the connect screen): tell the other wallet to drop its request. The flow itself stops waiting either way. */
    cancelConnect?(entry: ConnectApproverEntry): void;
    /** Bring the other wallet's own window forward (the connect screen's button after a long wait). Called from a click. */
    bringWalletForward?(entry: ConnectApproverEntry): void;
    /** The wallets this host can really add keys to (it routes createAccount / importAccount by the target id). Omitted: every reachable wallet that keeps keys. */
    targets?: readonly AuthenticatorId[];
    /**
     * Entries this host performs itself for the wallets in `targets`, whatever that wallet's vault flags say (the web app's dev keystore has no vault importKey / importPhrase: its Add flow writes the key to the server keystore directly).
     * For such an entry the "<wallet> cannot ..." reason taken from the wallet's features is not shown; the host's own `unavailable` reasons still are.
     */
    performs?: readonly AddAccountEntry[];
    /** Entries this host cannot offer, each with the reason shown on the disabled row. */
    unavailable?: Partial<Record<AddAccountEntry, string>>;
}
/** What a disabled connect row says when the host gave no reason of its own. */
export declare const DEFAULT_CONNECT_UNAVAILABLE: Record<ConnectApproverEntry, string>;
/** The connect screen says it is still waiting after this long (the wallet is probably locked); the host owns the hard limit. */
export declare const CONNECT_SOFT_WAIT_MS = 60000;
export default function AddAccountFlow({ host, onDone, wallet, activeAddress, nativeWalletId, walletConnection, onDisconnectWallet }: {
    host: AddAccountHost;
    onDone(): void;
    wallet?: Wallet;
    activeAddress?: string;
    nativeWalletId?: string;
    walletConnection?: Record<string, boolean>;
    onDisconnectWallet?(slug: string): void;
}): React.JSX.Element;
