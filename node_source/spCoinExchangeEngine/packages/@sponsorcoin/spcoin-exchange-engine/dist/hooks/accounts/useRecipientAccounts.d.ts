import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export declare function useRecipientAccounts(): [
    spCoinAccount[],
    (next: spCoinAccount[] | ((prev: spCoinAccount[]) => spCoinAccount[])) => void
];
