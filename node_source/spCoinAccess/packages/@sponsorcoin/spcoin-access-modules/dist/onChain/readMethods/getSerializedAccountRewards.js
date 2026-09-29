// @ts-nocheck
import { createSerializedHandler } from '../../readMethodRuntime';
const handler = createSerializedHandler({
    method: 'getSerializedAccountRewards',
    localMethod: 'getAccountStakingRewards',
    localArgs: (context) => [String(context.methodArgs[0])],
});
export default handler;
