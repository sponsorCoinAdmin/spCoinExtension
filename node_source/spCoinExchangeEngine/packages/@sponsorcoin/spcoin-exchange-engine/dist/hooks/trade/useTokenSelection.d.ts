import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
interface Params {
    containerType: SP_COIN_DISPLAY;
    sellTokenContract: any;
    buyTokenContract: any;
    setLocalTokenContract: (t: any) => void;
    setLocalAmount: (a: bigint) => void;
    sellAmount: bigint;
    buyAmount: bigint;
    setSellAmount: (a: bigint) => void;
    setBuyAmount: (a: bigint) => void;
}
export declare function useTokenSelection({ containerType, sellTokenContract, buyTokenContract, setLocalTokenContract, setLocalAmount, sellAmount, buyAmount, setSellAmount, setBuyAmount, }: Params): {
    tokenContract: any;
    tokenAddr: string;
    tokenDecimals: any;
};
export {};
