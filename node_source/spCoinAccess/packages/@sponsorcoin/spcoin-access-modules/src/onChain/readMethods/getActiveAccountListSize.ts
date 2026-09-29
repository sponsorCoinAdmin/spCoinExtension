// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';

export default buildHandler('getActiveAccountCount', async (context) => {
    const method =
        typeof context.contract?.getActiveAccountCount === 'function'
            ? context.contract.getActiveAccountCount
            : typeof context.read?.getActiveAccountCount === 'function'
                ? context.read.getActiveAccountCount
                : typeof context.read?.getActiveAccountKeys === 'function'
                    ? context.read.getActiveAccountKeys
                    : null;
    if (!method) {
        throw new Error('getActiveAccountCount requires getActiveAccountCount() or getActiveAccountKeys().');
    }
    const rawResult = await method();
    if (Array.isArray(rawResult)) {
        return rawResult.length;
    }
    return Number(rawResult ?? 0);
});
