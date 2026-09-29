// @ts-nocheck
export const signerTransfer = async (context, _signer, _to, _value) => {
    await context.spCoinContractDeployed.transfer(_to, _value.toString());
};
