// File: src/resolveAssetAddress.ts
//
// 2026-10-05 — MeritWallet's `resolveAssetAddress` prop: what an address typed into a
// token / recipient list's ADDRESS_PANEL turns out to be when it isn't one of the rows
// already loaded. The rules (format, duplicate-of-the-other-side, contract exists, ERC-20
// metadata, account hydration) are the engine's resolveAssetEntry — the same logic the web
// app's validation FSM uses; this file only supplies the extension's own pieces: a plain
// viem client over the same public RPC every other read here uses, the feeds' logo URL
// builder, and the extension's account hydration.
//
// The returned function must keep a stable identity (MeritWallet re-runs its lookup effect
// when the prop changes), so build it once at module scope. `getBaseUrl` is read per call
// because the app origin follows the Local/Prod open-target setting.
import { createPublicClient, http } from 'viem';
import {
  resolveAssetEntry,
  type AssetEntryClient,
  type AssetEntryKind,
  type AssetEntryResult,
} from '@sponsorcoin/spcoin-exchange-engine';
import { getTokenLogoURL } from '@sponsorcoin/spcoin-feeds/tokens';
import { hydrateAccountFromAddress } from './hydrateAccountFromAddress';

export function makeResolveAssetAddress({
  rpcUrl,
  chainId,
  getBaseUrl,
}: {
  rpcUrl: string;
  chainId: number;
  getBaseUrl: () => string;
}) {
  const client = createPublicClient({ transport: http(rpcUrl) }) as unknown as AssetEntryClient;
  return (address: string, kind: AssetEntryKind, peerAddress?: string): Promise<AssetEntryResult> => {
    const baseUrl = getBaseUrl();
    return resolveAssetEntry(address, {
      kind,
      chainId,
      publicClient: client,
      peerAddress,
      getTokenLogoURL: (id, addr) => `${baseUrl}${getTokenLogoURL(id, addr)}`,
      hydrateAccount: async (addr) => {
        const hydrated = await hydrateAccountFromAddress(addr, { baseUrl });
        return hydrated ? { name: hydrated.name, symbol: hydrated.symbol, logoURL: hydrated.logoURL } : undefined;
      },
    });
  };
}
