// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
import getMasterAccountMetaData from './getMasterAccountMetaData';

function toCount(value) {
    if (value == null) return null;
    const count = Number(value);
    return Number.isFinite(count) ? count : null;
}

const handler = buildHandler('getMasterAccountKeyCount', async (context) => {
    try {
        const metaData = await getMasterAccountMetaData.run(context);
        const count = toCount(metaData?.masterAccountSize ?? metaData?.numberOfAccounts ?? metaData?.[0]);
        if (count != null) return count;
    } catch {
        // Older deployments can derive this from legacy count/list readers.
    }
    if (typeof context.contract?.getMasterAccountKeyCount === 'function') {
        try {
            return Number(await context.contract.getMasterAccountKeyCount());
        } catch {
            // Continue to newer list fallbacks when a stale ABI exposes this removed selector.
        }
    }
    if (typeof context.contract?.getAccountKeyCount === 'function') {
        try {
            return Number(await context.contract.getAccountKeyCount());
        } catch {
            // Continue to list fallbacks when a stale ABI exposes this removed selector.
        }
    }
    const readHost = (context && typeof context === 'object' && context.read && typeof context.read === 'object')
        ? context.read
        : {};
    const method =
        typeof readHost.getMasterAccountKeys === 'function'
            ? readHost.getMasterAccountKeys
            : typeof readHost.getAccountKeys === 'function'
                ? readHost.getAccountKeys
                : typeof readHost.getMasterAccountList === 'function'
                    ? readHost.getMasterAccountList
                    : null;
    if (!method) {
        throw new Error('getMasterAccountKeyCount requires getMasterAccountKeys() on the current read runtime.');
    }
    const rawResult = await method();
    const accountList = typeof context.normalizeStringListResult === 'function'
        ? context.normalizeStringListResult(rawResult)
        : Array.isArray(rawResult)
            ? rawResult.map((entry) => String(entry))
            : [];
    return Array.isArray(accountList) ? accountList.length : 0;
});
export default handler;

