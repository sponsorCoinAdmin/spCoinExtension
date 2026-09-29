export interface Slippage {
    bps: number;
    percentage: number;
    percentageString: string;
}
export declare const useSlippage: () => {
    data: Slippage;
    setSlippage: (slippage: Slippage) => void;
    setBps: (bps: number) => void;
};
export declare const useSlippagePercent: () => [string, (percent: string) => void];
