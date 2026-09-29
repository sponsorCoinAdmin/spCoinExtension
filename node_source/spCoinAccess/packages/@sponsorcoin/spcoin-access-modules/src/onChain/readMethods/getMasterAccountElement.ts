// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';

const handler = buildHandler('getMasterAccountElement', async (context) => {
    const index = Number(context.methodArgs[0]);
    if (!Number.isInteger(index) || index < 0) {
        throw new Error('getMasterAccountElement index must be a non-negative integer.');
    }

    const method = getDynamicMethod(context.read, 'getMasterAccountElement')
        || getDynamicMethod(context.staking, 'getMasterAccountElement')
        || getDynamicMethod(context.contract, 'getMasterAccountElement')
        || getDynamicMethod(context.read, 'getAccountElement')
        || getDynamicMethod(context.staking, 'getAccountElement')
        || getDynamicMethod(context.contract, 'getAccountElement')
        || getDynamicMethod(context.read, 'getAccountKeyAt')
        || getDynamicMethod(context.staking, 'getAccountKeyAt')
        || getDynamicMethod(context.contract, 'getAccountKeyAt')
        || getDynamicMethod(context.read, 'getMasterAccountKeyAt')
        || getDynamicMethod(context.staking, 'getMasterAccountKeyAt')
        || getDynamicMethod(context.contract, 'getMasterAccountKeyAt')
        || getDynamicMethod(context.read, 'getMasterAccountElement')
        || getDynamicMethod(context.staking, 'getMasterAccountElement')
        || getDynamicMethod(context.contract, 'getMasterAccountElement');
    if (method) {
        try {
            return await method(context.methodArgs[0]);
        } catch (error) {
            const source = error as Record<string, unknown> | null;
            const nested = (source?.error || source?.info || source?.cause) as Record<string, unknown> | null;
            const code = String(source?.code || nested?.code || '');
            const action = String(source?.action || nested?.action || '');
            const data = String(source?.data || nested?.data || '');
            const message = String(source?.message || nested?.message || '');
            const isMissingSelector =
                code === 'CALL_EXCEPTION' ||
                action === 'call' ||
                data === '0x' ||
                /execution reverted|require\(false\)/i.test(message);
            if (!isMissingSelector) {
                throw error;
            }
        }
    }

    const listMethod = getDynamicMethod(context.read, 'getMasterAccountKeys')
        || getDynamicMethod(context.read, 'getAccountKeys')
        || getDynamicMethod(context.read, 'getMasterAccountList')
        || getDynamicMethod(context.staking, 'getMasterAccountKeys')
        || getDynamicMethod(context.staking, 'getAccountKeys')
        || getDynamicMethod(context.staking, 'getMasterAccountList')
        || getDynamicMethod(context.contract, 'getMasterAccountKeys')
        || getDynamicMethod(context.contract, 'getAccountKeys')
        || getDynamicMethod(context.contract, 'getMasterAccountList');
    if (!listMethod) {
        throw new Error('getMasterAccountElement requires getMasterAccountElement(uint256) or getMasterAccountKeys() on the current SpCoin contract.');
    }

    const result = await listMethod();
    const accounts = Array.isArray(result)
        ? result
        : Array.isArray((result as { accounts?: unknown } | null)?.accounts)
          ? (result as { accounts: unknown[] }).accounts
          : [];
    const value = accounts[index];
    if (value == null) {
        throw new Error(`getMasterAccountElement index ${index} is out of range for ${accounts.length} account(s).`);
    }

    return typeof value === 'object' && value !== null && 'address' in value
        ? (value as { address: unknown }).address
        : value;
});

export default handler;
