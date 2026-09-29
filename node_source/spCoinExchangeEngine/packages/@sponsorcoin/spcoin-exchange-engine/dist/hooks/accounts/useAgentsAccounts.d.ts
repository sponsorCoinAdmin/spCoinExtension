import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export declare function useAgentAccounts(): [
    spCoinAccount[],
    (next: spCoinAccount[] | ((prev: spCoinAccount[]) => spCoinAccount[])) => void
];
