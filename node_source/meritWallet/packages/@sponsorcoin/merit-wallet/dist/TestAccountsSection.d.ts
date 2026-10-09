import React from 'react';
import { AuthenticationType } from './auth/authenticationType';
export interface TestAccountsApi {
    /** How many of the standard test accounts are in the store. */
    status(): Promise<{
        loaded: number;
        total: number;
    }>;
    /** Add the missing ones. `password` is given when needsPassword is true. */
    load(password?: string): Promise<{
        added: number;
    }>;
    /** Remove them. `password` is given when needsPassword is true. */
    unload(password?: string): Promise<{
        removed: number;
        kept?: number;
    }>;
    /** Does the store need the wallet password to change? (the web keystore does; the unlocked vault does not) */
    needsPassword: boolean;
}
export interface TestAccountsSectionProps {
    api: TestAccountsApi;
    authenticationType?: AuthenticationType;
    /** Called after a load or unload so the host can refresh its account list. */
    onChanged?: () => void;
}
export default function TestAccountsSection({ api, authenticationType, onChanged }: TestAccountsSectionProps): React.JSX.Element;
