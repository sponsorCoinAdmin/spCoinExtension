export interface MultiHopPathParams {
    tokens: string[];
    fees: number[];
}
export declare function encodeMultiHopPath({ tokens, fees }: MultiHopPathParams): string;
export declare function encodeSingleHopThroughPath(params: {
    tokenIn: string;
    through: string;
    tokenOut: string;
    feeIn?: number;
    feeOut?: number;
}): string;
