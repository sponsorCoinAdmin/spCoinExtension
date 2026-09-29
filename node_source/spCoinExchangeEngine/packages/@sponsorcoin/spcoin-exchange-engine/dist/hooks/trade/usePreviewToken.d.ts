import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
export declare const usePreviewTokenContract: () => [TokenContract | undefined, (contract: TokenContract | undefined) => void];
export declare const usePreviewTokenSource: () => ["BUY" | "SELL" | null | undefined, (source: "BUY" | "SELL" | null) => void];
