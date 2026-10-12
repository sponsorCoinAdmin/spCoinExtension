import React from 'react';
export type AddAccountEntry = 'importWallet' | 'importAccount' | 'createAccount' | 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';
/** The entries that connect an account an approver already holds (rather than adding keys here). */
export type ConnectApproverEntry = 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';
export interface AddAccountHost {
    /** Create a new account under this host's approver (the extension: derive the next account from its recovery phrase). Throw a readable message on failure. */
    createAccount(): Promise<void>;
    /** Import one account from a private key into this host's approver. Throw a readable message on failure (wrong format is checked here first). */
    importAccount(privateKey: string): Promise<void>;
    /**
     * 2026-10-12 (docs/connectionDesign.txt items 4 / 7 / 8, authenticationDesign row 9): connect an account that another approver holds (MetaMask, the Merit extension, a hardware wallet): ask the approver, make the account active.
     * Throw a readable message on failure. A host that omits it shows those rows disabled with the reason below (the same entries and words in every host).
     */
    connectApprover?(entry: ConnectApproverEntry): Promise<void>;
    /** Entries this host cannot offer, each with the reason shown on the disabled row. */
    unavailable?: Partial<Record<AddAccountEntry, string>>;
}
/** What a disabled connect row says when the host gave no reason of its own. */
export declare const DEFAULT_CONNECT_UNAVAILABLE: Record<ConnectApproverEntry, string>;
export default function AddAccountFlow({ host, onDone }: {
    host: AddAccountHost;
    onDone(): void;
}): React.JSX.Element;
