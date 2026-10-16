// File: src/session/validateLogin.ts
//
// 2026-10-13 (docs/passwordSecurityToDo.txt P2 / P3; docs/design/passwordSecurity.txt section 7): the login state and ValidateLogin.
//
// ValidateLogin answers ONE question, cheaply, on every panel change and every write: what must happen before this request may proceed? It is a PURE, constant-time function of
// (password mode, login state, request kind, the mandatory flags). It reads nothing else: no storage, no server, no password, nothing async. Everything slow belongs to the EVENT
// that changes the login state (boot resolved, unlock, lock, timeout, a mode change), never to this check.
//
// loginState is a USER-INTERFACE state, not the security boundary: it decides what the screens show. The sign and reveal routes still demand a valid unlock token or the password.
export function validateLogin(input) {
    const { mode, loginState, kind } = input;
    // Disabled: no login, no prompt, ever (development only), except a mandatory method, which ignores the mode's shortcuts (passwordSecurity.txt 1.2).
    if (mode === 'disabled' && !input.mandatoryPassword)
        return 'NONE';
    // Initial: the wallet may be browsed while logged out; only a WRITE needs the login (rule 1).
    const browseNeedsLogin = mode !== 'firstApproved';
    if (kind === 'BROWSE' && !browseNeedsLogin && !input.mandatoryPassword)
        return 'NONE';
    // Boot window: draw nothing (owner rule 2026-10-13: no page flashes before the password page).
    if (loginState === 'UNKNOWN')
        return 'WAIT';
    // Not logged in: the login page (it also satisfies a password need, so one prompt at most).
    if (loginState === 'LOGGED_OUT')
        return 'LOGIN';
    // Logged in. A mandatory method asks for the password in every mode.
    if (input.mandatoryPassword)
        return 'PASSWORD';
    if (kind === 'BROWSE')
        return 'NONE';
    // A write: All asks for the password (it is the approval); the other modes use the Approve button when Mandatory Approval is on.
    if (mode === 'methodRequired')
        return 'PASSWORD';
    return input.mandatoryApproval ? 'APPROVE' : 'NONE';
}
/** True when the wallet's panels must not be shown as content: the gate is closed (login needed, or still waiting). Used by the panel-change chokepoint. */
export function isLoginGateClosed(mode, loginState) {
    return validateLogin({ mode, loginState, kind: 'BROWSE' }) !== 'NONE';
}
/** The login state from the facts the wallet already tracks. Called only when one of them changes, never per request. */
export function deriveLoginState(facts) {
    if (!facts.bootResolved)
        return 'UNKNOWN';
    return facts.hasWalletPassword === true && !facts.isWalletLocked ? 'LOGGED_IN' : 'LOGGED_OUT';
}
