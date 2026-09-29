// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';

function toBigIntValue(value) {
    try {
        return BigInt(String(value ?? '0'));
    } catch (_error) {
        return 0n;
    }
}

function accountRecordHasActiveLinks(record) {
    const source = record && typeof record === 'object' ? record : [];
    return (
        toBigIntValue(source.sponsorCount ?? source[5]) > 0n ||
        toBigIntValue(source.recipientCount ?? source[6]) > 0n ||
        toBigIntValue(source.agentCount ?? source[7]) > 0n ||
        toBigIntValue(source.parentRecipientCount ?? source[8]) > 0n
    );
}

export default buildHandler('getActiveAccountKeys', async (context) => {
    const directMethod = getDynamicMethod(context.contract, 'getActiveAccountKeys')
        || getDynamicMethod(context.read, 'getActiveAccountKeys');
    if (directMethod) {
        return directMethod();
    }

    const masterMethod = getDynamicMethod(context.read, 'getMasterAccountKeys')
        || getDynamicMethod(context.read, 'getAccountKeys')
        || getDynamicMethod(context.contract, 'getMasterAccountKeys');
    const accountRecordMethod = getDynamicMethod(context.contract, 'getAccountRecord')
        || getDynamicMethod(context.read, 'getAccountRecordShallow')
        || getDynamicMethod(context.read, 'getAccountRecord');
    if (!masterMethod || !accountRecordMethod) {
        throw new Error('getActiveAccountKeys requires getMasterAccountKeys() and getAccountRecord().');
    }

    const masterAccountList = await masterMethod();
    const activeAccountList = [];
    for (const accountKey of masterAccountList) {
        const accountRecord = await accountRecordMethod(accountKey);
        if (accountRecordHasActiveLinks(accountRecord)) {
            activeAccountList.push(accountKey);
        }
    }
    return activeAccountList;
});
