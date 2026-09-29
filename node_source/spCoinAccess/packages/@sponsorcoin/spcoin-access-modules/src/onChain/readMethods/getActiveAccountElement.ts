// @ts-nocheck
import { buildHandler, getDynamicMethod } from '../../readMethodRuntime';

export default buildHandler('getActiveAccountKeyAt', async (context) => {
    const directMethod = getDynamicMethod(context.contract, 'getActiveAccountKeyAt')
        || getDynamicMethod(context.read, 'getActiveAccountKeyAt');
    if (directMethod) {
        return directMethod(...context.methodArgs);
    }

    const listMethod = getDynamicMethod(context.read, 'getActiveAccountKeys')
        || getDynamicMethod(context.contract, 'getActiveAccountKeys');
    if (!listMethod) {
        throw new Error('getActiveAccountKeyAt requires getActiveAccountKeys().');
    }
    const activeAccountList = await listMethod();
    return activeAccountList[Number(context.methodArgs[0] ?? 0)];
});
