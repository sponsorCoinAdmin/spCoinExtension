import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export declare function useSponsorAccounts(): [
    spCoinAccount[],
    (next: spCoinAccount[] | ((prev: spCoinAccount[]) => spCoinAccount[])) => void
];
