// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/send/sendTransfer.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, S3a / table row 13) -- ONE send orchestration for both apps. It replaces the web app's
// useHardhatAwareTransfer encoding (ethers Contract) and the extension's sendNative.ts (hand-rolled encoding): the same validation, the same
// amount-to-wei conversion, the same native / ERC20 split, and the same ERC20 transfer calldata. The only thing that differs per host is the
// TRANSPORT: how a prepared transaction is signed and broadcast (web: the connected signer; extension: the vault's LocalSigner behind its
// approval screen). No React, no host imports: pure functions plus the transport interface.

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
/** The placeholder address token lists use for the chain's native coin: a send of it is a plain value transfer, not an ERC20 call. */
const NATIVE_PLACEHOLDER = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export function isNativePlaceholder(address: string | undefined): boolean {
  return String(address ?? '').trim().toLowerCase() === NATIVE_PLACEHOLDER;
}

export interface PreparedTransaction {
  to: string;
  /** Calldata; '0x' for a native send. */
  data: string;
  /** Wei, native sends only. */
  value?: bigint;
}

export type PrepareResult = { ok: true; tx: PreparedTransaction; amountWei: bigint } | { ok: false; message: string };

export interface TransferParams {
  recipientAddress: string | undefined;
  /** Present for an ERC20 send; omitted for a native send. */
  tokenAddress?: string;
  /** Required for an ERC20 send; native is always 18. */
  decimals?: number;
  /** Plain decimal string from the amount field. */
  amount: string;
}

/** "1.5" at 18 decimals -> 1500000000000000000n. null for anything that is not a plain non-negative decimal, or has too many places. */
export function parseDecimalToWei(amount: string, decimals: number): bigint | null {
  const trimmed = String(amount ?? '').trim();
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed) || trimmed === '.') return null;
  const [wholeRaw, fracRaw = ''] = trimmed.split('.');
  if (fracRaw.length > decimals) return null;
  const fracPadded = fracRaw.padEnd(decimals, '0');
  try {
    return BigInt(wholeRaw || '0') * 10n ** BigInt(decimals) + (fracPadded ? BigInt(fracPadded) : 0n);
  } catch {
    return null;
  }
}

/** ERC20 transfer(address,uint256) calldata: selector a9059cbb + 32-byte address + 32-byte amount. */
export function encodeErc20Transfer(to: string, amountWei: bigint): string {
  return `0xa9059cbb${to.trim().toLowerCase().replace(/^0x/, '').padStart(64, '0')}${amountWei.toString(16).padStart(64, '0')}`;
}

/** Validate and turn the form into the transaction to send. */
export function prepareTransfer(params: TransferParams): PrepareResult {
  const recipient = params.recipientAddress?.trim();
  if (!recipient || !ADDRESS_RE.test(recipient)) return { ok: false, message: 'Pick a valid recipient first.' };
  const isErc20 = Boolean(params.tokenAddress) && !isNativePlaceholder(params.tokenAddress);
  if (isErc20 && !ADDRESS_RE.test(String(params.tokenAddress).trim())) return { ok: false, message: 'The token address is not valid.' };
  const decimals = isErc20 ? params.decimals : 18;
  if (decimals === undefined) return { ok: false, message: 'Token decimals are not available — cannot convert the amount.' };
  const amountWei = parseDecimalToWei(params.amount, decimals);
  if (amountWei === null || amountWei <= 0n) return { ok: false, message: 'Enter a valid amount greater than zero.' };
  return isErc20
    ? { ok: true, amountWei, tx: { to: String(params.tokenAddress).trim(), data: encodeErc20Transfer(recipient, amountWei) } }
    : { ok: true, amountWei, tx: { to: recipient, data: '0x', value: amountWei } };
}

export interface SendRequest {
  from: string;
  chainId: number;
  tx: PreparedTransaction;
  /** Confirmation-screen text. */
  title: string;
  amountLabel: string;
  recipientAddress: string;
}

export interface SendOutcome {
  hash: string;
  /** Whatever the host's transport returns after the transaction is mined (the web app shows gas used / block from it). */
  receipt?: unknown;
}

/** How a host signs and broadcasts. Throws on rejection or failure. */
export type SendTransport = (request: SendRequest) => Promise<SendOutcome>;

export interface ExecuteSendParams extends TransferParams {
  from: string;
  chainId: number;
  nativeSymbol: string;
  tokenSymbol?: string;
}

export type SendResult = ({ ok: true } & SendOutcome) | { ok: false; message: string };

/** Prepare, then hand to the host's transport. Never throws: a rejected or failed send comes back as { ok: false, message }. */
export async function executeSend(params: ExecuteSendParams, transport: SendTransport): Promise<SendResult> {
  const prepared = prepareTransfer(params);
  if (!prepared.ok) return prepared;
  const unit = params.tokenAddress && !isNativePlaceholder(params.tokenAddress) ? params.tokenSymbol ?? '' : params.nativeSymbol;
  const amountLabel = `${params.amount} ${unit}`.trimEnd();
  try {
    const outcome = await transport({
      from: params.from,
      chainId: params.chainId,
      tx: prepared.tx,
      title: `Send ${amountLabel}`,
      amountLabel,
      recipientAddress: String(params.recipientAddress).trim(),
    });
    return { ok: true, ...outcome };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
