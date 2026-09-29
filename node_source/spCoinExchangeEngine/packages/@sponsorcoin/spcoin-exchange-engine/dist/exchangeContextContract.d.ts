import { type Context } from 'react';
import type { ExchangeContext, TokenContract, ErrorMessage, spCoinAccount, NetworkElement, DisplayPanels } from '@sponsorcoin/spcoin-common/context';
import type { TRADE_DIRECTION } from '@sponsorcoin/spcoin-common/context';
export interface ExchangeContextType {
    exchangeContext: ExchangeContext;
    setExchangeContext: (updater: (prev: ExchangeContext) => ExchangeContext, hookName?: string) => void;
    setSellAmount: (amount: bigint) => void;
    setBuyAmount: (amount: bigint) => void;
    setSellBalance: (balance: bigint) => void;
    setBuyBalance: (balance: bigint) => void;
    setSellTokenContract: (contract: TokenContract | undefined) => void;
    setBuyTokenContract: (contract: TokenContract | undefined) => void;
    setSendTokenContract: (contract: TokenContract | undefined) => void;
    setPreviewTokenContract: (contract: TokenContract | undefined) => void;
    setPreviewTokenSource: (source: 'BUY' | 'SELL' | null) => void;
    setTradeDirection: (type: TRADE_DIRECTION) => void;
    setSlippageBps: (bps: number) => void;
    setRecipientAccount: (wallet: spCoinAccount | undefined) => void;
    setAppChainId: (chainId: number) => void;
    errorMessage: ErrorMessage | undefined;
    setErrorMessage: (error: ErrorMessage | undefined) => void;
}
/**
 * Write-path extension points — a bare Provider built on this contract with
 * no `writeExtensions` supplied runs no middleware and persists nothing,
 * deliberately, so a second, lighter consumer (e.g. the extension, once it
 * has its own stateful Provider) isn't forced to carry registry-sync/
 * panel-tree/persistence weight it may not want.
 */
export type ExchangeContextWriteMiddleware = (next: ExchangeContext, prev: ExchangeContext) => ExchangeContext;
export type ExchangeContextPersistFn = (prev: ExchangeContext | undefined, next: ExchangeContext, info: {
    changed: boolean;
}) => void;
export interface ExchangeContextWriteExtensions {
    /** Applied in order to every freshly-computed next state before it's
     * compared against prev and committed. This is where registry sync,
     * display-stack/panel-tree normalization, or any other
     * keep-derived-fields-in-sync-on-every-write concern belongs. */
    middleware?: ExchangeContextWriteMiddleware[];
    /** Called after middleware has run, whenever there's something to
     * persist. Omit for a provider that shouldn't persist anything on its
     * own. */
    persist?: ExchangeContextPersistFn;
}
export declare const EMPTY_WRITE_MIDDLEWARE: ExchangeContextWriteMiddleware[];
export declare const NOOP_PERSIST: ExchangeContextPersistFn;
/**
 * Boot extension point — called once, on cold boot, with the raw settings
 * blob the consumer's own init sequence produced. Returns the
 * {displayPanels} the boot effect merges into the committed context.
 */
export type ExchangeContextBootPanelExtension = (args: {
    settingsAny: any;
    appChainId: number;
}) => {
    displayPanels: DisplayPanels;
};
export interface ExchangeContextBootExtensions {
    /** Omit for a provider that should just pass through whatever
     * settings.displayPanels was already loaded, unrepaired — a safe (if
     * unpolished) default for a consumer without a specific panel-tree
     * repair need. */
    derivePanelState?: ExchangeContextBootPanelExtension;
}
export declare const DEFAULT_BOOT_PANEL_EXTENSION: ExchangeContextBootPanelExtension;
/**
 * Storage extension point — the one platform-specific synchronous-vs-async
 * read every real consumer differs on (`localStorage` for the web app,
 * `chrome.storage.local` for a Manifest V3 extension — both Promise-based
 * here, since a V3 background service worker has no window/DOM at all and
 * chrome.storage's own API is async-only). A bare provider with none
 * supplied always boots fresh — no persisted state at all.
 */
export type ExchangeContextStorageReadFn = () => Promise<unknown | undefined>;
export interface ExchangeContextStorageExtensions {
    read?: ExchangeContextStorageReadFn;
}
export declare const DEFAULT_STORAGE_READ: ExchangeContextStorageReadFn;
/**
 * Wallet-source extension point (2026-09-18, Phase B.2 continued — see the
 * approved plan at .claude/plans/warm-questing-cookie.md). The web app's
 * ExchangeProvider is built on wagmi's useAccount()/useChainId() for
 * address/connection/chain state — a real dependency a lighter consumer
 * (the extension, self-custodial via Merit Wallet's own encrypted key,
 * viem-backed, no wagmi) can't carry. A provider built on this contract
 * takes this as a plain value prop instead of calling wagmi's hooks
 * directly: the web app's own thin wrapper supplies a wagmi-backed value
 * (useWagmiWalletSource.ts), a future extension-side wrapper would supply
 * a viem/Merit-Wallet-backed one — same "outer wrapper picks the source,
 * inner implementation just takes values" shape needed to respect the
 * Rules of Hooks (a component can't conditionally choose which hook to
 * call at runtime).
 */
export interface ExchangeContextWalletSource {
    /** Has this source settled on an initial state yet (was: wagmiReady) —
     *  gates the boot effect so it doesn't run against a still-resolving
     *  connection status. */
    ready: boolean;
    address: string | undefined;
    isConnected: boolean;
    /** wagmi's useChainId() always resolves to a configured chain, connected
     *  or not (never undefined) — any wallet source should be able to
     *  guarantee the same (Merit Wallet's own configured/selected chain,
     *  for a viem-backed source). */
    chainId: number;
}
/** The one shared React.Context object every real consumer's Provider
 * mounts a value onto, and every `useExchangeContext()`-equivalent hook
 * reads from — this is what actually makes "one contract, independently
 * running instances" possible: the web app and the extension each run
 * their own Provider, but both are typed against (and, for the web app
 * today, literally instantiate) this same Context object. */
export declare const ExchangeContextState: Context<ExchangeContextType | null>;
/** Fills in every NetworkElement field with a safe default for any that
 * are missing — used when merging a partial/persisted network blob into a
 * real NetworkElement on boot. */
export declare const ensureNetwork: (n?: Partial<NetworkElement>) => NetworkElement;
/** structuredClone when available, JSON round-trip fallback otherwise —
 * every ExchangeContext write clones before mutating so `prev` stays
 * untouched for the before/after diff. */
export declare const clone: <T>(o: T) => T;
/** Case-insensitive address/string comparison helper — undefined-safe. */
export declare const lower: (s?: string) => string | undefined;
