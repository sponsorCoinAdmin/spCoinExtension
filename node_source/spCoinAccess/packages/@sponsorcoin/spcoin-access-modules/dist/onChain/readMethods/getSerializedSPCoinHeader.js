// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('getSerializedSPCoinHeader', async (context) => context.requireExternalSerializedValue('getSerializedSPCoinHeader', context.methodArgs));
export default handler;
