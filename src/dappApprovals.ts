// File: src/dappApprovals.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E6 / table row 18) -- the side panel's half of "a web page asked the wallet for something".
// The worker queues each page request (connect, sign, send) in the approval queue; this file shows the extension's existing always-explicit
// confirmation screen for each one, one at a time, and then tells the worker to approve or reject it. Nothing happens to a request until the user
// answers here. Requests wait while the wallet is locked and are shown right after it is unlocked.
import { requestSignApproval, type PendingSignRequest } from './pendingSignRequestStore';
import { clearPendingSignRequest } from './pendingSignRequestStore';
import { requestTransferApproval } from './transferApprovalStore';
import { remoteSelectionStore, requestRemoteSelection } from './remoteSelectionStore';
import { traceFrom } from './debugTrace';

interface PendingItem {
  id: string;
  kind: 'sign' | 'transaction' | 'connect' | 'transfer';
  origin: string;
  summary: string;
  details?: Record<string, unknown>;
}
type Reply = { ok: boolean; unlocked?: boolean; initialized?: boolean; pending?: PendingItem[]; chainId?: number; active?: string };
const worker = (message: unknown) => chrome.runtime.sendMessage(message) as Promise<Reply>;

/** The chain's native token (the address every token list uses for ETH). */
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/** The names of the calls a person is most likely asked to approve, by their 4-byte selector (Uniswap V3 SwapRouter02 and the ERC-20 basics). Anything else shows its selector. */
const METHOD_NAMES: Record<string, string> = {
  '0x04e45aaf': 'exactInputSingle',
  '0xb858183f': 'exactInput',
  '0x5023b4df': 'exactOutputSingle',
  '0x09b81346': 'exactOutput',
  '0x5ae401dc': 'multicall',
  '0xac9650d8': 'multicall',
  '0xa9059cbb': 'transfer',
  '0x095ea7b3': 'approve',
  '0x23b872dd': 'transferFrom',
};
const methodNameOf = (data: string): string => METHOD_NAMES[data.slice(0, 10).toLowerCase()] ?? data.slice(0, 10);

/** A whole-number string of base units as a decimal string (7000000000000 with 18 decimals is 0.000007). */
function formatUnits(value: string, decimals: number): string {
  if (!/^\d+$/.test(value)) return value;
  const padded = value.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(padded.length - decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

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
    const txChain = Number(d.chainId ?? chainId);
    const assetChain = txChain === 31337 ? 8453 : txChain; // the dev chain shows the Base images
    const isContractCall = !!d.data && d.data !== '0x' && !!d.to;
    // 2026-11-05 (owner request): the contract appears once, with its own image, then the method, the amount in wei and the amount in the chain's token (with its image)
    const rows: NonNullable<PendingSignRequest['rows']> = [];
    if (isContractCall) {
      rows.push({ label: 'To Contract', value: String(d.to), token: { address: String(d.to), chainId: assetChain }, copy: true, mono: true });
      rows.push({ label: 'Method', value: methodNameOf(String(d.data)) });
    }
    rows.push({ label: 'Amount in Wei', value: wei });
    rows.push({ label: 'Amount in token', value: `${formatUnits(wei, 18)} ETH`, token: { address: NATIVE_TOKEN_ADDRESS, chainId: assetChain } });
    return {
      title: `Transaction from ${item.origin}`,
      signerAddress: String(d.from ?? activeAddress),
      chainId: txChain,
      accounts: !isContractCall && d.to ? [{ role: 'TO', address: String(d.to) }] : undefined,
      rows,
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
        // 2026-10-31 (owner design): a site asking to connect opens the wallet's own account list (the remote account selector): the person ticks which accounts the site may see and presses Done.
        if (next.kind === 'connect' && !next.details?.confirm) {
          traceFrom('panel', `account selector opened for ${next.origin}`);
          // 2026-11-01: the wallet is unlocked and its account selector is what the person sees: only now is the page told ONCE (its waiting notice and its "Connecting..." screen close); while the wallet shows its login, the page keeps waiting
          traceFrom('panel', `telling ${next.origin} its request is on the wallet screen`);
          void worker({ type: 'merit/connect/presented', origin: next.origin } as never).catch(() => undefined);
          // live connect (owner design, no Done): the first account connected answers the site's request at once (its waiting notice closes); the selector stays open and every later change is applied to the site's accounts immediately.
          // Closing the selector (Cancel / back) with nothing connected refuses the request.
          let answered = false;
          let queue: Promise<unknown> = Promise.resolve();
          const apply = (selected: string[]) => {
            queue = queue.then(async () => {
              if (!answered) {
                if (!selected.length) return;
                answered = true;
                traceFrom('panel', `account selector connected ${selected.length} account(s) for ${next.origin}`);
                await worker({ type: 'merit/signing/approve', id: next.id, input: { accounts: selected } } as never).catch(() => undefined);
                return;
              }
              traceFrom('panel', `account selector now shares ${selected.length} account(s) with ${next.origin}`);
              await worker({ type: 'merit/permissions/set', origin: next.origin, accounts: selected } as never).catch(() => undefined);
            });
          };
          // 2026-11-06 (owner: the caller's connected accounts show as connected when the selector opens): the selector starts from the accounts the site already holds, and a site that holds some is answered with them at once
          const held = (((await worker({ type: 'merit/permissions/get', origin: next.origin } as never).catch(() => undefined)) as { accounts?: unknown } | undefined)?.accounts ?? []) as string[];
          if (held.length) {
            answered = true;
            traceFrom('panel', `account selector opened with ${held.length} account(s) already connected for ${next.origin}`);
            await worker({ type: 'merit/signing/approve', id: next.id, input: { accounts: held } } as never).catch(() => undefined);
          }
          // the caller (the web app) may change the connected accounts while the selector is open (its own Connect / Disconnect): the extension stores that as the site's permission, and the rows follow it
          const followCaller = (changes: Record<string, { newValue?: unknown }>, area: string) => {
            const all = changes.spcoin_merit_permissions?.newValue as Record<string, unknown> | undefined;
            if (area !== 'local' || !all) return;
            const list = Array.isArray(all[next.origin]) ? (all[next.origin] as unknown[]).filter((a): a is string => typeof a === 'string') : [];
            traceFrom('panel', `account selector follows ${next.origin}: ${list.length} account(s) connected`);
            remoteSelectionStore.sync(list);
            if (!answered && list.length) apply(list);
          };
          chrome.storage.onChanged.addListener(followCaller as never);
          try {
            await requestRemoteSelection({ caller: 'Merit (Web)', origin: next.origin, selected: held, onChange: apply });
          } finally {
            chrome.storage.onChanged.removeListener(followCaller as never);
          }
          await queue;
          if (!answered) {
            traceFrom('panel', 'account selector cancelled');
            await worker({ type: 'merit/signing/reject', id: next.id }).catch(() => undefined);
          }
          continue;
        }
        // 2026-11-03 (owner): connecting the WALLET is the plain confirmation page (the site, Cancel / Connect); the page is told once it is on screen
        if (next.kind === 'connect') void worker({ type: 'merit/connect/presented', origin: next.origin } as never).catch(() => undefined);
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
