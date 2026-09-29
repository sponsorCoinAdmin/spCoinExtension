// @ts-nocheck
import { createSerializedHandler } from '../../readMethodRuntime';
const handler = createSerializedHandler({
    method: 'getSerializedAccountRecord',
    localMethod: 'getAccountRecord',
    localArgs: (context) => [String(context.methodArgs[0])],
});
export default handler;
