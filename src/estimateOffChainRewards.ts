// File: src/estimateOffChainRewards.ts
//
// Extension-side client for the off-chain reward estimation methods
// (estimateOffChainTotalRewards, estimateOffChainSponsorRewards,
// estimateOffChainRecipientRewards, estimateOffChainAgentRewards), which the
// web app calls inline via fetch('/api/spCoin/run-script', ...) in
// usePendingRewardsInlineExpansion.ts and useSponsorCoinLabScriptRunner.ts.
// This file mirrors that exact request shape but is base-URL-parameterized
// for chrome-extension:// origin resolution — same pattern as
// getAccountRecord.ts / meritSign.ts.
//
// The server-side CORS grant (exchangeContextCors.ts) is already wired into
// run-script/route.ts's POST + OPTIONS handlers (Phase A), so once
// MERIT_EXTENSION_ORIGIN is pinned this works cross-origin with no further
// server changes — write/claim stays same-origin-only (Phase C).

/** Shape of app/api/spCoin/run-script's JSON response results array entry. */
interface RunScriptResultEntry {
  success?: boolean;
  payload?: {
    result?: unknown;
    error?: { message?: unknown };
  };
}

export type EstimateOffChainMethod =
  | 'estimateOffChainTotalRewards'
  | 'estimateOffChainSponsorRewards'
  | 'estimateOffChainRecipientRewards'
  | 'estimateOffChainAgentRewards';

/**
 * Calls the off-chain reward estimation method for a single account.
 * Returns the raw result object (shape varies by method — the web app
 * normalizes it via pendingRewardsTreeUtils.ts, which stays in the web
 * host for now).
 *
 * `baseUrl` is the web app origin (http://localhost:3000 or https://
 * sponsorcoin.org), resolved by the caller via urlForOpenTarget.
 */
export async function estimateOffChainRewards(
  accountAddress: string,
  method: EstimateOffChainMethod,
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
        id: `${method}-${accountAddress}-${params.chainId}-${Date.now()}`,
        name: method,
        network: params.chainId === 31337 ? 'hardhat' : 'metamask',
        steps: [
          {
            step: 1,
            name: method,
            panel: 'spcoin_rread',
            method,
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
    throw new Error(String(firstResult?.payload?.error?.message ?? payload?.message ?? `${method} failed.`));
  }

  return firstResult.payload?.result;
}
