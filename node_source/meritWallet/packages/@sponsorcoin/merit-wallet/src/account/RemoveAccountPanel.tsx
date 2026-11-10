// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/RemoveAccountPanel.tsx
//
// 2026-11-08 (owner, docs/design/removeAccountPlan.txt rows 5 and 6): the red "Remove Account" button under the account details, and the plain confirmation it opens (no password: the account still exists in the wallet that holds it).
// The button's words, the dialog's words and the call all come from the AccountRemoval the screen was given (accountSource.ts); this file only draws them. Disabled (with the reason under it) for the active account.
'use client';

import { useState } from 'react';
import { dialogStyle, removeAccountStyle } from '@sponsorcoin/spcoin-common/styles';
import DialogPortal from '../DialogPortal';
import type { AccountRemoval } from './accountSource';

export interface RemoveAccountAccount {
  address: string;
  name?: string;
  symbol?: string;
  logoURL?: string;
}

export default function RemoveAccountPanel({ removal, account, onRemoved }: { removal: AccountRemoval; account: RemoveAccountAccount; onRemoved?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const disabled = !!removal.disabledReason;
  const confirm = () => {
    if (busy) return;
    setBusy(true);
    setError('');
    removal
      .remove()
      .then(() => {
        setConfirming(false);
        onRemoved?.();
      })
      .catch((err: unknown) => setError(err instanceof Error && err.message ? err.message : 'The account could not be removed.'))
      .finally(() => setBusy(false));
  };
  const close = () => {
    if (busy) return;
    setConfirming(false);
    setError('');
  };
  const title = [account.name, account.symbol].filter((part) => part && part !== 'N/A').join(' | ');
  return (
    <div id="REMOVE_ACCOUNT" style={removeAccountStyle.wrap}>
      <button type="button" disabled={disabled} title={removal.disabledReason} onClick={() => setConfirming(true)} style={removeAccountStyle.button(disabled, removal.destructive)}>
        {removal.label}
      </button>
      {removal.disabledReason ? <p style={removeAccountStyle.note}>{removal.disabledReason}</p> : null}
      {confirming ? (
        <DialogPortal>
          <div role="dialog" aria-modal="true" style={dialogStyle.backdrop}>
            <div style={removal.destructive ? dialogStyle.formCardDanger : dialogStyle.formCard}>
              <p style={dialogStyle.title}>{removal.title}</p>
              <p style={removeAccountStyle.account}>
                {account.logoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.logoURL} alt="" style={removeAccountStyle.accountImage} />
                ) : null}
                <span style={removeAccountStyle.accountText}>
                  <span>{title || 'Account'}</span>
                  <span style={removeAccountStyle.accountAddress}>{account.address}</span>
                </span>
              </p>
              <p style={dialogStyle.message}>{removal.message}</p>
              {error ? <p style={dialogStyle.error}>{error}</p> : null}
              <button type="button" onClick={confirm} disabled={busy} style={dialogStyle.dangerButton(busy, removal.destructive)}>
                {busy ? 'Working…' : removal.confirmLabel}
              </button>
              <button type="button" autoFocus onClick={close} style={dialogStyle.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </DialogPortal>
      ) : null}
    </div>
  );
}
