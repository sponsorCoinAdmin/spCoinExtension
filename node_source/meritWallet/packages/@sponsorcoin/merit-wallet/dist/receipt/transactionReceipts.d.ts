import { type ErrorMessage, type spCoinAccount } from '@sponsorcoin/spcoin-common/context';
/** What a host reports after a send / stake: the outcome only. */
export type HostTransactionResult = {
    ok: true;
    hash: string;
    receipt?: {
        blockNumber?: bigint | number | string;
        gasUsed?: bigint | number | string;
        status?: number | null;
    } | null;
    methodName?: string;
} | {
    ok: false;
    message: string;
};
/** A profile as the wallet shows it (the same fields as a list row). */
export interface ReceiptProfile {
    address?: string;
    name?: string;
    symbol?: string;
    logoURL?: string;
    /** A complete account record, when the host already has one (the web app does): used as it is instead of one built from the fields above. */
    account?: spCoinAccount;
}
/** The account record the message panel's row reads, from whatever profile the wallet has. */
export declare function toMessageAccount(profile: ReceiptProfile | undefined): spCoinAccount | undefined;
export declare function buildSendReceipt(input: {
    result: HostTransactionResult;
    amount: string;
    tokenSymbol: string;
    tokenAddress?: string;
    from?: ReceiptProfile;
    to?: ReceiptProfile;
}): ErrorMessage;
export declare function buildStakeReceipt(input: {
    result: HostTransactionResult;
    amount: string;
    stakeSymbol: string;
    contractAddress?: string;
    sponsor?: ReceiptProfile;
    recipient?: ReceiptProfile;
    agent?: ReceiptProfile;
    sponsorRatePct?: number;
    recipientRatePct?: number;
    agentRatePct?: number;
}): ErrorMessage;
export interface UnstakeReceiptLeg {
    txHash: string;
    gasUsed: bigint;
    status: 'ok' | 'failed';
    error?: string;
}
/** The Un-Stake result card, in the format the web app's SponsorStakingListPanel builds for it. */
export declare function buildUnstakeReceipt(input: {
    status: 'complete' | 'partial' | 'failed';
    legs: UnstakeReceiptLeg[];
    legCount: number;
    unstakedAmount: string;
    sponsor?: ReceiptProfile;
    recipient?: ReceiptProfile;
    agent?: ReceiptProfile;
    rateKey?: string;
}): ErrorMessage;
