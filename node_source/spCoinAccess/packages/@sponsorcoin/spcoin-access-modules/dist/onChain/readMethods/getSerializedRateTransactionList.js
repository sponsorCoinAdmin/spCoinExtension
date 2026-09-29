// @ts-nocheck
import { createSerializedHandler } from '../../readMethodRuntime';
const handler = createSerializedHandler({
    method: 'getSerializedTransactionList',
    localMethod: 'getAgentTransactionEntries',
    localArgs: (context) => [
        String(context.methodArgs[0]),
        String(context.methodArgs[1]),
        context.toStringOrNumber(context.methodArgs[2]),
        String(context.methodArgs[3]),
        context.toStringOrNumber(context.methodArgs[4]),
    ],
});
export default handler;
