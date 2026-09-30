// File: src/hydrateAccountFromAddress.ts
//
// Extension-side hydrateAccountFromAddress — fetches account identity
// (name/symbol/logoURL) for a single address, mirroring the web app's
// lib/context/helpers/accountHydration.ts but scoped to only what
// AgentHeaderPanel's auto-seed needs (HydratedAgent shape).
//
// Reuses @sponsorcoin/spcoin-feeds's accountsFeed.ts (fetchAccountMetadata,
// getAccountAvatarURL) — already imported and proven-live in sidepanel.ts.
// The extension already has host_permissions covering the web app origin,
// so the metadata fetch works cross-origin without server-side CORS grants.
//
// TODO 4 — unblocks AGENT_HEADER_PANEL's default-agent auto-seed:
// AgentHeaderPanel.onHydrateAgent defaultAgentAddress → this function →
// AgentHeaderPanel.onSetAgentAccount → setAgentAccount (from useAgentAccount).

import type { Address } from 'viem';
import { isAddress } from 'viem';
import { fetchAccountMetadata, getAccountAvatarURL } from '@sponsorcoin/spcoin-feeds/accounts';
import { defaultMissingImage } from '@sponsorcoin/spcoin-exchange-engine';

import type { HydratedAgent } from '@sponsorcoin/spcoin-panels';

export interface HydrateAccountOpts {
  baseUrl: string;
}

export async function hydrateAccountFromAddress(
  address: string,
  opts: HydrateAccountOpts,
): Promise<HydratedAgent | undefined> {
  const addr = (address ?? '').trim();
  if (!addr || !isAddress(addr as Address)) {
    return undefined;
  }

  const metadata = await fetchAccountMetadata(addr as Address, { baseUrl: opts.baseUrl }).catch(() => null);
  const logoURL = `${opts.baseUrl}${getAccountAvatarURL(addr as Address)}`;

  return {
    address: addr,
    name: metadata?.name,
    symbol: metadata?.symbol,
    logoURL,
  };
}
