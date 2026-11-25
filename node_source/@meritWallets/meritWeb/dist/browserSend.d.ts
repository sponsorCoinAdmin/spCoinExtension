import { type Authenticator, type HostTransactionResult, type SendOutcome } from '@sponsorcoin/merit-wallet';
import type { BrowserChain } from './createBrowserWallet';
export interface BrowserSendParams {
    recipientAddress?: string;
    tokenAddress?: string;
    amount: string;
    decimals?: number;
    tokenSymbol?: string;
}
export interface BrowserSendOptions {
    authenticator: Authenticator;
    chain: BrowserChain;
    /** The active account's address (the sender); undefined while there is none. */
    from: () => string | undefined;
    /** The chain's coin symbol, for the confirmation text. */
    nativeSymbol: () => string;
    /** How long to wait for the block before reporting the hash without a receipt. */
    receiptTimeoutMs?: number;
    /** Test seam: wait for a receipt without a network. */
    waitForReceipt?: (rpcUrl: string, hash: string, timeoutMs: number) => Promise<SendOutcome['receipt']>;
}
/** The send function for the wallet's Send tab (its onSendSubmit). */
export declare function createBrowserSend(options: BrowserSendOptions): (params: BrowserSendParams) => Promise<HostTransactionResult>;
