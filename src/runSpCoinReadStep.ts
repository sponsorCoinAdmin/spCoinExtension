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
import { canReadLocally, readSpCoinLocally } from './localReads';

// 2026-10-08 (table row 16, E4): views that the stake ABI slice covers (the rate increments) are read straight from the chain's RPC with viem.
const directReads = createDirectReadStep(SPOIN_STAKE_ABI);

/**
 * The extension's read step. A view of the stake ABI slice (the rate increments) is read straight from the chain with viem; every other read the wallet asks for is answered by src/localReads.ts from the chain too
 * (docs/meritMigrationFinal.txt row I2). There is no request to any web app: this used to fall back to the hosted run-script route, which does not exist on a computer without the web app.
 */
export async function runSpCoinReadStep(
  params: RunScriptParams,
  method: string,
  args: { key: string; value: string }[] = [],
  _baseUrl?: string,
): Promise<unknown> {
  if (directReads.handles(method) && params.rpcUrl) return directReads.read({ contractAddress: params.contractAddress, rpcUrl: params.rpcUrl }, method, args);
  if (canReadLocally(method)) return readSpCoinLocally(params, method, args);
  throw new Error(`The wallet cannot read ${method} on its own.`);
}
