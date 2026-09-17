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
}
export default function PasswordPanel({ mode, icon, errorText, onSubmit, submitting, }: PasswordPanelProps): import("react/jsx-runtime").JSX.Element;
