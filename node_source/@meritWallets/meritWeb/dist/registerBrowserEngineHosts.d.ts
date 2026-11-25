import type { ApprovalController } from '@sponsorcoin/merit-wallet/vault';
import type { Authenticator } from '@sponsorcoin/merit-wallet';
import type { BrowserChain } from './createBrowserWallet';
export declare function registerBrowserEngineHosts(chains: readonly BrowserChain[], approvals: ApprovalController, authenticator?: Authenticator): void;
