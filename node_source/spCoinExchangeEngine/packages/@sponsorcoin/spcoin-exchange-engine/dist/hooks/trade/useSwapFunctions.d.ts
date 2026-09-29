import type { Abi } from 'viem';
import type { TradeExecutorContext, TradeExecutorDisplayMeta } from '@sponsorcoin/spcoin-common';
import { type ReadStepFn } from '@sponsorcoin/spcoin-onchain';
export interface SponsorQuote {
    amountOut: bigint;
    isMultiHop: boolean;
}
export interface UseSwapFunctionsParams {
    buildTradeExecutorContext: (display: Partial<TradeExecutorDisplayMeta>, chainId: number, rpcUrl: string) => Promise<TradeExecutorContext>;
    activeSpCoinAddress: string;
    sponsorQuote: SponsorQuote | undefined;
    abi?: Abi;
    readStep?: ReadStepFn;
    queryClient: any;
    decodeSpCoinError: (error: unknown) => {
        code: number;
        label: string;
    } | undefined;
    pushTradeExecutionLock: (params: Record<string, unknown>) => void | Promise<void>;
    waitForManualAdvance?: () => Promise<void>;
    debugTrace?: (source: string, data: Record<string, unknown>) => void;
}
export interface UseSwapFunctionsResult {
    swap: () => Promise<'STAKE' | 'SWAP'>;
    doApprovePayToken: () => Promise<void>;
    doSponsorSwap: () => Promise<boolean>;
    doSponsorStake: () => Promise<boolean>;
    isSubmitting: boolean;
}
export declare function useSwapFunctions(params: UseSwapFunctionsParams): UseSwapFunctionsResult;
export default useSwapFunctions;
