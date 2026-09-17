// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/NetworkDetailPanel.tsx
// 2026-09-16, on request ("do the same for the info.png in the lists...
// there are 3 list types... ACCOUNT, TOKEN and NETWORK") — the third and
// last detail view, alongside AccountDetailPanel/TokenDetailPanel. Genuine
// shape difference from those two, not just a copy-paste: a network's own
// "info.json" equivalent (spcoin-feeds/networks' CONFIGURED_NETWORKS) is a
// small static list already held fully in memory by whatever caller
// supplied networkRows — there's no per-network on-demand fetch the way
// fetchAccountMetadata/fetchTokenByAddress are for the other two, so this
// component (and MeritWallet.tsx's own use of it) needs no `loading` state
// or caller round-trip at all; the data is already there the moment the
// icon is clicked.

'use client';

import React from 'react';

export interface NetworkDetailPanelProps {
  id: string;
  logoSrc?: string;
  name?: string;
  symbol?: string;
  isTestnet?: boolean;
}

const ROW_LABEL_STYLE: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const ROW_VALUE_STYLE: React.CSSProperties = {
  color: '#ffffff',
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
        // AccountDetailPanel.tsx/TokenDetailPanel.tsx's own identical row.
        background: zebra ? 'rgba(56,78,126,0.35)' : 'rgba(156,163,175,0.25)',
      }}
    >
      <span style={ROW_LABEL_STYLE}>{label}</span>
      <span style={ROW_VALUE_STYLE}>{value}</span>
    </div>
  );
}

export default function NetworkDetailPanel({ id, logoSrc, name, symbol, isTestnet }: NetworkDetailPanelProps) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Network Id', value: id },
    { label: 'Name', value: name || '—' },
    { label: 'Symbol', value: symbol || '—' },
    { label: 'Network Type', value: isTestnet ? 'Testnet' : 'Mainnet' },
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
          background: '#0b0e19',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 14px 14px' }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 16,
              overflow: 'hidden',
              background: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {logoSrc ? (
              <img src={logoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
