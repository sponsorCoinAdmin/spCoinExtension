// @ts-nocheck
export const allowance = async (context, owner, spender) => {
    return await context.spCoinContractDeployed.allowance(owner, spender);
};
