import { type ReactNode } from 'react';
import { type PasskeyRegistration } from './security/passkey';
import type { SignInHost } from './security/signInOptions';
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
export declare const TOTP_INFO = "An authenticator app keeps a secret key and turns it into a 6 digit code that changes every 30 seconds. When a second step is asked for, you type the current code. Someone who knows your password still cannot approve without your phone. If you lose the phone, set it up again.";
export declare const PASSKEY_INFO = "A passkey is a private key held by this device, your phone or a security key, and unlocked with your fingerprint, face or screen lock. It never leaves the device and cannot be phished. Approving means unlocking the device instead of typing a code. If you lose the device, set it up again.";
/**
 * An option's header line: its name (press it to open or close the option), a check box that only says whether the method is ACTIVE, and the info icon at the end of the line (the same icon the lists use);
 * pressing the icon shows what the option is for. An option with no `expanded` (coming soon) has a plain name.
 */
export declare function OptionTitle({ id, title, info, expanded, onToggle, active }: {
    id: string;
    title: string;
    info: string;
    expanded?: boolean;
    onToggle?(): void;
    active: {
        checked: boolean;
        disabled?: boolean;
        onChange(next: boolean): void;
    };
}): import("react").JSX.Element;
export default function SecuritySetupScreen({ enrollTotp, enrollPasskey, credentials, accountLabel, signIn, onDone, makeSecret, passwordContent, accountButtons }: SecuritySetupScreenProps): import("react").JSX.Element;
