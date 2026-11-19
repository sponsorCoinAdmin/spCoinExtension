import { type SendOutcome } from '../send/sendTransfer';
import type { HostTransactionResult } from '../receipt/transactionReceipts';
import type { Authenticator } from '../auth/authenticator';
import type { StandaloneChain } from './createStandaloneWallet';
export interface StandaloneSendParams {
    recipientAddress?: string;
    tokenAddress?: string;
    amount: string;
    decimals?: number;
    tokenSymbol?: string;
}
export interface StandaloneSendOptions {
    authenticator: Authenticator;
    chain: StandaloneChain;
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
export declare function createStandaloneSend(options: StandaloneSendOptions): (params: StandaloneSendParams) => Promise<HostTransactionResult>;
