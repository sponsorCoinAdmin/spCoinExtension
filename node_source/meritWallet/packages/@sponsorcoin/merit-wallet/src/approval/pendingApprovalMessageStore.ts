// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/approval/pendingApprovalMessageStore.ts
//
// 2026-10-29, on request ("it should at least open in message panel") —
// useMeritApprovalMessagePanel.ts (mounted once in MeritWallet.tsx) is not
// the same component that renders MESSAGE_PANEL's content: the web app
// mounts ConnectedMessagePanel a SECOND time, standalone, outside
// MeritWallet.tsx entirely (components/views/MessagePanel.tsx, "WalletOverlayHost
// mounts ConnectedMessagePanel directly"), so threading the hook's result
// down as a prop can't reach both places at once. A plain module-level
// pub-sub — same shape as every other small store in this package
// (popupActiveStore, swapCompletedStore, approvalWaiting) — decouples "who
// computes the pending decision" from "who renders it": every
// ConnectedMessagePanel instance subscribes here directly and shows the
// same state, with no prop drilling needed anywhere.
import type { MessagePanelPendingApproval } from '../panels/MessagePanelReal';

let state: MessagePanelPendingApproval | null = null;
const listeners = new Set<() => void>();

export const pendingApprovalMessageStore = {
  set(next: MessagePanelPendingApproval | null): void {
    state = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): MessagePanelPendingApproval | null {
    return state;
  },
  getServerSnapshot(): MessagePanelPendingApproval | null {
    return null;
  },
};
