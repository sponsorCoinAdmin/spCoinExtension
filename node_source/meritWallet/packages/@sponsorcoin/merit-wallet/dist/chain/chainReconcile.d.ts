export interface ChainReconcileInput {
    /** wagmi has finished its handshake; until then nothing is trusted. */
    wagmiReady: boolean;
    walletConnected: boolean;
    walletStatus: string | undefined;
    /** The chain the wallet reports; absent or 0 until wagmi surfaces it. */
    walletChainId: number | undefined;
    /** The chain the app has chosen; 0 when none. */
    appChainId: number;
    appConnected: boolean;
    /** The network record's own chain id and connected flag (what the rest of the app reads). */
    appNetworkChainId: number;
    appNetworkConnected: boolean;
    /** The stored session came from localStorage rather than a fresh boot. */
    hydratedFromLocalStorage: boolean;
}
export interface Ref<T> {
    current: T;
}
/** The memory between runs. The host owns it (React refs); this module reads and writes `.current`. */
export interface ChainReconcileRefs {
    adoptedOnFirstConnect: Ref<boolean>;
    trustedWalletOverStoredChainOnConnect: Ref<boolean>;
    prevWalletChainId: Ref<number | undefined>;
    prevAppChainId: Ref<number | undefined>;
    prevWalletConnected: Ref<boolean>;
    lastWalletDisconnectedLogKey: Ref<string | undefined>;
}
export type SwitchPhase = 'switch-wallet-on-connect' | 'switch-wallet-on-app-change';
export interface ChainReconcileHost {
    setAppConnected(connected: boolean): void;
    /** Mirror the wallet-active chain into the network record (0 and false when disconnected). */
    syncNetworkChainId(chainId: number, connected: boolean): void;
    /** Adopt a chain as the app's own choice. */
    setAppChainId(chainId: number): void;
    /** Ask the wallet to switch to the app's chain. Errors are the host's to handle. */
    switchWalletTo(chainId: number, phase: SwitchPhase, context: {
        walletChainId: number;
        prevWallet?: number;
        prevApp?: number;
    }): void;
    /** `traceWorthy` phases are the ones that change a chain or ask the wallet to switch. */
    log(phase: string, payload: Record<string, unknown>, traceWorthy: boolean): void;
}
export declare function reconcileChain(input: ChainReconcileInput, refs: ChainReconcileRefs, host: ChainReconcileHost): void;
export type WalletChainChangedDecision = {
    kind: 'ignore';
}
/** The wallet moved to a chain the app does not support: keep the app's own choice, mirror the wallet's chain into the network record, and show this message. */
 | {
    kind: 'unsupported';
    chainId: number;
    message: string;
}
/** The wallet moved to a supported chain: adopt it as the app's chain (and mark the app connected when it was not). */
 | {
    kind: 'adopt';
    chainId: number;
    markConnected: boolean;
};
/** What the app does when the wallet itself reports a chain change (the raw `chainChanged` event), whether or not wagmi is connected. */
export declare function decideWalletChainChanged(input: {
    hexChainId: string;
    appChainId: number;
    appConnected: boolean;
    supportedChainIds: ReadonlySet<number>;
    chainLabel: (chainId: number) => string;
}): WalletChainChangedDecision;
