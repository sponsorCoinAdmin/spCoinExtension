import type { ApprovalController } from '../vault/approvals';
import type { Authenticator } from '../auth/authenticator';
import type { StandaloneChain } from './createStandaloneWallet';
export declare function registerStandaloneEngineHosts(chains: readonly StandaloneChain[], approvals: ApprovalController, authenticator?: Authenticator): void;
