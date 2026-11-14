// File: src/UnlockSecondStep.tsx
//
// 2026-11-13 (owner request: sign-in options): after the password is typed on the unlock screen, the steps the person switched on in Config -> Security (passkey, authenticator app) are asked for here, and only when every
// one passes does the unlock go ahead (MeritWallet then calls the host's password submit). These steps are checked on this device.
'use client';

import { formKitStyle } from '@sponsorcoin/spcoin-common/styles';
import { useEffect, useRef, useState } from 'react';
import type { SignInHost, SignInOptions } from './security/signInOptions';

const muted = formKitStyle.muted;

export default function UnlockSecondStep({ steps, signIn, onPassed, onCancel }: { steps: SignInOptions; signIn: SignInHost; onPassed(): void; onCancel(): void }) {
  const [passkeyOk, setPasskeyOk] = useState(!steps.passkey);
  const [totpOk, setTotpOk] = useState(!steps.totp);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const started = useRef(false);
  // The passkey is used as soon as this step shows: no button to press, the device asks straight away (a Try again button appears only if it was refused).
  useEffect(() => {
    if (!steps.passkey || started.current) return;
    started.current = true;
    void usePasskey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usePasskey = async () => {
    setBusy(true);
    setError('');
    const ok = await signIn.verifyPasskey();
    setBusy(false);
    if (!ok) return setError('The passkey was not confirmed.');
    setPasskeyOk(true);
    if (totpOk) onPassed();
  };
  const checkCode = async () => {
    setBusy(true);
    setError('');
    const ok = await signIn.verifyTotp(code);
    setBusy(false);
    if (!ok) return setError('That code did not match. Check the code in your app and try again.');
    setTotpOk(true);
    setCode('');
    if (passkeyOk) onPassed();
  };

  const codeReady = code.replace(/\s/g, '').length === 6;
  return (
    <div id="WALLET_UNLOCK_SECOND_STEP" style={formKitStyle.box('12px')}>
      {passkeyOk && <p style={formKitStyle.heading}>One more step</p>}
      {!passkeyOk && (
        <>
          <p style={muted}>{error ? 'Your passkey was not confirmed.' : 'Confirm with your passkey on this device…'}</p>
          {!busy && error && <button type="button" id="WALLET_UNLOCK_PASSKEY" style={formKitStyle.primary} onClick={() => void usePasskey()}>Try again</button>}
        </>
      )}
      {passkeyOk && !totpOk && (
        <>
          <p style={muted}>Type the 6 digit code from your authenticator app.</p>
          <input id="WALLET_UNLOCK_TOTP_CODE" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="6 digit code" value={code} onChange={(e) => setCode(e.target.value)} style={formKitStyle.input} />
          <button type="button" id="WALLET_UNLOCK_TOTP" disabled={busy || !codeReady} style={formKitStyle.primaryDim(busy || !codeReady)} onClick={() => void checkCode()}>{busy ? 'Checking…' : 'Unlock'}</button>
        </>
      )}
      {error && passkeyOk && <p style={formKitStyle.error}>{error}</p>}
      <button type="button" id="WALLET_UNLOCK_CANCEL" style={formKitStyle.ghost} onClick={onCancel}>Back</button>
    </div>
  );
}
