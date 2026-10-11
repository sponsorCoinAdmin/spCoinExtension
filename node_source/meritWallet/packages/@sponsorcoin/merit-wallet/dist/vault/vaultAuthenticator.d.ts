import { type Authenticator, type AuthenticatorId } from '../auth/authenticator';
import { type ApprovalController } from './approvals';
import type { LocalVaultParts } from './vaultCapability';
import type { Transport } from 'viem';
export interface VaultAuthenticatorOptions {
    id: Extract<AuthenticatorId, 'browserVault' | 'deviceVault' | 'localVault'>;
    /** For the account list and the Add menu ("Browser"). */
    label: string;
    parts: LocalVaultParts;
    approvals: ApprovalController;
    /** The RPC endpoint for a chain id; undefined when the chain is not configured. */
    rpcUrlFor: (chainId: number) => string | undefined;
    transportFor?: (chainId: number) => Transport | undefined;
    /** Who is asking, for the confirmation screen ('wallet' by default). */
    origin?: string;
}
export declare function createVaultAuthenticator(options: VaultAuthenticatorOptions): Authenticator;
