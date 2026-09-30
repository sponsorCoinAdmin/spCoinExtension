// File: src/sendNative.ts
//
// 2026-09-22, Phase B.2 Stage 4 follow-up ("build actual trading
// functionality... do it") — the first real trade-execution flow in the
// extension: a native-currency send, wired to MeritWallet.tsx's SEND tab
// (this session's own new sendAmount/onSendSubmit props) and, through
// meritSign.ts, the real approval-gated signing pipeline.
//
// 2026-09-23, Stage 39 (resume of this stage's own paused follow-up) — now
// ALSO handles ERC20 token sends. The `decimals` blocker this header
// originally called out (Stage 32's note: "PickedEntry has no `decimals`
// field at all, so an ERC20 amount-to-wei conversion has no correct source")
// is closed: `decimals` now threads from the token-list row
// (spcoin-feeds/tokens) -> MeritWallet's `PickedEntry` -> onSendSubmit, so the
// real, per-token value is available at submit time. A `tokenAddress` with no
// `decimals` is still rejected (can't encode without it); only a missing
// `tokenAddress` (native) stays on the native path.
//
// ERC20 encoding is hand-rolled (selector `a9059cbb` + 32-byte address +
// 32-byte amount) rather than pulling in `ethers`/`viem` — neither is a
// direct dependency of this extension today (confirmed via package.json),
// same minimal-deps judgment call Stage 10/lastConnectedWallet and this
// file's own parseDecimalToWei already made. No `ethers`/`viem` dependency is
// taken on for one self-contained conversion.
//
// Scoped to native + ERC20 sends only — no swap/stake here (Phase C, separate).

import { signAndSendMeritTransaction, type MeritSignResult } from './meritSign';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Converts a plain decimal string (e.g. "1.5") to its integer wei value at `decimals` places. Returns null for anything that doesn't parse as a non-negative decimal number. */
export function parseDecimalToWei(amount: string, decimals: number): bigint | null {
  const trimmed = amount.trim();
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed) || trimmed === '.') return null;

  const [wholeRaw, fracRaw = ''] = trimmed.split('.');
  const whole = wholeRaw || '0';
  if (fracRaw.length > decimals) return null; // more precision than this currency supports

  const fracPadded = fracRaw.padEnd(decimals, '0');
  try {
    return BigInt(whole) * 10n ** BigInt(decimals) + (fracPadded ? BigInt(fracPadded) : 0n);
  } catch {
    return null;
  }
}

/** ERC20 `transfer(address,uint256)` calldata — selector `a9059cbb` + 32-byte
 *  left-zero-padded address + 32-byte big-endian amount. No ABI lib needed. */
function encodeErc20Transfer(to: string, amountWei: bigint): string {
  const cleanTo = to.trim().toLowerCase().replace(/^0x/, '');
  const toHex = cleanTo.padStart(64, '0');
  const amountHex = amountWei.toString(16).padStart(64, '0');
  return `0xa9059cbb${toHex}${amountHex}`;
}

export interface SendNativeParams {
  baseUrl: string;
  chainId: number;
  rpcUrl: string;
  from: string;
  recipientAddress: string | undefined;
  /** Present for an ERC20 send; omitted for a native-currency send. */
  tokenAddress: string | undefined;
  /** Real, per-token decimals from the token-list row (Stage 39). Required
   *  for an ERC20 send (no `decimals` => the pick can't be wei-converted);
   *  ignored for native, where 18 is the Hardhat/Base native-eth convention. */
  decimals: number | undefined;
  /** Plain decimal string from the SEND tab's amount field. */
  amount: string;
  /** Optional symbol used for the confirmation-screen title (Stage 32's
   *  follow-up asked for the title to match the token, not just "ERC20"). */
  tokenSymbol?: string;
  nativeSymbol: string;
  unlockToken?: string;
}

export async function sendNativeMerit(params: SendNativeParams): Promise<MeritSignResult> {
  if (!params.recipientAddress || !ADDRESS_RE.test(params.recipientAddress)) {
    return { ok: false, message: 'Pick a valid recipient first.' };
  }

  const isErc20 = Boolean(params.tokenAddress);
  const decimals = isErc20 ? params.decimals : 18;

  if (isErc20 && decimals === undefined) {
    return { ok: false, message: 'Token decimals are not available — cannot convert the amount.' };
  }

  const weiAmount = parseDecimalToWei(params.amount, decimals!);
  if (weiAmount === null || weiAmount <= 0n) {
    return { ok: false, message: 'Enter a valid amount greater than zero.' };
  }

  // Native send: plain transfer (empty calldata), `value` = wei. ERC20 send:
  // a contract call to the token's `transfer(address,uint256)`
  // (calldata on `to: tokenAddress`, `value: '0'`), gated through the same
  // always-explicit confirmation screen `signAndSendMeritTransaction` mounts.
  return signAndSendMeritTransaction({
    baseUrl: params.baseUrl,
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
    from: params.from,
    to: isErc20 ? params.tokenAddress! : params.recipientAddress,
    data: isErc20 ? encodeErc20Transfer(params.recipientAddress, weiAmount) : '0x',
    value: isErc20 ? undefined : weiAmount.toString(),
    unlockToken: params.unlockToken,
    title: isErc20
      ? `Send ${params.amount} ${params.tokenSymbol ?? ''}`.trimEnd()
      : `Send ${params.amount} ${params.nativeSymbol}`,
    amount: {
      label: 'Amount',
      value: isErc20
        ? `${params.amount} ${params.tokenSymbol ?? ''}`.trimEnd()
        : `${params.amount} ${params.nativeSymbol}`,
    },
    accounts: [{ role: 'RECIPIENT', address: params.recipientAddress }],
  });
}
