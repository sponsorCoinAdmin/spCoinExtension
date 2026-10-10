import { type AuthenticatorAccount, type AuthenticatorId } from './authenticator';
import type { AuthenticatorRegistry } from './resolve';
export interface ConnectHost {
    /** Make this account the wallet's active account (the host's own state: the exchange context, the vault). */
    setActiveAccount(address: string): Promise<void> | void;
    /** Remember which approver signs for the account (connectionDesign 2.3 step 3). Optional: a host that has no per-account setting yet may omit it. */
    setActiveAuthenticator?(address: string, approverId: AuthenticatorId): Promise<void> | void;
    /** Clear the active account (disconnect). */
    clearActiveAccount(): Promise<void> | void;
    /** Tell the user (the MESSAGE_PANEL): an approver that cannot be reached, a refused permission. */
    notify?(level: 'error' | 'warning' | 'info', message: string): void;
}
/** Several accounts were offered and none was chosen: show them and let the user pick. */
export declare class ConnectChoiceRequired extends Error {
    readonly accounts: AuthenticatorAccount[];
    readonly approverId: string;
    constructor(approverId: string, accounts: AuthenticatorAccount[]);
}
export interface ConnectParams {
    registry: AuthenticatorRegistry;
    approverId: AuthenticatorId;
    /** The account to connect. Omitted: the approver's only account is used, or ConnectChoiceRequired is thrown when it has several. */
    address?: string;
    host: ConnectHost;
}
/** Connect: choose one account of one approver and make it the active account. Resolves with what was connected. */
export declare function connectAccount({ registry, approverId, address, host }: ConnectParams): Promise<{
    address: string;
    approverId: AuthenticatorId;
}>;
export interface DisconnectParams {
    registry: AuthenticatorRegistry;
    /** The approver of the active account, when known: its permission is revoked if it supports that. */
    approverId?: AuthenticatorId;
    host: ConnectHost;
}
/** Disconnect: the wallet has no active account again. A failed permission revoke is reported but never blocks this. */
export declare function disconnectAccount({ registry, approverId, host }: DisconnectParams): Promise<void>;
