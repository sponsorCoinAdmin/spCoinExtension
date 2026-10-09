/** One contract view: the method name and its positional arguments, as key/value pairs (the run-script step shape). */
export type ChainRead = (method: string, args: {
    key: string;
    value: string;
}[]) => Promise<unknown>;
/**
 * A read function that never has more than `concurrency` reads in flight and retries a failed read (with a short growing pause): a staking tree is many small reads, and a
 * node behind a rate limiter answers a burst of them with "503 Service Temporarily Unavailable". Wrapping an already throttled read is harmless.
 */
export declare function throttleRead(read: ChainRead, options?: {
    concurrency?: number;
    retries?: number;
    pauseMs?: number;
}): ChainRead;
export interface TreeAgentRate {
    agentRateKey: string;
    stakedSPCoins: string;
}
export interface TreeAgent {
    agentKey: string;
    rates: TreeAgentRate[];
}
export interface TreeRate {
    recipientRateKey: string;
    /** Raw base units, decimal string. */
    stakedSPCoins: string;
    agents: TreeAgent[];
}
export interface TreeRecipient {
    recipientKey: string;
    rates: TreeRate[];
}
export declare function getSponsorRecipientKeys(sponsor: string, read: ChainRead): Promise<string[]>;
export declare function getSponsorRecipientRateKeys(sponsor: string, recipient: string, read: ChainRead): Promise<string[]>;
export declare function getRecipientRateAgentKeys(sponsor: string, recipient: string, rateKey: string, read: ChainRead): Promise<string[]>;
/** The staked amount of one (sponsor, recipient, rate) bucket, raw decimal string. */
export declare function getRecipientStaked(sponsor: string, recipient: string, rateKey: string, read: ChainRead): Promise<string>;
/** Every agent-rate leaf of one agent inside a rate bucket, with its staked amount. */
export declare function getAgentTransactionList(sponsor: string, recipient: string, rateKey: string, agent: string, read: ChainRead): Promise<TreeAgentRate[]>;
/** The sponsor's whole staking tree: recipients -> rate buckets -> agents -> agent rates, each with its staked amount. */
export declare function loadSponsorTree(sponsorKey: string, rawRead: ChainRead): Promise<TreeRecipient[]>;
/** What `sponsor` has staked with `recipient` across the pair's rate buckets (the web app's getStakedAmountForRecipient, without its cache). */
export declare function getStakedRawForPair(sponsor: string, recipient: string, rawRead: ChainRead): Promise<bigint>;
