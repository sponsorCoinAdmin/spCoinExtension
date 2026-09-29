// @ts-nocheck
export const balanceOf = async (context, owner) => {
    return await context.spCoinContractDeployed.balanceOf(owner);
};
