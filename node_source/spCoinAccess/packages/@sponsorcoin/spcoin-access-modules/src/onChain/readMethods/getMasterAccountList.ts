// @ts-nocheck
import { Interface } from 'ethers';
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';
import { timeOnChainCall } from '../../utils/methodTiming';

const legacyAccountListInterface = new Interface([
    'function getAccountList() view returns (address[])',
]);

function normalizeAccountKeysResult(result) {
    if (result?.accountKeys) return result.accountKeys;
    if (Array.isArray(result) && result.length === 2 && Array.isArray(result[1])) return result[1];
    return result;
}

async function callLegacyGetAccountList(contract) {
    const target = String(contract?.target || (typeof contract?.getAddress === 'function' ? await contract.getAddress() : ''));
    const runner = contract?.runner;
    if (!target || !runner || typeof runner.call !== 'function') {
        throw new Error('SpCoin read method getMasterAccountKeys is not available on access modules or contract.');
    }
    const data = legacyAccountListInterface.encodeFunctionData('getAccountList', []);
    const raw = await timeOnChainCall('getAccountList', () => runner.call({ to: target, data }));
    const decoded = legacyAccountListInterface.decodeFunctionResult('getAccountList', raw);
    return decoded[0];
}

const handler = buildHandler('getMasterAccountKeys', async (context) => {
    const method = getDynamicMethod(context.read, 'getMasterAccountKeys')
        || getDynamicMethod(context.staking, 'getMasterAccountKeys')
        || getDynamicMethod(context.contract, 'getMasterAccountKeys')
        || getDynamicMethod(context.read, 'getAccountKeys')
        || getDynamicMethod(context.staking, 'getAccountKeys')
        || getDynamicMethod(context.contract, 'getAccountKeys')
        || getDynamicMethod(context.read, 'getMasterAccountList')
        || getDynamicMethod(context.staking, 'getMasterAccountList')
        || getDynamicMethod(context.contract, 'getMasterAccountList')
        || getDynamicMethod(context.read, 'getAccountList')
        || getDynamicMethod(context.staking, 'getAccountList')
        || getDynamicMethod(context.contract, 'getAccountList');
    if (!method) {
        return callLegacyGetAccountList(context.contract);
    }

    try {
        const result = await method();
        const accountKeys = normalizeAccountKeysResult(result);
        return context.normalizeStringListResult
            ? context.normalizeStringListResult(accountKeys ?? [])
            : accountKeys;
    } catch (error) {
        const code = String(error?.code || '');
        const data = String(error?.data || '');
        const message = String(error?.message || '');
        if (code === 'CALL_EXCEPTION' || data === '0x' || /execution reverted|require\(false\)/i.test(message)) {
            return callLegacyGetAccountList(context.contract);
        }
        throw error;
    }
});

export default handler;
