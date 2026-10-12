// File: src/transferApprovalStore.ts
//
// 2026-10-12 (docs/authenticationDesign.txt V11): the slot for ONE pending "a site wants a copy of an account's private key" screen. dappApprovals.ts puts a request here when the worker queues a 'transfer' approval; TransferApprovalHost.ts (mounted in the side panel)
// shows it as a warning with the wallet password field; the answer is the password the person typed (checked against the vault before it is returned) or undefined when they closed it. Nothing here keeps the password: it is handed to the one waiting caller.
export interface TransferApprovalRequest {
  origin: string;
  address: string;
}

type Listener = (request: TransferApprovalRequest | null) => void;

let current: TransferApprovalRequest | null = null;
let pendingResolve: ((password: string | undefined) => void) | null = null;
const listeners = new Set<Listener>();
const notify = () => {
  for (const l of listeners) l(current);
};

export function getTransferApproval(): TransferApprovalRequest | null {
  return current;
}

export function subscribeTransferApproval(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Show the screen; resolves with the verified wallet password, or undefined when the person closed it. One at a time: a second call while one is open is answered "no". */
export function requestTransferApproval(request: TransferApprovalRequest): Promise<string | undefined> {
  if (current) return Promise.resolve(undefined);
  current = request;
  notify();
  return new Promise((resolve) => {
    pendingResolve = resolve;
  });
}

export function finishTransferApproval(password: string | undefined): void {
  const resolve = pendingResolve;
  pendingResolve = null;
  current = null;
  notify();
  resolve?.(password);
}
