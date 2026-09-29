// @ts-nocheck
import { createSerializedHandler } from '../../readMethodRuntime';
const handler = createSerializedHandler({
    method: 'getSerializedRecipientRateList',
    localMethod: 'getRecipientTransaction',
    localArgs: (context) => [
        String(context.methodArgs[0]),
        String(context.methodArgs[1]),
        context.toStringOrNumber(context.methodArgs[2]),
    ],
});
export default handler;
