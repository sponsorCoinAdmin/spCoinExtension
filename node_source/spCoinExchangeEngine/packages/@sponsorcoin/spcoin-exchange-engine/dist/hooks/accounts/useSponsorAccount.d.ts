import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export declare function useSponsorAccount(): [
    spCoinAccount | undefined,
    (next: spCoinAccount | undefined) => void
];
