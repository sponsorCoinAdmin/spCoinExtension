// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AssetListSelectPanel.tsx
// Portable placeholder for ASSET_LIST_SELECT_PANEL (2026-09-12) — thin
// wrapper over GenericListPanel.tsx (see its own doc comment for the full
// "why"). The real app version amalgamates several real feeds (token
// list, account list, agent/recipient/sponsor remote lists — see
// lib/structure's FEED_TYPE) behind one search box. Placeholder, not
// logic, per explicit instruction.

'use client';

import React from 'react';
import GenericListPanel, { type GenericListRow } from './GenericListPanel';

export interface AssetListSelectPanelProps {
  searchPlaceholder?: string;
  rows?: GenericListRow[];
}

export default function AssetListSelectPanel({ searchPlaceholder = 'Search tokens or accounts', rows }: AssetListSelectPanelProps) {
  return <GenericListPanel searchPlaceholder={searchPlaceholder} rows={rows} emptyText="No results yet." />;
}
