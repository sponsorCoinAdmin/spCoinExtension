// File: src/standalone/registerStandaloneEngineHosts.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- what the shared engine asks its host for, registered once: a chain client (the address checks, balance and contract reads all go through it) for the app's chain and for any chain by id, and the
// "an approval is waiting" flag. Without these the engine skips its address validation ("FSM:skipped (no publicClient/chainId)") and a pasted recipient is never accepted. This is the extension's engineHosts.ts without the trade hooks, which arrive with the trade layer.
// The endpoint for a chain is the one the page configured, else the chain's own network settings from the data snapshot.
import { useMemo, useSyncExternalStore } from 'react';
import { createPublicClient, http } from 'viem';
import { engineTrace, getDefaultNetworkSettings, setAppPublicClientHook, setApprovalPendingHook, setChainPublicClientHook, useAppChainId } from '@sponsorcoin/spcoin-exchange-engine';
import type { ApprovalController } from '../vault/approvals';
import type { Authenticator } from '../auth/authenticator';
import { registerStandaloneTradeHosts } from './standaloneTrade';
import type { StandaloneChain } from './createStandaloneWallet';

let registeredFor: unknown;

export function registerStandaloneEngineHosts(chains: readonly StandaloneChain[], approvals: ApprovalController, authenticator?: Authenticator): void {
  if (registeredFor === approvals) return;
  registeredFor = approvals;
  engineTrace('standalone:registerEngineHosts', { chains: chains.map((c) => c.chainId) });

  const rpcOf = (chainId?: number): string | undefined => {
    if (!chainId) return undefined;
    const configured = chains.find((c) => c.chainId === Number(chainId))?.rpcUrl;
    if (configured) return configured;
    const bundled = (getDefaultNetworkSettings(Number(chainId)) as { networkHeader?: { rpcUrl?: string } } | undefined)?.networkHeader?.rpcUrl;
    return bundled ? String(bundled) : undefined;
  };
  const clientFor = (chainId?: number, who = 'chain') => {
    const rpcUrl = rpcOf(chainId);
    // the debug pane's view of what the engine was given (a yes/no, never the endpoint itself: it can carry an access token)
    engineTrace(`standalone:${who}PublicClient`, { chainId, hasEndpoint: !!rpcUrl });
    return rpcUrl ? createPublicClient({ transport: http(rpcUrl) }) : undefined;
  };

  function useStandaloneAppPublicClient() {
    const [chainId] = useAppChainId();
    return useMemo(() => clientFor(chainId ? Number(chainId) : undefined, 'app'), [chainId]);
  }
  function useStandaloneChainPublicClient(chainId?: number) {
    return useMemo(() => clientFor(chainId), [chainId]);
  }
  const pending = () => approvals.list().length > 0;
  function useStandaloneApprovalPending(): boolean {
    return useSyncExternalStore((listener) => approvals.onChange(listener), pending, pending);
  }

  setAppPublicClientHook(useStandaloneAppPublicClient as never);
  setChainPublicClientHook(useStandaloneChainPublicClient as never);
  setApprovalPendingHook(useStandaloneApprovalPending);
  // the Swap tab's hooks (swap functions, the Uniswap signer): only when the wallet has an authenticator to sign with
  if (authenticator) registerStandaloneTradeHosts(authenticator, chains, rpcOf);
}
