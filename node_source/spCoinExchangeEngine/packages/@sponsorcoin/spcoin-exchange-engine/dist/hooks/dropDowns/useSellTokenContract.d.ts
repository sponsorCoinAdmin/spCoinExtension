import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
/** Hook for managing sellTokenContract from context. */
export declare const useSellTokenContract: () => [TokenContract | undefined, (contract: TokenContract | undefined) => void];
