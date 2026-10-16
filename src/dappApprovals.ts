// File: src/dappApprovals.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the side panel's half of "a web page asked the wallet for something".
// The worker queues each page request (connect, sign, send) in the approval queue; this file shows the extension's existing always-explicit
// confirmation screen for each one, one at a time, and then tells the worker to approve or reject it. Nothing happens to a request until the user
// answers here. Requests wait while the wallet is locked and are shown right after it is unlocked.
import { requestSignApproval, type PendingSignRequest } from './pendingSignRequestStore';
import { clearPendingSignRequest } from './meritSign';
import { requestTransferApproval } from './transferApprovalStore';

interface PendingItem {
  id: string;
  kind: 'sign' | 'transaction' | 'connect' | 'transfer';
  origin: string;
  summary: string;
  details?: Record<string, unknown>;
}
type Reply = { ok: boolean; unlocked?: boolean; initialized?: boolean; pending?: PendingItem[]; chainId?: number; active?: string };
const worker = (message: unknown) => chrome.runtime.sendMessage(message) as Promise<Reply>;

function confirmCopy(item: PendingItem, chainId: number, activeAddress: string): Omit<PendingSignRequest, 'id'> {
  const d = item.details ?? {};
  if (item.kind === 'connect') {
    return {
      // 2026-10-14 (owner request): the same page as MetaMask's "Connect this website with MetaMask": the site, the account it will see, and Cancel / Connect.
      title: `Connect ${item.origin} with Merit`,
      message: 'Connect this website with Merit Wallet. It sees your active account and can ask you to sign; it cannot move anything without asking you again.',
      signerAddress: activeAddress,
      chainId,
      accounts: [{ role: 'ACCOUNT', address: activeAddress }],
      approveLabel: 'Connect',
      rejectLabel: 'Cancel',
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
        // 2026-10-14 (owner report: the web wallet's Connect sat at "Waiting..." forever): an extension with NO wallet set up (it shows the account list of the hosted dev keystore, not a vault) cannot approve a site: there
        // is no account here to share. Say so on screen and answer the site, instead of leaving both waiting for an unlock that cannot come.
        if (status && (status as { initialized?: boolean }).initialized === false) {
          const waiting = ((await worker({ type: 'merit/signing/pending' }).catch(() => undefined))?.pending ?? []).find((p) => p.origin !== 'wallet' && !handled.has(p.id));
          if (!waiting) return;
          handled.add(waiting.id);
          try {
            await requestSignApproval({
              title: `Connect ${waiting.origin} with Merit`,
              message: 'This extension has no wallet set up yet, so there is no account to connect. Create a new wallet or import a Secret Recovery Phrase in the extension first, then connect again.',
              signerAddress: '',
              chainId: 31337,
              approveLabel: 'OK',
              rejectLabel: 'Cancel',
            });
          } catch {
            handled.delete(waiting.id);
            return;
          }
          await worker({ type: 'merit/signing/reject', id: waiting.id }).catch(() => undefined);
          clearPendingSignRequest();
          continue;
        }
        if (!status?.unlocked) return; // shown after the unlock gate opens
        const list = (await worker({ type: 'merit/signing/pending' })).pending ?? [];
        const next = list.find((p) => p.origin !== 'wallet' && !handled.has(p.id));
        if (!next) return;
        handled.add(next.id);
        // V11: a site asking for a COPY of an account key has its own screen (a warning and the wallet password), not the signing confirmation; closing it says no
        if (next.kind === 'transfer') {
          const password = await requestTransferApproval({ origin: next.origin, address: String(next.details?.address ?? '') });
          await worker(password ? { type: 'merit/signing/approve', id: next.id, input: { password } } : { type: 'merit/signing/reject', id: next.id }).catch(() => undefined);
          continue;
        }
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
