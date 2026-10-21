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

import { detailPanelStyle } from '@sponsorcoin/spcoin-common/styles';
import React from 'react';
import DetailRow from './DetailRow';

export interface NetworkDetailPanelProps {
  id: string;
  logoSrc?: string;
  name?: string;
  symbol?: string;
  isTestnet?: boolean;
}

export default function NetworkDetailPanel({ id, logoSrc, name, symbol, isTestnet }: NetworkDetailPanelProps) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Network Id', value: id },
    { label: 'Name', value: name || '—' },
    { label: 'Symbol', value: symbol || '—' },
    { label: 'Network Type', value: isTestnet ? 'Testnet' : 'Mainnet' },
  ];

  return (
    <div style={detailPanelStyle.screen}>
      <div style={detailPanelStyle.card}>
        <div style={detailPanelStyle.logoRow}>
          <div style={detailPanelStyle.logoBox}>
            {logoSrc ? (
              <img src={logoSrc} alt="" style={detailPanelStyle.logoContain} />
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
