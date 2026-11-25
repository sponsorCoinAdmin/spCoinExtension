// File: src/describeApproval.ts
//
// 2026-11-22 (owner: uniformity in processing): the description of an approval request now lives in the merit-wallet package (approval/transactionApproval.ts) so every Merit wallet reads a request the same way.
// This file keeps the browser package's own name for it.
export { describeTransactionApproval as describeApproval, methodName, methodLabel } from '@sponsorcoin/merit-wallet';
