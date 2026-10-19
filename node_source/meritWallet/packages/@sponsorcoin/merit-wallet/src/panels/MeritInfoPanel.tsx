// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritInfoPanel.tsx
// Portable placeholder for MERIT_INFO_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/MeritInfoPanel/index.tsx)
// fetches a static meritInfo.json and renders it via the real app's
// ReadOnlyMetaDataTable. Same shape (logo card + label/value rows),
// entirely inert — real content passed in as plain rows, no live fetch.
// Placeholder, not logic, per explicit instruction.

'use client';

import { plainPanelStyle } from '@sponsorcoin/spcoin-common/styles';
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
    <div style={plainPanelStyle.infoBox}>
      {icon && <div style={plainPanelStyle.infoIcon}>{icon}</div>}
      <table style={plainPanelStyle.infoTable}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={plainPanelStyle.infoRow}>
              <td style={plainPanelStyle.infoLabel}>
                {row.label}
              </td>
              <td style={plainPanelStyle.infoValue}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
