// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritInfoPanel.tsx
// Portable placeholder for MERIT_INFO_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/MeritInfoPanel/index.tsx)
// fetches a static meritInfo.json and renders it via the real app's
// ReadOnlyMetaDataTable. Same shape (logo card + label/value rows),
// entirely inert — real content passed in as plain rows, no live fetch.
// Placeholder, not logic, per explicit instruction.

'use client';

import React from 'react';

export interface MeritInfoRow {
  label: string;
  value: React.ReactNode;
}

export interface MeritInfoPanelProps {
  /** Logo card shown above the rows — omit for no image. */
  icon?: React.ReactNode;
  rows?: MeritInfoRow[];
}

const DEFAULT_ROWS: MeritInfoRow[] = [
  { label: 'Name', value: 'Merit Wallet' },
  { label: 'Website', value: 'N/A' },
];

export default function MeritInfoPanel({ icon, rows = DEFAULT_ROWS }: MeritInfoPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
      {icon && <div style={{ width: '100%' }}>{icon}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={{ borderTop: '1px solid rgba(51,65,85,0.5)' }}>
              <td style={{ padding: '6px 4px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                {row.label}
              </td>
              <td style={{ padding: '6px 4px', color: '#e2e8f0' }}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
