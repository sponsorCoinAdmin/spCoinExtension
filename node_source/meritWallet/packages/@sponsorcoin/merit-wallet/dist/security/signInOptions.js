// File: src/security/signInOptions.ts
//
// 2026-11-13 (owner request: a Security container in Config with sign-in option check boxes): the pure rule for which extra steps the unlock screen asks for after the password. An option is asked for only when it is
// switched on AND set up; ticking an option that is not set up opens its setup first (SecuritySetupScreen). The password is always asked for: it is the key of the vault, so it has no check box.
export const NO_SIGN_IN_OPTIONS = { passkey: false, totp: false };
/** The steps to ask for after the password. */
export function requiredSignInSteps(options, enrolled) {
    return { passkey: options.passkey && enrolled.passkey, totp: options.totp && enrolled.totp };
}
export function anySignInStep(steps) {
    return steps.passkey || steps.totp;
}
