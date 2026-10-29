import type { MessagePanelPendingApproval } from '../panels/MessagePanelReal';
export declare const pendingApprovalMessageStore: {
    set(next: MessagePanelPendingApproval | null): void;
    subscribe(listener: () => void): () => void;
    getSnapshot(): MessagePanelPendingApproval | null;
    getServerSnapshot(): MessagePanelPendingApproval | null;
};
