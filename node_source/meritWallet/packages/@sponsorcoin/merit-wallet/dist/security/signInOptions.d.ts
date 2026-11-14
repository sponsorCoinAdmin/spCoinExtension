export interface SignInOptions {
    passkey: boolean;
    totp: boolean;
}
export interface SignInEnrolled {
    passkey: boolean;
    totp: boolean;
}
export declare const NO_SIGN_IN_OPTIONS: SignInOptions;
/** The steps to ask for after the password. */
export declare function requiredSignInSteps(options: SignInOptions, enrolled: SignInEnrolled): SignInOptions;
export declare function anySignInStep(steps: SignInOptions): boolean;
/** What the host keeps and checks (the web app: localStorage; another host: its own store). */
export interface SignInHost {
    options(): SignInOptions;
    setOption(key: keyof SignInOptions, on: boolean): void;
    enrolled(): SignInEnrolled;
    verifyTotp(code: string): Promise<boolean>;
    verifyPasskey(): Promise<boolean>;
}
