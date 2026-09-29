import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export declare function useAgentAccount(): [
    spCoinAccount | undefined,
    (next: spCoinAccount | undefined) => void
];
