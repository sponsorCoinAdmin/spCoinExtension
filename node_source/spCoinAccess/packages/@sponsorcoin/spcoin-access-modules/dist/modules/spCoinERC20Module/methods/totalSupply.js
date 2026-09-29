// @ts-nocheck
export const totalSupply = async (context) => {
    return await context.spCoinContractDeployed.totalSupply();
};
