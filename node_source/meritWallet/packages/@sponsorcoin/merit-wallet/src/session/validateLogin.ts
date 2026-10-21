// File: src/session/validateLogin.ts
//
// 2026-10-13 (docs/passwordSecurityToDo.txt P2 / P3; docs/design/passwordSecurity.txt section 7): the login state and ValidateLogin.
//
// ValidateLogin answers ONE question, cheaply, on every panel change and every write: what must happen before this request may proceed? It is a PURE, constant-time function of
// (password mode, login state, request kind, the mandatory flags). It reads nothing else: no storage, no server, no password, nothing async. Everything slow belongs to the EVENT
// that changes the login state (boot resolved, unlock, lock, timeout, a mode change), never to this check.
//
// loginState is a USER-INTERFACE state, not the security boundary: it decides what the screens show. The sign and reveal routes still demand a valid unlock token or the password.

/** UNKNOWN is the boot window (the status check, and in Persisted the stored-password restore, are still in flight). */
export type LoginState = 'UNKNOWN' | 'LOGGED_OUT' | 'LOGGED_IN';

/** BROWSE: open or show a panel. WRITE: a billable blockchain write that returns a receipt, or a message signature (both use the account's key). */
export type LoginRequestKind = 'BROWSE' | 'WRITE';

/**
 * NONE: go ahead. WAIT: the login state is not resolved yet, draw NOTHING (no content, no login that may vanish). LOGIN: show the login (password) page; it also satisfies a password need.
 * PASSWORD: ask for the password for this request (entered on the approval screen, so the transaction stays visible; the password IS the approval). APPROVE: an Approve / Reject click.
 */
export type LoginRequirement = 'NONE' | 'WAIT' | 'LOGIN' | 'PASSWORD' | 'APPROVE';

export interface ValidateLoginInput {
  /** passwordMode: 'appRequired' (App), 'firstApproved' (Initial), 'methodRequired' (All), 'persisted', 'disabled'. Anything else is treated as App (the default). */
  mode: string;
  loginState: LoginState;
  kind: LoginRequestKind;
  /** The method asks for the password whatever the mode says (today: the private-key reveal) AND the Mandatory Password Required setting is on. */
  mandatoryPassword?: boolean;
  /** The All Transaction Approval Required setting (Mandatory Approval). */
  mandatoryApproval?: boolean;
}

export function validateLogin(input: ValidateLoginInput): LoginRequirement {
  const { mode, loginState, kind } = input;
  // Disabled: no login, no prompt, ever (development only), except a mandatory method, which ignores the mode's shortcuts (passwordSecurity.txt 1.2).
  if (mode === 'disabled' && !input.mandatoryPassword) return 'NONE';
  // Initial: the wallet may be browsed while logged out; only a WRITE needs the login (rule 1).
  const browseNeedsLogin = mode !== 'firstApproved';
  if (kind === 'BROWSE' && !browseNeedsLogin && !input.mandatoryPassword) return 'NONE';
  // Boot window: draw nothing (owner rule 2026-10-13: no page flashes before the password page).
  if (loginState === 'UNKNOWN') return 'WAIT';
  // Not logged in: the login page (it also satisfies a password need, so one prompt at most).
  if (loginState === 'LOGGED_OUT') return 'LOGIN';
  // Logged in. A mandatory method asks for the password in every mode.
  if (input.mandatoryPassword) return 'PASSWORD';
  if (kind === 'BROWSE') return 'NONE';
  // A write: All asks for the password (it is the approval); the other modes use the Approve button when Mandatory Approval is on.
  if (mode === 'methodRequired') return 'PASSWORD';
  return input.mandatoryApproval ? 'APPROVE' : 'NONE';
}

/** True when the wallet's panels must not be shown as content: the gate is closed (login needed, or still waiting). Used by the panel-change chokepoint. */
export function isLoginGateClosed(mode: string, loginState: LoginState): boolean {
  return validateLogin({ mode, loginState, kind: 'BROWSE' }) !== 'NONE';
}

/** The login state from the facts the wallet already tracks. Called only when one of them changes, never per request. */
export function deriveLoginState(facts: { bootResolved: boolean; hasWalletPassword: boolean | null; isWalletLocked: boolean }): LoginState {
  if (!facts.bootResolved) return 'UNKNOWN';
  return facts.hasWalletPassword === true && !facts.isWalletLocked ? 'LOGGED_IN' : 'LOGGED_OUT';
}

/**
 * The login state the wallet publishes, in the order the web host applies the rules: a NEW wallet's recovery phrase that has not been acknowledged yet keeps the state LOGGED_OUT (the wallet stays on the login page, which shows the phrase) even though the password
 * exists and the wallet is unlocked; the dev-only gate bypass reads as logged in, so every enforcement path stands down together; otherwise the facts decide (deriveLoginState).
 */
export function resolveLoginState(facts: { pendingRecoveryPhrase: boolean; devGateBypassed: boolean; bootResolved: boolean; hasWalletPassword: boolean | null; isWalletLocked: boolean }): LoginState {
  if (facts.pendingRecoveryPhrase) return 'LOGGED_OUT';
  if (facts.devGateBypassed) return 'LOGGED_IN';
  return deriveLoginState(facts);
}
