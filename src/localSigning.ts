// File: src/localSigning.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table rows 13-14) -- the side panel's half of LOCAL signing, shared by the send flow and the
// trade executor (stake, approve, swap, claim). The vault in the background worker queues the request (merit/signing/*); this file shows the
// extension's existing always-explicit confirmation screen and then tells the worker to approve or reject what it queued.
import { requestSignApproval, type PendingSignRequest } from './pendingSignRequestStore';
import { clearPendingSignRequest } from './meritSign';

type WorkerReply = { ok: boolean; hash?: string; signature?: string; error?: string; message?: string; accounts?: Array<{ address: string; devOrigin?: boolean }>; pending?: Array<{ id: string }> };
const worker = (message: unknown) => chrome.runtime.sendMessage(message) as Promise<WorkerReply>;

/**
 * The hosted app's signing route (the pre-vault path) refuses requests from the extension ("Cross-origin signing requests are not allowed"). With the vault as the
 * wallet (the default) it must not be used as a silent fallback: a locked wallet or an account that is not in it gets a clear message instead.
 */
let legacySigningAllowed = false;
export function allowLegacySigning(allowed: boolean): void {
  legacySigningAllowed = allowed;
}
export function isLegacySigningAllowed(): boolean {
  return legacySigningAllowed;
}
export async function vaultUnavailableMessage(): Promise<string> {
  const status = (await worker({ type: 'merit/vault/status' }).catch(() => undefined)) as (WorkerReply & { initialized?: boolean; unlocked?: boolean }) | undefined;
  if (status?.ok && status.initialized && !status.unlocked) return 'The wallet is locked. Unlock it and try again.';
  return 'This account is not in the wallet, so it cannot sign here. Pick an account from the wallet.';
}

/** Is `address` one of the accounts of the unlocked vault (so it can sign locally)? */
export async function isVaultAccount(address: string | undefined): Promise<boolean> {
  if (!address) return false;
  const reply = await worker({ type: 'merit/accounts/list' }).catch(() => undefined);
  return !!reply?.ok && !!reply.accounts?.some((a) => a.address.toLowerCase() === address.trim().toLowerCase());
}

/** The local Hardhat chain, where the published test keys are allowed to sign. */
const DEV_CHAIN_ID = 31337;

/**
 * Quiet approval: a Hardhat test-key account (devOrigin) signing on the local chain 31337 from the wallet's own screens is not asked to confirm. The keys are public
 * and the coins are worthless, so the Approve step is only friction; any real account, or any other chain, always asks.
 */
async function isQuietAccount(address: string, chainId: number): Promise<boolean> {
  if (chainId !== DEV_CHAIN_ID) return false;
  const reply = await worker({ type: 'merit/accounts/list' }).catch(() => undefined);
  return !!reply?.ok && !!reply.accounts?.some((a) => a.devOrigin === true && a.address.toLowerCase() === address.trim().toLowerCase());
}

export type ConfirmCopy = Omit<PendingSignRequest, 'id'>;

export interface LocalTransaction {
  from: string;
  to: string;
  data?: string;
  /** Wei, as a decimal string. */
  value?: string;
  chainId: number;
}

/** A Hardhat test-key account (devOrigin): its keys are public, so signing a login challenge for it needs no confirmation either. */
async function isDevAccount(address: string): Promise<boolean> {
  const reply = await worker({ type: 'merit/accounts/list' }).catch(() => undefined);
  return !!reply?.ok && !!reply.accounts?.some((a) => a.devOrigin === true && a.address.toLowerCase() === address.trim().toLowerCase());
}

/** Sign a message (personal_sign) with a vault account: queue in the worker, confirm on screen (not for a test account), approve or reject. Resolves with the signature. */
export async function signMessageWithVault(address: string, message: string, confirm: ConfirmCopy): Promise<string> {
  const before = new Set(((await worker({ type: 'merit/signing/pending' })).pending ?? []).map((p) => p.id));
  const done = worker({ type: 'merit/signing/signMessage', address, message, origin: 'wallet' });
  let queued: string | undefined;
  for (let i = 0; i < 40 && !queued; i++) {
    const list = (await worker({ type: 'merit/signing/pending' })).pending ?? [];
    queued = list.find((p) => !before.has(p.id))?.id;
    if (!queued) await new Promise((r) => setTimeout(r, 50));
  }
  if (!queued) {
    const early = await done;
    throw new Error(early.message || `Signing refused (${early.error ?? 'unknown'}).`);
  }
  const approved = (await isDevAccount(address)) || (await requestSignApproval(confirm));
  if (!approved) {
    await worker({ type: 'merit/signing/reject', id: queued });
    await done.catch(() => undefined);
    throw new Error('Rejected in the Merit Wallet confirmation screen.');
  }
  await worker({ type: 'merit/signing/approve', id: queued });
  const reply = await done;
  clearPendingSignRequest();
  if (!reply.ok || !reply.signature) throw new Error(reply.message || `Signing failed (${reply.error ?? 'unknown'}).`);
  return reply.signature;
}

/** Queue in the worker, confirm on screen, approve or reject. Resolves with the hash; throws on rejection or failure. */
export async function signWithVault(tx: LocalTransaction, confirm: ConfirmCopy): Promise<{ hash: string }> {
  const before = new Set(((await worker({ type: 'merit/signing/pending' })).pending ?? []).map((p) => p.id));
  // The worker answers only after the request is approved and sent (or rejected), so do not await it yet.
  const done = worker({ type: 'merit/signing/sendTransaction', from: tx.from, to: tx.to, value: tx.value, data: tx.data ?? '0x', chainId: tx.chainId, origin: 'wallet' });
  let queued: string | undefined;
  for (let i = 0; i < 40 && !queued; i++) {
    const list = (await worker({ type: 'merit/signing/pending' })).pending ?? [];
    queued = list.find((p) => !before.has(p.id))?.id;
    if (!queued) await new Promise((r) => setTimeout(r, 50));
  }
  if (!queued) {
    const early = await done; // refused before it was queued (locked wallet, development account on a real chain, ...)
    throw new Error(early.message || `Send refused (${early.error ?? 'unknown'}).`);
  }
  const approved = (await isQuietAccount(tx.from, tx.chainId)) || (await requestSignApproval(confirm));
  if (!approved) {
    await worker({ type: 'merit/signing/reject', id: queued });
    await done.catch(() => undefined);
    throw new Error('Rejected in the Merit Wallet confirmation screen.');
  }
  await worker({ type: 'merit/signing/approve', id: queued });
  const reply = await done;
  clearPendingSignRequest();
  if (!reply.ok || !reply.hash) throw new Error(reply.message || `Send failed (${reply.error ?? 'unknown'}).`);
  return { hash: reply.hash };
}

/** eth_call straight to the chain's RPC (the vault path reads allowances and the like itself). */
export async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const response = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }) });
  const body = (await response.json()) as { result?: string; error?: { message?: string } };
  if (body.error || typeof body.result !== 'string') throw new Error(body.error?.message || 'eth_call failed.');
  return body.result;
}

/** Wait for the transaction to be mined (polls the chain's RPC) and return the receipt in the shape the swap flow reads; null if it is not mined in time. */
export async function waitForReceipt(rpcUrl: string, hash: string, timeoutMs = 60_000): Promise<{ blockNumber: number; gasUsed: bigint; gasPrice?: bigint; status: number; to: string | null; from: string; contractAddress: string | null; hash: string; logs: readonly unknown[] } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [hash] }) });
      const body = (await response.json()) as { result?: { blockNumber: string; gasUsed: string; effectiveGasPrice?: string; status: string; to: string | null; from: string; contractAddress: string | null; logs: unknown[] } | null };
      if (body.result) return { blockNumber: Number(BigInt(body.result.blockNumber)), gasUsed: BigInt(body.result.gasUsed), gasPrice: body.result.effectiveGasPrice ? BigInt(body.result.effectiveGasPrice) : undefined, status: Number(BigInt(body.result.status)), to: body.result.to, from: body.result.from, contractAddress: body.result.contractAddress, hash, logs: body.result.logs ?? [] };
    } catch {
      /* try again */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}
