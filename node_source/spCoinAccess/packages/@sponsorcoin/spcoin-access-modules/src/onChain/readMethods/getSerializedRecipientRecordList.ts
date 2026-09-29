// @ts-nocheck
import { createSerializedHandler } from '../../readMethodRuntime';
const handler = createSerializedHandler({
    method: 'getSerializedRecipientRecordList',
    localMethod: 'getRecipient',
    localArgs: (context) => [String(context.methodArgs[0]), String(context.methodArgs[1])],
});
export default handler;

