// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AccountListRewardsPanel.tsx
// Portable placeholder for ACCOUNT_LIST_REWARDS_PANEL (2026-09-12) — thin
// wrapper over GenericListPanel.tsx (see its own doc comment for the full
// "why"). The real app version reads live per-account reward totals.
// Placeholder, not logic, per explicit instruction.

'use client';

import React from 'react';
import GenericListPanel, { type GenericListRow } from './GenericListPanel';

export interface AccountListRewardsPanelProps {
  rows?: GenericListRow[];
}

export default function AccountListRewardsPanel({ rows }: AccountListRewardsPanelProps) {
  return <GenericListPanel showSearch={false} rows={rows} emptyText="No reward accounts yet." />;
}
