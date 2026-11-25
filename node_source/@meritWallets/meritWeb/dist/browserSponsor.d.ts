import { type Authenticator, type RewardsHost, type SponsorStakingHost } from '@sponsorcoin/merit-wallet';
type ReadParams = {
    contractAddress: string;
    rpcUrl?: string;
};
type ReadArgs = {
    key: string;
    value: string;
}[];
/** One contract view: the stake ABI slice straight over viem, every other wallet read through the access modules over the bundled ABI. */
export declare function readSpCoin(params: ReadParams, method: string, args?: ReadArgs): Promise<unknown>;
export interface BrowserSponsorOptions {
    authenticator: Authenticator;
    chainId: number;
    rpcUrl: string;
    /** The active account (read when used: it changes while the wallet is open). */
    from: () => string | undefined;
    /** Called after a claim or un-stake was mined, so the wallet re-reads its balances. */
    onChanged?: () => void;
}
/** The two hosts, built once per wallet: stable objects, so the panels do not refetch on every render. */
export declare function createBrowserSponsorHosts({ authenticator, chainId, rpcUrl, from, onChanged }: BrowserSponsorOptions): {
    rewardsHost: RewardsHost;
    stakingHost: SponsorStakingHost;
};
export {};
