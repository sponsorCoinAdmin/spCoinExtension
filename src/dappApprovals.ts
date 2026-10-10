// File: src/dappApprovals.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the side panel's half of "a web page asked the wallet for something".
// The worker queues each page request (connect, sign, send) in the approval queue; this file shows the extension's existing always-explicit
// confirmation screen for each one, one at a time, and then tells the worker to approve or reject it. Nothing happens to a request until the user
// answers here. Requests wait while the wallet is locked and are shown right after it is unlocked.
import { requestSignApproval, type PendingSignRequest } from './pendingSignRequestStore';
import { clearPendingSignRequest } from './meritSign';

interface PendingItem {
  id: string;
  kind: 'sign' | 'transaction' | 'connect';
  origin: string;
  summary: string;
  details?: Record<string, unknown>;
}
type Reply = { ok: boolean; unlocked?: boolean; pending?: PendingItem[]; chainId?: number; active?: string };
const worker = (message: unknown) => chrome.runtime.sendMessage(message) as Promise<Reply>;

function confirmCopy(item: PendingItem, chainId: number, activeAddress: string): Omit<PendingSignRequest, 'id'> {
  const d = item.details ?? {};
  if (item.kind === 'connect') {
    return {
      title: `Connect ${item.origin}`,
      message: 'This site wants to see your active account and ask you to sign. It cannot move anything without asking you again.',
      signerAddress: activeAddress,
      chainId,
      accounts: [{ role: 'SITE', address: item.origin }],
    };
  }
  if (item.kind === 'transaction') {
    const wei = d.value ? String(d.value) : '0';
    return {
      title: `Transaction from ${item.origin}`,
      signerAddress: String(d.from ?? activeAddress),
      chainId: Number(d.chainId ?? chainId),
      contractAddress: d.data && d.data !== '0x' && d.to ? String(d.to) : undefined,
      amount: { label: 'Amount', value: `${wei} wei` },
      accounts: d.to ? [{ role: 'TO', address: String(d.to) }] : undefined,
    };
  }
  const shown = d.typedData ? JSON.stringify(d.typedData, null, 1).slice(0, 600) : String(d.message ?? '');
  return { title: `Signature request from ${item.origin}`, message: shown, signerAddress: String(d.address ?? activeAddress), chainId };
}

export function startDappApprovals(): void {
  const handled = new Set<string>();
  let running = false;

  async function drain() {
    if (running) return;
    running = true;
    try {
      for (;;) {
        const status = await worker({ type: 'merit/vault/status' }).catch(() => undefined);
        if (!status?.unlocked) return; // shown after the unlock gate opens
        const list = (await worker({ type: 'merit/signing/pending' })).pending ?? [];
        const next = list.find((p) => p.origin !== 'wallet' && !handled.has(p.id));
        if (!next) return;
        handled.add(next.id);
        const chainId = (await worker({ type: 'merit/network/get' }).catch(() => undefined))?.chainId ?? 31337;
        const active = (await worker({ type: 'merit/accounts/list' }).catch(() => undefined))?.active ?? '';
        let approved = false;
        try {
          approved = await requestSignApproval(confirmCopy(next, chainId, active));
        } catch {
          handled.delete(next.id); // a wallet-initiated confirmation is on screen; try again when it closes
          return;
        }
        await worker({ type: approved ? 'merit/signing/approve' : 'merit/signing/reject', id: next.id }).catch(() => undefined);
        clearPendingSignRequest();
      }
    } finally {
      running = false;
    }
  }

  chrome.runtime.onMessage.addListener((message: { type?: string }) => {
    if (message?.type === 'merit/signing/changed' || message?.type === 'merit/vault/changed') void drain();
    return false;
  });
  void drain();
}
