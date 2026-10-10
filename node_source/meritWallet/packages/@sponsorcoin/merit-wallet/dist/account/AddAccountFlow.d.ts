import React from 'react';
export type AddAccountEntry = 'importWallet' | 'importAccount' | 'createAccount' | 'connectMetaMask' | 'connectHardware';
export interface AddAccountHost {
    /** Create a new account under this host's approver (the extension: derive the next account from its recovery phrase). Throw a readable message on failure. */
    createAccount(): Promise<void>;
    /** Import one account from a private key into this host's approver. Throw a readable message on failure (wrong format is checked here first). */
    importAccount(privateKey: string): Promise<void>;
    /** Entries this host cannot offer, each with the reason shown on the disabled row. */
    unavailable?: Partial<Record<AddAccountEntry, string>>;
}
export default function AddAccountFlow({ host, onDone }: {
    host: AddAccountHost;
    onDone(): void;
}): React.JSX.Element;
