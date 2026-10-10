import React from 'react';
export interface RewardsHost {
    /** The active spCoin contract. */
    contractAddress(): string;
    /** Decimals of the spCoin (default 18). */
    decimals?: number;
    rpcUrl: string;
    accessSource?: 'node_modules' | 'local';
    readMode: 'hardhat' | 'metamask';
    /** Absolute URL of the run-script endpoint the estimate and record reads use (the extension passes the hosted app's). Omit for the same-origin default. */
    endpoint?: string;
    /**
     * Execute a CLAIM (action 'claim') for `accountKey`. Resolves with whatever the host has (the hook only needs the amounts the server script reports, and
     * falls back to zero, then re-reads); throws a readable message on rejection or failure. Omit and claims go to the run-script endpoint, as in the web app.
     */
    claim?(method: string, accountKey: string): Promise<unknown>;
    /**
     * Read the account's on-chain record (the contract's getAccountRecord view) directly, so Trading and Staked need no hosted app; resolves with the record keyed by its
     * output names (accountBalance, stakedAccountSPCoins, ...). Omit and the record comes from the run-script endpoint, as in the web app.
     */
    readAccountRecord?(accountKey: string): Promise<unknown>;
    /**
     * Compute a pending-reward ESTIMATE (estimateOffChainTotal / Sponsor / Recipient / AgentRewards) in the client from direct contract reads (rewards/estimateRewards.ts), so the Pending row needs no hosted app.
     * Resolves with the result object (pendingSponsorRewards, ..., pendingTotalRewards). Omit and estimates go to the run-script endpoint, as in the web app.
     */
    estimate?(method: string, accountKey: string): Promise<unknown>;
    /** Called after a claim confirmed, so the host can refresh balances. */
    onClaimed?(): void;
}
/** What a host may add around the panel (the web app's wrapper supplies all of these; the extension needs none). */
export interface RewardsPanelExtras {
    /** Show nothing while false (the web keeps the component mounted so its state survives the panel being closed). Default true. */
    isActive?: boolean;
    /** A shared Auto Refresh store instead of this panel's own saved preference (the web app's autoRefreshStore also lets other code switch it off temporarily). */
    autoRefreshStore?: {
        subscribe(listener: () => void): () => void;
        getSnapshot(): boolean;
        getServerSnapshot(): boolean;
        setUserPreference(next: boolean): void;
    };
    /** The "Deposit Account" row the web shows above the table. */
    addressSelectContent?: React.ReactNode;
    /** Debug trace sink. */
    trace?: (message: string, data?: Record<string, unknown>) => void;
    /** A hook that registers the panel's refresh function with the host's refresh bus (the web's useCacheRefreshHandler). Must be a stable function. */
    useRegisterRefresh?: (refresh: () => void | Promise<void>, active: boolean) => void;
}
export default function ConnectedRewardsPanel({ host, extras }: {
    host: RewardsHost;
    extras?: RewardsPanelExtras;
}): React.JSX.Element | null;
