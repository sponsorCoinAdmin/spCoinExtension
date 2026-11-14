// File: src/security/signInOptions.ts
//
// 2026-11-13 (owner request: a Security container in Config with sign-in option check boxes): the pure rule for which extra steps the unlock screen asks for after the password. An option is asked for only when it is
// switched on AND set up; ticking an option that is not set up opens its setup first (SecuritySetupScreen). The password is always asked for: it is the key of the vault, so it has no check box.

export interface SignInOptions {
  passkey: boolean;
  totp: boolean;
}

export interface SignInEnrolled {
  passkey: boolean;
  totp: boolean;
}

export const NO_SIGN_IN_OPTIONS: SignInOptions = { passkey: false, totp: false };

/** The steps to ask for after the password. */
export function requiredSignInSteps(options: SignInOptions, enrolled: SignInEnrolled): SignInOptions {
  return { passkey: options.passkey && enrolled.passkey, totp: options.totp && enrolled.totp };
}

export function anySignInStep(steps: SignInOptions): boolean {
  return steps.passkey || steps.totp;
}

/** What the host keeps and checks (the web app: localStorage; another host: its own store). */
export interface SignInHost {
  options(): SignInOptions;
  setOption(key: keyof SignInOptions, on: boolean): void;
  enrolled(): SignInEnrolled;
  verifyTotp(code: string): Promise<boolean>;
  verifyPasskey(): Promise<boolean>;
}
