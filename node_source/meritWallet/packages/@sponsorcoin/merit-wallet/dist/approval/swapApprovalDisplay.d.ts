export interface SwapConfirmCopy {
    title: string;
    message: string;
    amount?: {
        label: string;
        value: string;
    };
    tokens: Array<{
        label: string;
        symbol?: string;
        name?: string;
        address?: string;
        logoURL?: string;
        detail?: string;
    }>;
    contractSymbol: string;
    contractName: string;
}
/** What the confirmation screen shows for the swap, from the approval-details request the shared swap flow (runUniswapSwap) hands the signer. */
export declare function swapConfirmCopy(request: any, minReceived: string): SwapConfirmCopy;
/** The spender an ERC20 approve(spender, amount) names: the last 40 hex digits of the first 32-byte word after the selector. */
export declare function approveSpender(data?: string): string | undefined;
/**
 * Wraps an executor's execute so the swap itself (label `swapLabel`) and the spending approval sent before it ('Uniswap V3 Approve') carry the swap's display: the title, the tokens and amounts, the router's name, and for the
 * approval the router as the Contract (read from the approve call) and the swap call that follows, so its Method names the whole flow ("ERC20 Approve → Uniswap V3 (exactInputSingle)").
 */
export declare function withSwapApprovalDisplay<F extends (req: any) => Promise<any>>(inner: F, swapLabel: string, confirm: SwapConfirmCopy): F;
