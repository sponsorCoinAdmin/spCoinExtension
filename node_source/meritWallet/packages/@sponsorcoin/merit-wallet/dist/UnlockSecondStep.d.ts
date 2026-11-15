import type { SignInHost, SignInOptions } from './security/signInOptions';
export default function UnlockSecondStep({ steps, signIn, onPassed, onCancel }: {
    steps: SignInOptions;
    signIn: SignInHost;
    onPassed(): void;
    onCancel(): void;
}): import("react").JSX.Element;
