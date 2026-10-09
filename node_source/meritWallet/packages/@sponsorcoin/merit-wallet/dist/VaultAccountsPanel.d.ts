import React from 'react';
export interface VaultAccountRow {
    address: string;
    name: string;
    source: 'generated' | 'imported';
    /** Made from a published development key: usable only on the local test chain. */
    devOrigin: boolean;
}
export interface VaultAccountsApi {
    list(): Promise<{
        accounts: VaultAccountRow[];
        active?: string;
    }>;
    setActive(address: string): Promise<void>;
    addDerived(name?: string): Promise<void>;
    importPrivateKey(privateKey: string, name?: string): Promise<void>;
    rename(address: string, name: string): Promise<void>;
    remove(address: string): Promise<void>;
    /** Throws (a message the user can read) for a wrong password. */
    exportPrivateKey(password: string, address: string): Promise<string>;
    revealMnemonic(password: string): Promise<string>;
}
export interface VaultAccountsPanelProps {
    api: VaultAccountsApi;
    /** Called after the active account changes, so the host can refresh what depends on it. */
    onActiveChanged?: (address: string) => void;
}
export default function VaultAccountsPanel({ api, onActiveChanged }: VaultAccountsPanelProps): React.JSX.Element;
