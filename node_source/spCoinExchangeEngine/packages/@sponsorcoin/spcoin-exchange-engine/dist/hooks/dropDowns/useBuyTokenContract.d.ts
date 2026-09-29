import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
/** Hook for managing buyTokenContract from context. */
export declare const useBuyTokenContract: () => [TokenContract | undefined, (contract: TokenContract | undefined) => void];
