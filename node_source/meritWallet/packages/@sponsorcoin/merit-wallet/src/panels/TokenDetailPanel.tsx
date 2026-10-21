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

import { detailPanelStyle } from '@sponsorcoin/spcoin-common/styles';
import React from 'react';
import DetailRow from './DetailRow';

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
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Address', value: address },
    { label: 'Name', value: loading ? 'Loading…' : name || '—' },
    { label: 'Symbol', value: loading ? 'Loading…' : symbol || '—' },
    { label: 'Decimals', value: loading ? 'Loading…' : decimals ?? '—' },
    { label: 'Website', value: loading ? 'Loading…' : website || '—' },
    { label: 'Explorer', value: loading ? 'Loading…' : explorer || '—' },
    { label: 'Description', value: loading ? 'Loading…' : description || '—' },
  ];

  return (
    <div style={detailPanelStyle.screen}>
      <div style={detailPanelStyle.card}>
        <div style={detailPanelStyle.logoRow}>
          <div style={detailPanelStyle.logoBox}>
            {logoSrc ? (
              <img src={logoSrc} alt="" style={detailPanelStyle.logoCover} />
            ) : null}
          </div>
        </div>
        <div style={detailPanelStyle.rows}>
          {rows.map((row, i) => (
            <DetailRow key={row.label} label={row.label} value={row.value} zebra={i % 2 === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
