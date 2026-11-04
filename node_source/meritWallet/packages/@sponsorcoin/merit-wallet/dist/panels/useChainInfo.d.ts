export interface ChainInfo {
    name?: string;
    symbol?: string;
}
export declare function useChainInfo(chainId: string | number | undefined, baseUrl?: string): ChainInfo | undefined;
