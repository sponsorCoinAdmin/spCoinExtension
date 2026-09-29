import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
export type SponsorMode = 'SPONSOR' | 'STAKE' | 'REVOKE';
export declare function useSponsorMode(isSpCoinCheck?: (token: TokenContract | undefined) => boolean): {
    mode: SponsorMode;
    setMode: (m: SponsorMode) => void;
};
