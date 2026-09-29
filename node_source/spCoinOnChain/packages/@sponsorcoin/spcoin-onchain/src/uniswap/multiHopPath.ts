// File: uniswap/multiHopPath.ts
// Portable Uniswap V3 multi-hop path encoding (2026-09-26, Phase 4).
// Ported from web-app-local lib/uniswap/multiHopPath.ts — pure/stateless,
// no chain calls, no app-specific dependency.

export interface MultiHopPathParams {
  tokens: string[];
  fees: number[];
}

export function encodeMultiHopPath({ tokens, fees }: MultiHopPathParams): string {
  if (tokens.length < 2) {
    throw new Error('encodeMultiHopPath: need at least 2 tokens (1 hop).');
  }
  if (fees.length !== tokens.length - 1) {
    throw new Error(
      `encodeMultiHopPath: fees.length (${fees.length}) must be tokens.length - 1 (${tokens.length - 1}).`,
    );
  }
  for (const fee of fees) {
    if (!Number.isInteger(fee) || fee < 0 || fee > 0xffffff) {
      throw new Error(`encodeMultiHopPath: fee ${fee} doesn't fit in uint24 (0..16777215).`);
    }
  }

  let path = '0x';
  tokens.forEach((token, i) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(token.toLowerCase())) {
      throw new Error(`encodeMultiHopPath: "${token}" isn't a 20-byte hex address.`);
    }
    path += token.slice(2).toLowerCase();
    if (i < fees.length) {
      path += fees[i].toString(16).padStart(6, '0');
    }
  });
  return path;
}

export function encodeSingleHopThroughPath(params: {
  tokenIn: string;
  through: string;
  tokenOut: string;
  feeIn?: number;
  feeOut?: number;
}): string {
  const feeIn = params.feeIn ?? 3000;
  const feeOut = params.feeOut ?? feeIn;
  return encodeMultiHopPath({
    tokens: [params.tokenIn, params.through, params.tokenOut],
    fees: [feeIn, feeOut],
  });
}
