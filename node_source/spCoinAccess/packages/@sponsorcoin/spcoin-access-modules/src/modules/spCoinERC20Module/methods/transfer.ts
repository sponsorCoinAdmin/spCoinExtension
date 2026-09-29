// @ts-nocheck
export const transfer = async (context, _to, _value) => {
    await context.spCoinContractDeployed.transfer(_to, _value.toString());
};

