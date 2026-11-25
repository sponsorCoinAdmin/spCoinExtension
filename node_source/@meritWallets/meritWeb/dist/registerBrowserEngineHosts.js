// File: src/registerBrowserEngineHosts.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- what the shared engine asks its host for, registered once: a chain client (the address checks, balance and contract reads all go through it) for the app's chain and for any chain by id, and the
// "an approval is waiting" flag. Without these the engine skips its address validation ("FSM:skipped (no publicClient/chainId)") and a pasted recipient is never accepted. This is the extension's engineHosts.ts, plus the Swap tab's trade hooks (browserTrade.ts) when an authenticator is given.
// The engine's hooks are process-wide singletons, so one page holds one browser wallet: the last registration wins.
// The endpoint for a chain is the one the page configured, else the chain's own network settings from the data snapshot.
import { useMemo, useSyncExternalStore } from 'react';
import { engineTrace, getDefaultNetworkSettings, setAppPublicClientHook, setApprovalPendingHook, setChainPublicClientHook, useAppChainId } from '@sponsorcoin/spcoin-exchange-engine';
import { publicClientFor } from './chainClients';
import { registerBrowserTradeHosts } from './browserTrade';
import { getNetworkConfiguration } from '@sponsorcoin/spcoin-feeds/networks';
let registeredFor;
export function registerBrowserEngineHosts(chains, approvals, authenticator) {
    if (registeredFor === approvals)
        return;
    registeredFor = approvals;
    engineTrace('browser:registerEngineHosts', { chains: chains.map((c) => c.chainId) });
    const rpcOf = (chainId) => {
        if (!chainId)
            return undefined;
        const configured = chains.find((c) => c.chainId === Number(chainId))?.rpcUrl;
        if (configured)
            return configured;
        // 2026-11-21 (owner report: no token resolved on the release): the network registry comes BEFORE the bundled settings. getDefaultNetworkSettings falls back to ETHEREUM's settings for a chain the data does not list (the release has no 31337 data),
        // and it used to win here, so every token check on 31337 ran against Ethereum mainnet and found no contract. The registry holds the chain's own endpoint; the bundled settings are only the last resort.
        const fromRegistry = getNetworkConfiguration(Number(chainId))?.rpcUrl;
        if (fromRegistry)
            return fromRegistry;
        const bundled = getDefaultNetworkSettings(Number(chainId))?.networkHeader?.rpcUrl;
        return bundled ? String(bundled) : undefined;
    };
    const clientFor = (chainId, who = 'chain') => {
        const rpcUrl = rpcOf(chainId);
        // the debug pane's view of what the engine was given (a yes/no, never the endpoint itself: it can carry an access token)
        engineTrace(`browser:${who}PublicClient`, { chainId, hasEndpoint: !!rpcUrl });
        return rpcUrl ? publicClientFor(rpcUrl) : undefined;
    };
    function useBrowserAppPublicClient() {
        const [chainId] = useAppChainId();
        return useMemo(() => clientFor(chainId ? Number(chainId) : undefined, 'app'), [chainId]);
    }
    function useBrowserChainPublicClient(chainId) {
        return useMemo(() => clientFor(chainId), [chainId]);
    }
    const pending = () => approvals.list().length > 0;
    function useBrowserApprovalPending() {
        return useSyncExternalStore((listener) => approvals.onChange(listener), pending, pending);
    }
    setAppPublicClientHook(useBrowserAppPublicClient);
    setChainPublicClientHook(useBrowserChainPublicClient);
    setApprovalPendingHook(useBrowserApprovalPending);
    // the Swap tab's hooks (swap functions, the Uniswap signer): only when the wallet has an authenticator to sign with
    if (authenticator)
        registerBrowserTradeHosts(authenticator, rpcOf);
}
