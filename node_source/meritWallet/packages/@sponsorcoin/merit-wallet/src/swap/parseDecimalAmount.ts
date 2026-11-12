// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/swap/parseDecimalAmount.ts
//
// 2026-09-30, Stage B (real trade wiring) -- a minimal, dependency-free decimal-string -> bigint parser for the SWAP tab's amount inputs. No `ethers`/`viem` import here on purpose:
// this is a portable package (the extension's Vite bundle included), and a full BigNumber-parsing library is unnecessary weight for one small, well-understood conversion.
// 2026-11-11 (owner: "I cannot reset the sell token back to 0, it flashes back to 1"): moved out of MeritWallet.tsx so it can be tested, and an EMPTY box now means 0. It used to return
// undefined for "", which skipped the push to the exchange context, so the amount stayed at what it was and the box re-synced to it (the old number came back) once the typing grace ended.
/**
 * `undefined` (never throws) only for a not-yet-a-number mid-type state ("." or text that is not a number): the caller skips the push and keeps the text as typed.
 * "" is an amount of 0. "12." is 12. ".5" is 0.5.
 */
export function parseDecimalAmount(text: string, decimals: number): bigint | undefined {
  const trimmed = text.trim();
  if (!trimmed) return 0n;
  if (trimmed === '.' || !/^\d*\.?\d*$/.test(trimmed)) return undefined;
  const [wholeRaw, fracRaw = ''] = trimmed.split('.');
  const whole = wholeRaw || '0';
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');
  try {
    return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(frac || '0');
  } catch {
    return undefined;
  }
}
