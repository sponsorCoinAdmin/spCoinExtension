// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AccountPrivateKeyRow.tsx
//
// docs/meritMigration.txt row 14 -- the Private Key row of the account detail table, written once in the package (it was the web app's PrivateKeyRow). Click-to-reveal with a password step-up: the host's revealPrivateKey is tried
// first without a password (the host may hold an approved, cached one) and, when it answers PasswordRequiredError, the shared PasswordPromptDialog asks for the wallet password. The key is shown in a field that hides again on a click.
// The row itself never talks to a server: how a key is revealed (the web app's keystore route, the extension's vault) is the host's function.
'use client';

import { accountFormClass, privateKeyRowClass } from '@sponsorcoin/spcoin-common/styles';
import React, { useCallback, useState } from 'react';
import PasswordPromptDialog from '../PasswordPromptDialog';
import { useCopyFeedback } from '../platform/useCopyFeedback';

/** Thrown by a host's revealPrivateKey when it needs the wallet password (none given, or the cached one no longer works). */
export class PasswordRequiredError extends Error {
  constructor(message = 'The wallet password is required.') {
    super(message);
    this.name = 'PasswordRequiredError';
  }
}

export const isPasswordRequired = (error: unknown): boolean => error instanceof PasswordRequiredError || (error as { name?: unknown } | undefined)?.name === 'PasswordRequiredError';

type Mode = 'masked' | 'confirming' | 'revealed';

export default function AccountPrivateKeyRow({
  address,
  reveal,
  idPrefix = '',
  zebra,
  cell,
}: {
  address: string;
  /** The host's reveal: with no password it may succeed from an approved cached one, else it throws PasswordRequiredError; a wrong password throws a readable Error. */
  reveal(address: string, password?: string): Promise<string>;
  idPrefix?: string;
  zebra: string;
  cell: string;
}) {
  const [mode, setMode] = useState<Mode>('masked');
  const [key, setKey] = useState('');
  const [trying, setTrying] = useState(false);
  const { copied, copy: copyText } = useCopyFeedback();
  const [error, setError] = useState('');

  const hide = useCallback(() => {
    setMode('masked');
    setKey('');
    setError('');
  }, []);

  const attempt = useCallback(async () => {
    setTrying(true);
    setError('');
    try {
      setKey(await reveal(address));
      setMode('revealed');
    } catch (e) {
      if (isPasswordRequired(e)) setMode('confirming');
      else setError(e instanceof Error ? e.message : 'The key could not be revealed.');
    } finally {
      setTrying(false);
    }
  }, [address, reveal]);

  const copy = () => {
    if (key) copyText(key);
  };

  return (
    <>
      <div className={accountFormClass.contents}>
        <div className={accountFormClass.labelCell(zebra, cell)}>Private Key</div>
        <div className={accountFormClass.valueCell(zebra, cell)}>
          {mode === 'revealed' ? (
            <>
              <div className={accountFormClass.inputLine}>
                <input id={`${idPrefix}privateKey`} type="text" readOnly value={key} title="Click to hide" onClick={hide} className={privateKeyRowClass.revealedInput} />
                <button type="button" onClick={copy} title="Copy private key" className={privateKeyRowClass.copy}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className={privateKeyRowClass.footerRow}>
                <p className={privateKeyRowClass.warn}>Keep this private.</p>
                <button type="button" onClick={hide} className={privateKeyRowClass.hide}>Hide</button>
              </div>
            </>
          ) : trying ? (
            <span className={privateKeyRowClass.loading}>Loading…</span>
          ) : (
            <>
              <button type="button" onClick={() => void attempt()} title="Click to reveal — password required" className={privateKeyRowClass.reveal}>
                ***...***
              </button>
              {error && <p className={privateKeyRowClass.error}>{error}</p>}
            </>
          )}
        </div>
      </div>
      {mode === 'confirming' ? (
        <PasswordPromptDialog
          title="Keep your private key private"
          message="Anyone with this key controls the account and everything in it. Enter your wallet password to reveal it."
          confirmLabel="Reveal"
          onConfirm={async (password) => {
            setKey(await reveal(address, password));
            setMode('revealed');
          }}
          onClose={hide}
        />
      ) : null}
    </>
  );
}
