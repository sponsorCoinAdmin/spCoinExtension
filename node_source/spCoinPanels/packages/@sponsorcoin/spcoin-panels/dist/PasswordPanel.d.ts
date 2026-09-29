import React from 'react';
export interface PasswordPanelProps {
    /** Matches the real component's own three states — 'checking' shows no
     *  form at all (nothing to submit yet). Defaults to 'unlock', the more
     *  common real-world state (a password already exists). */
    mode?: 'checking' | 'setup' | 'unlock';
    /** Logo shown above the title — omit for no image (same "no default
     *  avatar" convention as every other placeholder here). */
    icon?: React.ReactNode;
    errorText?: string;
    /** Omit for an inert form that does nothing on submit. */
    onSubmit?: (password: string) => void;
    submitting?: boolean;
    /**
     * 2026-09-23, parity pass — the real app's PasswordPanel.tsx clears its
     *  own typed password/confirmPassword state on a SUCCESSFUL submit
     * (see its own handleSetupSubmit/handleUnlockSubmit comments) so a later
     * Logoff (walletState.tsx's lockWallet()) force-reopening the same
     * always-mounted panel can't silently re-unlock without re-typing it.
     * The package's PasswordPanel is presentation-only and can't know
     * success/failure, so this opt-in clears the internal state right after
     * calling onSubmit regardless of outcome — close enough (a failed submit
     * just means the user re-types, which is fine), and strictly safer than
     * leaving the field pre-filled. Defaults false: the extension's own
     * usage (real unlock POST, real capability tokens) has no equivalent
     * concern, so it stays inert there.
     */
    clearOnSubmit?: boolean;
}
export default function PasswordPanel({ mode, icon, errorText, onSubmit, submitting, clearOnSubmit, }: PasswordPanelProps): React.JSX.Element;
