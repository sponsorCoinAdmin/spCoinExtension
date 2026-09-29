// File: src/getAccountRecord.ts
//
// Extension-side client for the on-chain getAccountRecord read, which the
// web app currently does inline via fetch('/api/spCoin/run-script', ...) in
// lib/context/helpers/sponsorDiscovery.ts's runSpCoinReadStep. This file
// mirrors that exact request shape but is base-URL-parameterized so it can
// resolve correctly from a chrome-extension:// origin — same pattern every
// other real fetch in sidepanel.ts already uses (meritSign.ts, etc.).
//
// The server-side CORS grant (exchangeContextCors.ts, gated on
// MERIT_EXTENSION_ORIGIN) is already wired into run-script/route.ts's POST
// handler (line ~3930) and OPTIONS preflight (line ~3916), so once the
// extension origin is pinned server-side this client works cross-origin
// with no further server changes — the write/sign path stays same-origin-only
// (Phase C).

/** Shape of app/api/spCoin/run-script's JSON response results array entry. */
interface RunScriptResultEntry {
  success?: boolean;
  payload?: {
    result?: unknown;
    error?: { message?: unknown };
  };
}

/**
 * getAccountRecord(address) — returns the full on-chain AccountStruct for a
 * single account: balance, staked amount, relationship counts, timestamps,
 * and role flags. Mirrors sponsorDiscovery.ts's getAccountOnChainRecord.
 *
 * `baseUrl` is the web app origin (http://localhost:3000 or https://
 * sponsorcoin.org), resolved by the caller via urlForOpenTarget — same
 * convention as fetchAccountMetadata etc.
 */
export async function getAccountRecord(
  accountAddress: string,
  params: {
    baseUrl: string;
    contractAddress: string;
    rpcUrl: string;
    chainId: number;
  },
): Promise<unknown> {
  const response = await fetch(`${params.baseUrl}/api/spCoin/run-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractAddress: params.contractAddress,
      rpcUrl: params.rpcUrl,
      spCoinAccessSource: 'node_modules',
      script: {
        id: `getAccountRecord-${accountAddress}-${params.chainId}-${Date.now()}`,
        name: 'getAccountRecord',
        network: params.chainId === 31337 ? 'hardhat' : 'metamask',
        steps: [
          {
            step: 1,
            name: 'getAccountRecord',
            panel: 'spcoin_rread',
            method: 'getAccountRecord',
            mode: params.chainId === 31337 ? 'hardhat' : 'metamask',
            params: [{ key: 'Account Key', value: accountAddress }],
          },
        ],
      },
    }),
  });

  const payload = (await response.json()) as {
    results?: RunScriptResultEntry[];
    message?: string;
  };

  const firstResult = payload?.results?.[0];
  if (!response.ok || !firstResult?.success) {
    throw new Error(String(firstResult?.payload?.error?.message ?? payload?.message ?? 'getAccountRecord failed.'));
  }

  return firstResult.payload?.result;
}
