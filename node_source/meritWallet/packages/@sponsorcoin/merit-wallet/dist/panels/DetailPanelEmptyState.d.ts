import React from 'react';
export interface DetailPanelEmptyStateProps {
    /** e.g. "No active account connected." / "No token contract selected." */
    title: string;
    /** Role word(s), e.g. ["Agent"] or ["Sponsor", "Recipient"] — rendered as
     *  "Select an/a <role> to manage." Omit for ACCOUNT_PANEL's own plain
     *  variant (it has no picker — the active account is just whatever's
     *  connected, not something chosen here). */
    roles?: string[];
}
export default function DetailPanelEmptyState({ title, roles }: DetailPanelEmptyStateProps): React.JSX.Element;
