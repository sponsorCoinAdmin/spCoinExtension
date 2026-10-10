// File: src/runSpCoinReadStep.ts
// Extension-side run-script read function (2026-09-26, Phase 4).
//
// Mirrors the web app's runSpCoinReadStep in sponsorDiscovery.ts, but is
// base-URL-parameterized so it resolves correctly from a chrome-extension://
// origin. This is the readStep adapter that the portable
// executeStakeTransactionCore (from @sponsorcoin/spcoin-onchain) calls
// for rate-key resolution (getRecipientRateIncrement, getAgentRateIncrement).

import type { RunScriptParams, ReadStepFn } from '@sponsorcoin/spcoin-onchain';
import { createDirectReadStep } from '@sponsorcoin/merit-wallet';
import { SPOIN_STAKE_ABI } from './spCoinStakeAbi';

// 2026-10-08 (table row 16, E4): views that the stake ABI slice covers (the rate increments) are read straight from the chain's RPC with viem,
// no hosted app needed. Everything else still goes through the hosted run-script route until the account-record reads move (see the doc, row 16).
const directReads = createDirectReadStep(SPOIN_STAKE_ABI);

interface RunScriptResultEntry {
  success?: boolean;
  payload?: {
    result?: unknown;
    error?: { message?: unknown };
  };
}

/** Base-URL-parameterized read step for the extension's trade execution path. */
export async function runSpCoinReadStep(
  params: RunScriptParams,
  method: string,
  args: { key: string; value: string }[] = [],
  baseUrl?: string,
): Promise<unknown> {
  if (directReads.handles(method) && params.rpcUrl) return directReads.read({ contractAddress: params.contractAddress, rpcUrl: params.rpcUrl }, method, args);
  const response = await fetch(`${baseUrl ?? ''}/api/spCoin/run-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractAddress: params.contractAddress,
      rpcUrl: params.rpcUrl,
      spCoinAccessSource: params.accessSource,
      script: {
        id: `ext-read-${method}-${Date.now()}`,
        name: method,
        network: params.readMode,
        steps: [
          {
            step: 1,
            name: method,
            panel: 'spcoin_rread',
            method,
            mode: params.readMode,
            params: args,
          },
        ],
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    results?: RunScriptResultEntry[];
    message?: string;
  };

  const firstResult = payload?.results?.[0];
  if (!response.ok || !firstResult?.success) {
    throw new Error(String(firstResult?.payload?.error?.message ?? payload?.message ?? `Unable to load ${method}.`));
  }

  return firstResult.payload?.result;
}
