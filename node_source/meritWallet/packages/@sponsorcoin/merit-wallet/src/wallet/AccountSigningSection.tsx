// File: src/wallet/AccountSigningSection.tsx
//
// 2026-10-12 (docs/design/accountAuthDesign.txt row 15): "Who signs" for the active account, in the Config tab of every host. Lists the holders of the account (src/wallet/accountSigning.ts), marks the one that signs now, says in words when it cannot be
// reached, and switches with one click when the account has more than one holder (5.6: instant, nothing copied or lost). An account with one holder just says who signs; with no account it says so.
'use client';

import { configSectionStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useCallback, useEffect, useState } from 'react';
import { SmallYellowButton } from '@sponsorcoin/spcoin-panels';
import type { AuthenticatorId } from '../auth/authenticator';
import { chooseSigner, readSigningChoices, type HolderState, type SigningChoices } from './accountSigning';
import type { Wallet } from './wallet';

const STATE_TEXT: Record<HolderState, string> = { ready: '', locked: 'locked', unreachable: 'not reachable' };

export default function AccountSigningSection({ wallet, address }: { wallet: Wallet; address: string | undefined }) {
  const [choices, setChoices] = useState<SigningChoices | undefined>(undefined);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!address) return setChoices(undefined);
    setChoices(await readSigningChoices(wallet, address).catch(() => undefined));
  }, [wallet, address]);

  useEffect(() => {
    void load();
    return wallet.onChange(() => void load());
  }, [wallet, load]);

  if (!address) return <p style={configSectionStyle.note}>Select an account to see who signs for it.</p>;
  if (!choices) return <p style={configSectionStyle.note}>Reading who signs for this account...</p>;

  const choose = async (id: AuthenticatorId | undefined) => {
    setError('');
    try {
      setChoices(await chooseSigner(wallet, address, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    }
  };
  const active = choices.holders.find((h) => h.isActive);

  return (
    <div style={configSectionStyle.column(8)}>
      <p style={configSectionStyle.note}>
        {active ? `${active.label} signs for this account${active.where ? ` (its keys are on ${active.where})` : ''}.` : 'No wallet holds this account here.'}
        {!choices.savedId && active ? ' This is the app default; you have not chosen one.' : ''}
      </p>
      {choices.holders.length > 1 ? (
        <div role="radiogroup" aria-label="Who signs" style={configSectionStyle.radioGroup}>
          {choices.holders.map((holder) => (
            <label key={holder.id} style={configSectionStyle.radioRow}>
              <input type="radio" name="spcoin-account-signer" checked={holder.isActive} onChange={() => void choose(holder.id)} />
              <span>{holder.label}</span>
              {holder.where ? <span style={configSectionStyle.muted}>({holder.where})</span> : null}
              {holder.state !== 'ready' ? <span style={configSectionStyle.warn}>{STATE_TEXT[holder.state]}</span> : null}
            </label>
          ))}
        </div>
      ) : null}
      {choices.warning ? <p style={configSectionStyle.bad}>{choices.warning}</p> : null}
      {error ? <p style={configSectionStyle.bad}>{error}</p> : null}
      {choices.savedId ? (
        <div>
          <SmallYellowButton onClick={() => void choose(undefined)}>Use the app default</SmallYellowButton>
        </div>
      ) : null}
    </div>
  );
}
