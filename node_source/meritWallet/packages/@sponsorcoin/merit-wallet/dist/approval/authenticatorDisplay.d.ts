import type { AuthenticatorDisplay } from '../auth/authenticator';
/** The loose shape of a TradeExecutor display (the typed part is spcoin-common's TradeExecutorDisplayMeta; the rest are the extra fields the shared swap, claim and stake flows add). */
export interface TradeDisplayInput {
    title?: string;
    label?: string;
    contractAddress?: string;
    accounts?: unknown;
    tokens?: unknown;
    amount?: {
        label: string;
        value: string;
    };
    [key: string]: unknown;
}
export declare function authenticatorDisplayOf(display: TradeDisplayInput | undefined): AuthenticatorDisplay;
