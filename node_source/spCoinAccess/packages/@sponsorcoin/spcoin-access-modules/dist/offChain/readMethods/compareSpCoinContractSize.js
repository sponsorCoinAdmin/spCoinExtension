// @ts-nocheck
import { buildHandler } from '../../readMethodRuntime';
const handler = buildHandler('compareSpCoinContractSize', async (context) => context.compareSpCoinContractSize(String(context.methodArgs[0] || ''), String(context.methodArgs[1] || '')));
export default handler;
