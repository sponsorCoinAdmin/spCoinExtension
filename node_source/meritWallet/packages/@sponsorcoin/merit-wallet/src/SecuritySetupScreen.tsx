// File: src/SecuritySetupScreen.tsx
//
// 2026-11-13 (owner request: "put all the options on this page with a checkbox in front of each; unchecked: do not expand it; checked: open it; this is also the screen the Config option check opens to set up"):
// the ONE sign-in options screen. First-run setup shows it as the third page (password -> Secret Recovery Phrase -> this -> warning, with Skip / Continue), and Config -> Security shows the same screen (no Skip button).
// Every option is a check box row: unticked it is just its title; ticked it opens. Ticking one that is not set up opens its setup; ticking one that is set up switches it on; unticking switches it off (the setup is kept).
// The password is always on. Passcode and a phone or email code are listed as coming soon. The host supplies what is kept and checked (enrollTotp / enrollPasskey / signIn); an option the host does not supply is not offered.
'use client';

import { assetPreviewRowStyle, formKitStyle, recoveryPhraseStyle } from '@sponsorcoin/spcoin-common/styles';
import { STATIC_INFO_ICON_URL } from '@sponsorcoin/spcoin-feeds/shared';
import { useState, type ReactNode } from 'react';
import { LOCAL_STORAGE_WARNING } from './SecurityWarningScreen';
import { useCopyFeedback } from './platform/useCopyFeedback';
import { passkeysSupported, registerPasskey, type PasskeyRegistration } from './security/passkey';
import type { SignInHost, SignInOptions } from './security/signInOptions';
import { generateTotpSecret, otpauthUri, verifyTotp } from './security/totp';

export interface SecuritySetupHost {
  /** Keep a verified authenticator-app secret. Omitted: the authenticator app is not offered. */
  enrollTotp?(secret: string): Promise<void>;
  /** Keep a registered passkey. Omitted: the passkey is not offered. */
  enrollPasskey?(registration: PasskeyRegistration): Promise<void>;
  /** The name shown in the authenticator app / passkey list (the account address or wallet name). */
  accountLabel?: string;
  /** The device's passkey store (the browser's navigator.credentials), injected so the shared component never touches the device. Omitted: the passkey is not offered. */
  credentials?: CredentialsContainer;
  /** What is switched on and set up, and the checks the unlock screen runs. Omitted: the screen only sets things up for this visit (no switches are kept). */
  signIn?: SignInHost;
}

export interface SecuritySetupScreenProps extends SecuritySetupHost {
  /** First-run setup: Skip / Continue. Omitted: the screen sits inside Config -> Security (no button). */
  onDone?(): void;
  /** Injected for tests. */
  makeSecret?: () => string;
  /** 2026-11-13 (owner): Config's Password Protection settings (modes, time limit, mandatory options), shown under the "Use password" check box; unticking the box only hides them (the password itself is always on). */
  passwordContent?: ReactNode;
  /** 2026-11-13 (owner): Config's Logoff / Reset Password / Remove Account buttons, at the bottom of the check box list. */
  accountButtons?: ReactNode;
}

export const TOTP_INFO =
  'An authenticator app keeps a secret key and turns it into a 6 digit code that changes every 30 seconds. When a second step is asked for, you type the current code. Someone who knows your password still cannot approve without your phone. If you lose the phone, set it up again.';
export const PASSKEY_INFO =
  'A passkey is a private key held by this device, your phone or a security key, and unlocked with your fingerprint, face or screen lock. It never leaves the device and cannot be phished. Approving means unlocking the device instead of typing a code. If you lose the device, set it up again.';
const PASSWORD_INFO = 'The password unlocks this wallet on this device and protects its keys, so it is always on and cannot be switched off. Press its name to show or hide its settings.';
const PASSCODE_INFO = 'A short number you type to unlock the wallet. Coming soon.';
const MFA_INFO = 'A code sent to your phone or email as a further step. It needs the Merit server to send the message. Coming soon.';

const muted = formKitStyle.muted;
const box = formKitStyle.box('12px');

/**
 * An option's header line: its name (press it to open or close the option), a check box that only says whether the method is ACTIVE, and the info icon at the end of the line (the same icon the lists use);
 * pressing the icon shows what the option is for. An option with no `expanded` (coming soon) has a plain name.
 */
export function OptionTitle({ id, title, info, expanded, onToggle, active }: { id: string; title: string; info: string; expanded?: boolean; onToggle?(): void; active: { checked: boolean; disabled?: boolean; onChange(next: boolean): void } }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <div style={recoveryPhraseStyle.titleRow}>
        <div style={recoveryPhraseStyle.saveLabel}>
          {expanded === undefined ? (
            <span style={formKitStyle.heading}>{title}</span>
          ) : (
            <button type="button" id={`${id}_HEADER`} aria-expanded={expanded} onClick={onToggle} style={recoveryPhraseStyle.iconButton('inherit')}>
              <span style={formKitStyle.heading}>{expanded ? '▾' : '▸'} {title}</span>
            </button>
          )}
          <input type="checkbox" id={`${id}_CHECK`} aria-label={`${title}: active`} title={active.checked ? 'Active' : 'Not active'} checked={active.checked} disabled={active.disabled} onChange={(e) => active.onChange(e.target.checked)} />
        </div>
        <button type="button" id={id} aria-label={`About ${title}`} title={info} onClick={() => setShown((open) => !open)} style={assetPreviewRowStyle.button(true)}>
          <img src={STATIC_INFO_ICON_URL} alt="Info" style={assetPreviewRowStyle.img} />
        </button>
      </div>
      {shown && <p id={`${id}_TEXT`} style={muted}>{info}</p>}
    </>
  );
}

type Key = keyof SignInOptions;

export default function SecuritySetupScreen({ enrollTotp, enrollPasskey, credentials, accountLabel = 'Merit Wallet', signIn, onDone, makeSecret = generateTotpSecret, passwordContent, accountButtons }: SecuritySetupScreenProps) {
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  // which rows are open: pressing a name opens or closes it (the password's settings start open; the check boxes only say whether a method is active)
  const [open, setOpen] = useState<Record<Key | 'password', boolean>>({ password: true, passkey: false, totp: false });
  const [localDone, setLocalDone] = useState<Record<Key, boolean>>({ passkey: false, totp: false });
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { copied, copy } = useCopyFeedback();
  const canPasskey = !!enrollPasskey && !!credentials && passkeysSupported(credentials);

  const enrolled = (key: Key) => (signIn ? signIn.enrolled()[key] : localDone[key]);
  const anyEnrolled = enrolled('passkey') || enrolled('totp');

  const active = (key: Key) => (signIn ? signIn.options()[key] : localDone[key]);

  // pressing a name: open or close the option; opening the authenticator when it is not set up starts its setup
  const toggleOpen = (key: Key | 'password') => {
    setError('');
    const next = !open[key];
    setOpen((previous) => ({ ...previous, [key]: next }));
    if (key === 'totp') {
      if (next && !enrolled('totp') && !secret) setSecret(makeSecret());
      if (!next && !enrolled('totp')) {
        setSecret('');
        setCode('');
      }
    }
  };

  // the check box: switch a method on or off. A method that is not set up cannot be on, so ticking it opens its setup (it turns on when the setup finishes).
  const setActive = (key: Key, on: boolean) => {
    setError('');
    if (!on) {
      signIn?.setOption(key, false);
      if (!signIn) setLocalDone((previous) => ({ ...previous, [key]: false }));
    } else if (enrolled(key)) {
      signIn?.setOption(key, true);
    } else {
      setOpen((previous) => ({ ...previous, [key]: true }));
      if (key === 'totp' && !secret) setSecret(makeSecret());
    }
    refresh();
  };

  const startTotpAgain = () => {
    setError('');
    setSecret(makeSecret());
    setCode('');
  };

  const confirmTotp = async () => {
    setBusy(true);
    setError('');
    try {
      if (!(await verifyTotp(secret, code))) throw new Error('That code did not match. Check the code in your app and try again.');
      await enrollTotp?.(secret);
      setLocalDone((previous) => ({ ...previous, totp: true }));
      setSecret('');
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The authenticator app could not be added.');
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const addPasskey = async () => {
    setBusy(true);
    setError('');
    try {
      await enrollPasskey?.(await registerPasskey({ id: accountLabel, name: accountLabel }, credentials!));
      setLocalDone((previous) => ({ ...previous, passkey: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The passkey could not be added.');
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const totpSettingUp = open.totp && !!secret && !enrolled('totp');
  return (
    <div id="WALLET_ONBOARDING_SECURITY" style={onDone ? formKitStyle.scrollBox(12) : box}>
      <p style={formKitStyle.heading}>{onDone ? 'Protect your wallet (optional)' : 'Sign-in options'}</p>
      <p style={muted}>Choose what the wallet asks for when you unlock it. A second step proves it is really you, so a password alone is not enough. Press an option's name to open it and set it up; its box says whether it is active.{onDone ? ' You can change these later in Config, Security.' : ''}</p>

      <OptionTitle id="WALLET_SIGN_IN_PASSWORD" title="Use password" info={PASSWORD_INFO} expanded={passwordContent ? open.password : undefined} onToggle={() => toggleOpen('password')} active={{ checked: true, disabled: true, onChange: () => undefined }} />
      {passwordContent && open.password && <div id="WALLET_SIGN_IN_PASSWORD_CARD" style={box}>{passwordContent}</div>}

      {enrollPasskey && (
        <>
          <OptionTitle id="WALLET_SIGN_IN_PASSKEY" title={canPasskey ? 'Use passkey' : 'Use passkey (not available in this browser)'} info={PASSKEY_INFO} expanded={open.passkey} onToggle={() => toggleOpen('passkey')} active={{ checked: active('passkey'), disabled: !canPasskey, onChange: (on) => setActive('passkey', on) }} />
          {open.passkey && (
            <div id="WALLET_SECURITY_PASSKEY_CARD" style={box}>
              {enrolled('passkey') ? (
                <>
                  <p id="WALLET_SECURITY_PASSKEY_DONE" style={muted}>Passkey is set up. The wallet asks for it when you unlock.</p>
                  <button type="button" id="WALLET_SECURITY_PASSKEY_ADD" disabled={busy} style={formKitStyle.ghost} onClick={() => void addPasskey()}>{busy ? 'Waiting for your device…' : 'Set up another passkey'}</button>
                </>
              ) : (
                <>
                  <p style={muted}>Use your fingerprint, face or screen lock, or a security key, instead of typing a code. Nothing to type or remember.</p>
                  <button type="button" id="WALLET_SECURITY_PASSKEY_ADD" disabled={busy} style={formKitStyle.ghost} onClick={() => void addPasskey()}>{busy ? 'Waiting for your device…' : 'Set up passkey'}</button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {enrollTotp && (
        <>
          <OptionTitle id="WALLET_SIGN_IN_TOTP" title="Use authenticator app" info={TOTP_INFO} expanded={open.totp} onToggle={() => toggleOpen('totp')} active={{ checked: active('totp'), onChange: (on) => setActive('totp', on) }} />
          {open.totp && (
            <div id="WALLET_SECURITY_TOTP_CARD" style={box}>
              {totpSettingUp ? (
                <div id="WALLET_SECURITY_TOTP" style={box}>
                  <p style={muted}>A free app on your phone (Google Authenticator, Microsoft Authenticator, 1Password or Authy) that shows a new 6 digit code every 30 seconds.</p>
                  <p style={muted}>1. Open your authenticator app and choose "Add account" then "Enter a setup key".</p>
                  <p style={muted}>2. Type or copy this key into it:</p>
                  <input id="WALLET_SECURITY_TOTP_SECRET" readOnly value={secret} style={formKitStyle.input} onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" style={formKitStyle.ghost} onClick={() => copy(secret)}>{copied ? 'Copied' : 'Copy key'}</button>
                  <a href={otpauthUri(secret, accountLabel)} style={muted}>Open in an authenticator app on this device</a>
                  <p style={muted}>3. Type the 6 digit code the app now shows:</p>
                  <input id="WALLET_SECURITY_TOTP_CODE" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="6 digit code" value={code} onChange={(e) => setCode(e.target.value)} style={formKitStyle.input} />
                  <button type="button" disabled={busy || code.replace(/\s/g, '').length !== 6} style={formKitStyle.primaryDim(busy || code.replace(/\s/g, '').length !== 6)} onClick={() => void confirmTotp()}>{busy ? 'Checking…' : 'Verify and add'}</button>
                </div>
              ) : (
                <>
                  <p id="WALLET_SECURITY_TOTP_DONE" style={muted}>Authenticator app is set up. The wallet asks for its code when you unlock.</p>
                  <button type="button" id="WALLET_SECURITY_TOTP_ADD" disabled={busy} style={formKitStyle.ghost} onClick={startTotpAgain}>Set up again</button>
                </>
              )}
            </div>
          )}
        </>
      )}

      <OptionTitle id="WALLET_SIGN_IN_PASSCODE" title="Use passcode (coming soon)" info={PASSCODE_INFO} active={{ checked: false, disabled: true, onChange: () => undefined }} />
      <OptionTitle id="WALLET_SIGN_IN_MFA" title="Use phone or email code (coming soon)" info={MFA_INFO} active={{ checked: false, disabled: true, onChange: () => undefined }} />

      {accountButtons}

      {/* in first-run setup the warning is its own page (SecurityWarningScreen); inside Config -> Security it stays here as a note */}
      {!onDone && (
        <div id="WALLET_SECURITY_LOCAL_WARNING" role="note">
          <p style={formKitStyle.error}>Stored only on this device</p>
          {LOCAL_STORAGE_WARNING.map((line) => <p key={line} style={muted}>{line}</p>)}
        </div>
      )}

      {error && <p style={formKitStyle.error}>{error}</p>}
      {onDone && <button type="button" id="WALLET_SECURITY_DONE" disabled={totpSettingUp} style={formKitStyle.primaryDim(totpSettingUp)} onClick={onDone}>{anyEnrolled ? 'Continue' : 'Skip for now'}</button>}
    </div>
  );
}
