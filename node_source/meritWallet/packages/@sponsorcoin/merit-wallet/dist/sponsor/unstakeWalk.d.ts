import { type ChainRead } from './sponsorReads';
export type UnstakeMethod = 'deleteAgentRate' | 'unSponsorAgent' | 'deleteRecipientRate' | 'unSponsorRecipient';
/** Send one unstake transaction and resolve when it is mined. Throw a readable message on rejection or failure. */
export type UnstakeSend = (method: UnstakeMethod, args: (string | bigint)[]) => Promise<{
    hash: string;
    gasUsed?: bigint;
    gasPrice?: bigint;
}>;
export interface UnstakeLegResult {
    recipient: string;
    rKey: string;
    agent?: string;
    aKey?: string;
    /** The actual contract method this leg invoked, e.g. 'deleteAgentRate'. */
    methodName: string;
    /** SpCoin unstaked by this specific tx, raw base units. */
    amountRaw: bigint;
    txHash: string;
    gasUsed: bigint;
    gasPriceRaw: bigint;
    gasCostRaw: bigint;
    status: 'ok' | 'failed';
    error?: string;
}
export interface UnstakeSpCoinResult {
    legs: UnstakeLegResult[];
    totalUnstakedRaw: bigint;
    totalGasCostRaw: bigint;
    legCount: number;
    /** 'complete' = requested qty fully satisfied (or the full node deleted when qty omitted); 'partial' = stopped early; 'failed' = the very first leg failed. */
    status: 'complete' | 'partial' | 'failed';
}
export interface UnstakeHost {
    read: ChainRead;
    send: UnstakeSend;
}
export declare function unstakeSpCoin(rawHost: UnstakeHost, sponsor: string, recipient?: string, rKey?: string, agent?: string, aKey?: string, qty?: bigint): Promise<UnstakeSpCoinResult>;
