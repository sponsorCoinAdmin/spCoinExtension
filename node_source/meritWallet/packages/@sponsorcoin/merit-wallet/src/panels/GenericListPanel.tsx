// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/GenericListPanel.tsx
// Shared building block (2026-09-12) for the four list-shaped panels
// (ASSET_LIST_SELECT_PANEL, SPONSOR_STAKING_LIST, ACCOUNT_LIST_REWARDS_PANEL,
// MANAGE_SPONSORSHIPS_PANEL) — a search box + a list of icon/name/address/
// trailing-value rows. Each real version reads a live, on-chain-derived
// list (accounts, staking buckets, sponsorships) — none of which exists in
// a standalone consumer (the extension, today). Same shape, entirely
// inert, empty by default. Placeholder, not logic, per explicit
// instruction.

'use client';

import { walletColors, walletTints } from '@sponsorcoin/spcoin-common/styles';
import React from 'react';
import { Search } from 'lucide-react';

export interface GenericListRow {
  icon?: React.ReactNode;
  primary: string;
  secondary?: string;
  trailing?: string;
}

export interface GenericListPanelProps {
  searchPlaceholder?: string;
  /** Omit for no search box at all (e.g. panels with no filter of their own). */
  showSearch?: boolean;
  rows?: GenericListRow[];
  emptyText?: string;
}

export default function GenericListPanel({
  searchPlaceholder = 'Search',
  showSearch = true,
  rows = [],
  emptyText = 'Nothing to show yet.',
}: GenericListPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
      {showSearch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, background: walletColors.oneOffSurfaceNavy, padding: '6px 10px' }}>
          <Search size={13} color="#64748b" />
          <span style={{ fontSize: 11, color: walletColors.slate }}>{searchPlaceholder}</span>
        </div>
      )}
      {rows.length === 0 ? (
        <div style={{ padding: '12px 4px', fontSize: 11, color: walletColors.slate, textAlign: 'center' }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                background: walletColors.oneOffSurfaceNavy,
                padding: '6px 10px',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  height: 22,
                  width: 22,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  background: row.icon ? 'transparent' : walletTints.oneOffBlackTint20,
                }}
              >
                {row.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: walletColors.oneOffTextPale, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.primary}
                </div>
                {row.secondary && (
                  <div style={{ fontSize: 10, color: walletColors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.secondary}
                  </div>
                )}
              </div>
              {row.trailing && <div style={{ fontSize: 11, color: walletColors.textLight, flexShrink: 0 }}>{row.trailing}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
