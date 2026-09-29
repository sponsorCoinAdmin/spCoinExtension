// @ts-nocheck
export const approve = async (context, spender, value) => {
    return await context.spCoinContractDeployed.approve(spender, value.toString());
};
