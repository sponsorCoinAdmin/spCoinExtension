export interface LastConnectedWalletStorage {
    read: (key: string) => string | null;
    write: (key: string, value: string | undefined) => void;
}
/** The wagmi-connected wallet address observed at the end of the previous session,
 *  used to tell "same wallet reconnecting after a refresh" apart from "a different
 *  wallet/account just connected" — only the latter should override a manually
 *  selected accounts.activeAccount. */
export declare function getLastConnectedWalletAddress(storage?: LastConnectedWalletStorage): string | undefined;
export declare function setLastConnectedWalletAddress(address: string | undefined, storage?: LastConnectedWalletStorage): void;
export declare function isSameConnectedWallet(a: string | undefined, b: string | undefined): boolean;
