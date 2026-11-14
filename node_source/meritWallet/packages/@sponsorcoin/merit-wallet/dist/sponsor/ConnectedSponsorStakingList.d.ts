import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
import { type ReceiptProfile } from '../receipt/transactionReceipts';
import { type ChainRead, type TreeRecipient } from './sponsorReads';
import { type UnstakeSend } from './unstakeWalk';
export interface SponsorStakingHost {
    /** The active spCoin contract. */
    contractAddress(): string;
    decimals?: number;
    /** Contract views (the extension answers them straight from the chain's RPC). */
    read: ChainRead;
    /** Send one unstake transaction and resolve when it is mined; throw a readable message on rejection or failure. */
    send: UnstakeSend;
    /** Name, symbol and avatar for an address (the rows show them). */
    loadProfile(address: string): Promise<ReceiptProfile>;
    /** The active spCoin token, for the confirm popup's picture. */
    spCoinContract?: TokenContract;
    /** Load the whole staking tree in one go when the host has a faster way than the many small reads (the web app asks its server once). Default: loadSponsorTree over `read`. */
    loadTree?(sponsor: string): Promise<TreeRecipient[]>;
    /** Called once before an unstake walk starts, so the host can obtain its signer once for all the legs (one approval prompt for the whole walk, as the web app's unstake always did). Throw to stop. */
    prepare?(): Promise<void> | void;
    /** Claim mode: send the contract's claim for the sponsor (method e.g. claimOnChainSponsorRewards) signed by the active account, and resolve when mined; throw a readable message on failure. Omit: the list cannot claim. */
    claim?(method: string, accountKey: string): Promise<unknown>;
    /** The spCoin balance of an account, raw base units (undefined when it cannot be read). Claim mode reads every involved account before and after the claim to show who received what. */
    readBalance?(accountAddress: string): Promise<bigint | undefined>;
    /** A hook that registers the list's reload function with the host's refresh bus (the web's useCacheRefreshHandler); must be a stable function. */
    useRegisterRefresh?: (refresh: () => void | Promise<void>, active: boolean) => void;
    /** Called after an unstake finished (any outcome) with the recipients it touched, so the host can reload balances and drop its caches. */
    onChanged?(info: {
        sponsor: string;
        recipients: string[];
    }): void;
}
export default function ConnectedSponsorStakingList({ host }: {
    host: SponsorStakingHost;
}): import("react").JSX.Element;
