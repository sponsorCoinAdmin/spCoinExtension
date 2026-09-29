import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export declare function useActiveAccount(): [
    spCoinAccount | undefined,
    (next: spCoinAccount | undefined) => void
];
