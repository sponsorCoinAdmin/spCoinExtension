// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ProcessFlowPanel.tsx
// Portable placeholder for PROCESS_FLOW (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/ProcessFlowPanel.tsx, 604
// lines; renamed from AUTH_TRANSACTION, same panel id) reads a live Merit
// approval request (meritConnect's request singleton) and is mostly
// headless in practice — see docs/handoff.md's 2026-09-08/09 notes: no
// chain, no panel body most of the time, just an auto-resolve plus a
// password-confirm modal for the one case that still needs a person. The
// one visible state worth a placeholder for is the brief "settling"
// spinner + status line. Entirely inert — no real approval/settling state
// exists in a standalone consumer (the extension, today). Placeholder,
// not logic, per explicit instruction.

'use client';

import React from 'react';

export interface ProcessFlowPanelProps {
  /** e.g. "Signing Swapping via Uniswap V3…" — matches the real app's own
   *  title-bar convention during a pending write. */
  statusText?: string;
}

export default function ProcessFlowPanel({ statusText = 'Signing…' }: ProcessFlowPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20 }}>
      <div
        style={{
          height: 24,
          width: 24,
          borderRadius: '9999px',
          border: '3px solid rgba(148,163,184,0.25)',
          borderTopColor: '#5981F3',
        }}
      />
      <span style={{ fontSize: 12, color: '#e2e8f0' }}>{statusText}</span>
    </div>
  );
}
