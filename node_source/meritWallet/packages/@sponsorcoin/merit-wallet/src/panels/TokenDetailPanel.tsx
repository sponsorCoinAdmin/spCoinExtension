// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TokenDetailPanel.tsx
// 2026-09-16, on request ("do the same for the info.png in the lists") —
// the token-list counterpart to AccountDetailPanel.tsx (same request, same
// day, applied to every list's own info button instead of just
// WalletAccountHeader's avatar). Same shell/discipline as that file: a
// portable, read-only "logo.png + info.json fields" view, no feed
// dependency of its own — the caller resolves logoSrc and the info.json-
// shaped fields (matching spcoin-feeds/tokens' own TokenRecord type) and
// passes them down.

'use client';

import { walletColors, walletTints } from '@sponsorcoin/spcoin-common/styles';
import React from 'react';

export interface TokenDetailPanelProps {
  address: string;
  logoSrc?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  website?: string;
  explorer?: string;
  description?: string;
  /** True while the caller's own metadata/logo fetch is still in flight —
   *  same convention as AccountDetailPanel's own `loading`. */
  loading?: boolean;
}

const ROW_LABEL_STYLE: React.CSSProperties = {
  color: walletColors.textMuted,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const ROW_VALUE_STYLE: React.CSSProperties = {
  color: walletColors.white,
  fontSize: 12,
  fontWeight: 500,
  wordBreak: 'break-word',
};

function DetailRow({ label, value, zebra }: { label: string; value: React.ReactNode; zebra: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '8px 14px',
        // Same rowA/rowB zebra values AssetListTable.tsx's own
        // ASSET_LIST_ROW_BG_A/B use — same duplicated-literal reasoning as
        // AccountDetailPanel.tsx's own identical row (see that file's
        // comment on this exact pair of values).
        background: zebra ? walletTints.panelTint35 : walletTints.grayTint25,
      }}
    >
      <span style={ROW_LABEL_STYLE}>{label}</span>
      <span style={ROW_VALUE_STYLE}>{value}</span>
    </div>
  );
}

export default function TokenDetailPanel({
  address,
  logoSrc,
  name,
  symbol,
  decimals,
  website,
  explorer,
  description,
  loading = false,
}: TokenDetailPanelProps) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Address', value: address },
    { label: 'Name', value: loading ? 'Loading…' : name || '—' },
    { label: 'Symbol', value: loading ? 'Loading…' : symbol || '—' },
    { label: 'Decimals', value: loading ? 'Loading…' : decimals ?? '—' },
    { label: 'Website', value: loading ? 'Loading…' : website || '—' },
    { label: 'Explorer', value: loading ? 'Loading…' : explorer || '—' },
    { label: 'Description', value: loading ? 'Loading…' : description || '—' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden', padding: '3px 12px' }}>
      <div
        style={{
          display: 'flex',
          minHeight: 0,
          flex: 1,
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 20,
          border: '1px solid #334155',
          background: walletColors.background,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 14px 14px' }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 16,
              overflow: 'hidden',
              background: walletColors.slateDark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {logoSrc ? (
              <img src={logoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>
        </div>
        <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {rows.map((row, i) => (
            <DetailRow key={row.label} label={row.label} value={row.value} zebra={i % 2 === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
