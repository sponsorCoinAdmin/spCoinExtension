export declare const MERIT_RDNS = "org.sponsorcoin.merit";
export interface Eip1193Provider {
    request(args: {
        method: string;
        params?: unknown;
    }): Promise<unknown>;
    on?(event: string, listener: (...args: unknown[]) => void): unknown;
    removeListener?(event: string, listener: (...args: unknown[]) => void): unknown;
}
export interface Eip6963Detail {
    info: {
        uuid: string;
        name: string;
        icon: string;
        rdns: string;
    };
    provider: Eip1193Provider;
}
/** Minimal window surface used for discovery (a real window, or a stand-in in tests). */
export interface DiscoveryWindow {
    addEventListener(type: string, listener: (event: Event) => void): void;
    removeEventListener(type: string, listener: (event: Event) => void): void;
    dispatchEvent(event: Event): boolean;
}
/** Ask every wallet on the page to announce itself and collect the answers for `timeoutMs`. */
export declare function discoverWallets(win: DiscoveryWindow, timeoutMs?: number): Promise<Eip6963Detail[]>;
/** The Merit Wallet extension's provider, or null when it is not installed. */
export declare function findMeritWallet(win: DiscoveryWindow, timeoutMs?: number): Promise<Eip6963Detail | null>;
export interface InjectedWalletApi {
    /** Ask the user to connect this site; resolves with the accounts (the first is the active one). */
    connect(): Promise<string[]>;
    /** Accounts this site may already see (no prompt). */
    accounts(): Promise<string[]>;
    chainId(): Promise<number>;
    switchChain(chainId: number): Promise<void>;
    /** personal_sign: text in, signature out, after the user approves in the wallet. */
    signMessage(address: string, message: string): Promise<string>;
    /** Wei as a bigint; resolves with the transaction hash after the user approves in the wallet. */
    sendTransaction(tx: {
        from: string;
        to?: string;
        value?: bigint;
        data?: string;
    }): Promise<string>;
    onAccountsChanged(listener: (accounts: string[]) => void): () => void;
    onChainChanged(listener: (chainId: number) => void): () => void;
}
export declare function createInjectedWalletApi(provider: Eip1193Provider): InjectedWalletApi;
