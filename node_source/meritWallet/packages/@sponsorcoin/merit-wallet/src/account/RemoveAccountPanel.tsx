// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/RemoveAccountPanel.tsx
//
// 2026-11-08 (owner, docs/design/removeAccountPlan.txt rows 5 and 6): the red "Remove Account" button under the account details, and the confirmation it opens (no password for another wallet's account: it still exists in the wallet that holds it).
// 2026-11-10 (rows 7 and 8, rules X5 and X6): a LOCAL account (removal.local) is confirmed with the wallet password, the loss warning and the private key (hidden, behind a Show / Hide toggle).
// 2026-11-10 (owner: "a better way is a message panel instead of a popup, so the address might fit"): the confirmation is shown in MESSAGE_PANEL, the wallet's one message panel, not in a popup: the words and the account row (icon, name, the whole
// address) are an ordinary message, and the password field, the Show / Hide Private Key toggle and the two buttons are the panel's pending-decision controls (approval/pendingApprovalMessageStore, the same ones the Add Account warning uses).
// The button's words, the confirmation's words and the call all come from the AccountRemoval the screen was given (accountSource.ts); this file only opens them. Disabled (with the reason under it) for the active account.
'use client';

import { removeAccountStyle } from '@sponsorcoin/spcoin-common/styles';
import { STATUS, MESSAGE_ACCOUNTS_MARKER } from '@sponsorcoin/spcoin-common/context';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { useExchangeContext, usePanelTree, panelStore, loadAccountRecord } from '@sponsorcoin/spcoin-exchange-engine';
import { pendingApprovalMessageStore } from '../approval/pendingApprovalMessageStore';
import { noticeAccountRows } from '../auth/useAccountNoticeMessagePanel';
import type { AccountRemoval } from './accountSource';
import { ensureAbsoluteAssetURL } from './form/formHelpers';

interface RemoveAccountAccount {
  address: string;
  name?: string;
  symbol?: string;
  logoURL?: string;
}

const SOURCE = 'RemoveAccount';

/**
 * While the confirmation is up this screen is replaced by the message panel, so a hook of this component cannot see the panel close (the screen is gone, then new). Watched here, at module level: once the panel has been seen open and then closes, the
 * decision controls are cleared (closing the message, the X or back, is the same as Cancel: nothing is removed).
 */
let stopWatching: (() => void) | undefined;
function clearWhenMessageCloses(): void {
  stopWatching?.();
  let seenOpen = panelStore.getPanelSnapshot(SP_COIN_DISPLAY.MESSAGE_PANEL);
  const off = panelStore.subscribePanel(SP_COIN_DISPLAY.MESSAGE_PANEL, () => {
    if (panelStore.getPanelSnapshot(SP_COIN_DISPLAY.MESSAGE_PANEL)) {
      seenOpen = true;
      return;
    }
    if (!seenOpen) return;
    off();
    stopWatching = undefined;
    pendingApprovalMessageStore.set(null);
  });
  stopWatching = off;
}

export default function RemoveAccountPanel({ removal, account, onRemoved, balanceText }: { removal: AccountRemoval; account: RemoveAccountAccount; onRemoved?: (message: string) => void; /** The account's balance when it is not zero (rule X5): shown with the loss warning of a local account. */ balanceText?: string }) {
  const { setErrorMessage } = useExchangeContext();
  const { openPanel, closePanel } = usePanelTree();
  const disabled = !!removal.disabledReason;
  const local = removal.local;

  const done = () => {
    stopWatching?.();
    stopWatching = undefined;
    pendingApprovalMessageStore.set(null);
    closePanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'RemoveAccount:done');
  };
  const open = async () => {
    // 2026-11-11 (owner: the account's avatar, name and symbol were missing in the confirmation): the confirmation is a snapshot, taken now, and the detail form may not have finished reading the profile. Ask the registry (cached, or the feed) here, so the row never shows less than is known.
    const known = (await loadAccountRecord(account.address).catch(() => undefined)) as { name?: unknown; symbol?: unknown; logoURL?: unknown } | undefined;
    const profile = { name: account.name || (typeof known?.name === 'string' ? known.name : undefined), symbol: account.symbol || (typeof known?.symbol === 'string' ? known.symbol : undefined), logoURL: typeof known?.logoURL === 'string' && known.logoURL ? ensureAbsoluteAssetURL(known.logoURL) : account.logoURL };
    // 2026-11-11 (owner): the Account Assets popup shows the account's native balance above its radio button
    const acknowledgements = local?.acknowledgements?.map((a) => (a.id === 'balances' && balanceText ? { ...a, detail: `Balance ${balanceText} native balance.` } : a));
    const keyTools = { acknowledgements, revealKey: local?.revealKey ? (pw: string) => local.revealKey!(pw) : undefined };
    const controls = (busy: boolean, passwordError: string) => ({
      requirePassword: !!local,
      passwordError,
      busy,
      panelTitle: removal.panelTitle,
      approveLabel: removal.confirmLabel,
      rejectLabel: 'Cancel',
      onReject: () => { if (!busy) done(); },
      onApprove: (password?: string) => {
        if (busy || (local && !password)) return;
        pendingApprovalMessageStore.set({ ...controls(true, ''), ...keyTools });
        removal
          .remove(local ? password : undefined)
          .then(() => {
            done();
            onRemoved?.(removal.doneMessage);
          })
          .catch((err: unknown) => {
            pendingApprovalMessageStore.set({ ...controls(false, err instanceof Error && err.message ? err.message : 'The account could not be removed.'), ...keyTools });
          });
      },
    });
    pendingApprovalMessageStore.set({ ...controls(false, ''), ...keyTools });
    const lines = [removal.message];
    if (local && balanceText) lines.push('', `Balance: ${balanceText} (native coin)`);
    const rows = noticeAccountRows([account.address], () => ({ name: profile.name, symbol: profile.symbol, iconSrc: profile.logoURL }));
    setErrorMessage({
      errCode: 0,
      msg: rows.length ? `${MESSAGE_ACCOUNTS_MARKER}\n${lines.join('\n')}` : lines.join('\n'),
      source: SOURCE,
      status: STATUS.WARNING,
      accounts: rows,
    });
    openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, 'RemoveAccount:confirm');
    clearWhenMessageCloses();
  };

  return (
    <div id="REMOVE_ACCOUNT" style={removeAccountStyle.wrap}>
      <button type="button" disabled={disabled} title={removal.disabledReason} onClick={() => { void open(); }} style={removeAccountStyle.button(disabled, removal.destructive)}>
        {removal.label}
      </button>
      {removal.disabledReason ? <p style={removeAccountStyle.note}>{removal.disabledReason}</p> : null}
    </div>
  );
}
