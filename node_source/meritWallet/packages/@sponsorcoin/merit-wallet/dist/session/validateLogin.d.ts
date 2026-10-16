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
export declare function validateLogin(input: ValidateLoginInput): LoginRequirement;
/** True when the wallet's panels must not be shown as content: the gate is closed (login needed, or still waiting). Used by the panel-change chokepoint. */
export declare function isLoginGateClosed(mode: string, loginState: LoginState): boolean;
/** The login state from the facts the wallet already tracks. Called only when one of them changes, never per request. */
export declare function deriveLoginState(facts: {
    bootResolved: boolean;
    hasWalletPassword: boolean | null;
    isWalletLocked: boolean;
}): LoginState;
