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
    /** Claim lists only (addPendingToTree): the reward this leaf has earned so far for the role being claimed, raw base units. */
    pending?: string;
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
    /** Claim lists only (addPendingToTree): the reward the bucket's own stake (not its agents') has earned so far for the role being claimed, raw base units. */
    pendingDirect?: string;
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
/** The sponsors of `account` (the contract's account links). */
export declare function getSponsorsOfAccount(account: string, read: ChainRead): Promise<string[]>;
/**
 * 2026-11-13 (owner: Claim lists for Recipient and Agent): the list the Recipient / Agent Claim buttons open. Its rows are the SPONSORS of `account`, in the same tree shape as loadSponsorTree so the one list draws it
 * (here `recipientKey` holds the sponsor).
 *  - Recipient: each sponsor's rate buckets for this recipient, with the agents under them.
 *  - Agent: each sponsor's buckets (across every recipient it sponsors) where this agent appears; a bucket holds only this agent's stake, buckets of the same rate are added together.
 */
export declare function loadRoleSponsorTree(role: 'Recipient' | 'Agent', account: string, rawRead: ChainRead): Promise<TreeRecipient[]>;
