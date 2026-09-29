// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';

const handler = buildHandler('totalInitialSupply', async (context) => {
    const readMethod = getDynamicMethod(context.read, 'totalInitialSupply')
        || getDynamicMethod(context.read, 'getInitialTotalSupply')
        || getDynamicMethod(context.read, 'initialTotalSupply');
    if (readMethod) {
        return readMethod();
    }

    const stakingMethod = getDynamicMethod(context.staking, 'totalInitialSupply')
        || getDynamicMethod(context.staking, 'getInitialTotalSupply')
        || getDynamicMethod(context.staking, 'initialTotalSupply');
    if (stakingMethod) {
        return stakingMethod();
    }

    const contractMethod = getDynamicMethod(context.contract, 'totalInitialSupply')
        || getDynamicMethod(context.contract, 'getInitialTotalSupply')
        || getDynamicMethod(context.contract, 'initialTotalSupply');
    if (!contractMethod) {
        throw new Error(`SpCoin read method ${context.selectedMethod} is not available on access modules or contract.`);
    }

    return contractMethod();
});

export default handler;
