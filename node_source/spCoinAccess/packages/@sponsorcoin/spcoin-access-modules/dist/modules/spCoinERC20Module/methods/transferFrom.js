// @ts-nocheck
export const transferFrom = async (context, from, to, value) => {
    return await context.spCoinContractDeployed.transferFrom(from, to, value.toString());
};
