// @ts-nocheck
import { createDynamicHandler } from '../../readMethodRuntime';
const handler = createDynamicHandler('creationTime', (result, context) => context.formatCreationTimeResult(result));
export default handler;

