// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AgentHeaderPanel.tsx
// Portable placeholder for AGENT_HEADER_PANEL (2026-09-12) — the real app
// version (components/views/Headers/AgentHeaderContainer.tsx) reads
// useAgentAccount (live selected agent), seeds a default from
// NEXT_PUBLIC_DEFAULT_AGENT_ADDRESS via a real on-chain hydrate, and wires
// Alt+A/Alt+M keyboard shortcuts through the app's own panel-tree — none
// of which exist in a standalone consumer (the extension, today). Same
// shape (agent name/placeholder title, "Your Sponsor Agent" subtitle,
// centered AgentSelectDropDown pill below), entirely inert — every prop
// optional with safe do-nothing defaults, same "presentation only, no
// sync yet" scope every other extension-bound component here follows.

'use client';

import React from 'react';
import AgentSelectDropDown, { type AgentSelectDropDownProps } from './AgentSelectDropDown';

export interface AgentHeaderPanelProps extends AgentSelectDropDownProps {
  /** The selected agent's display name — shown as the title. Omit (or
   *  blank/whitespace-only) for titlePlaceholder, matching the real app's
   *  `agentAccount?.name?.trim() || AGENT_TITLE_PLACEHOLDER`. */
  agentName?: string;
  /** Shown as the title when agentName is absent. */
  titlePlaceholder?: string;
  /** Subtitle under the title. Matches the real app's own default
   *  (NEXT_PUBLIC_AGENT_SUB_TITLE's fallback). */
  subtitle?: string;
}

export default function AgentHeaderPanel({
  agentName,
  titlePlaceholder = 'Select Agent',
  subtitle = 'Your Sponsor Agent',
  icon,
  address,
  symbol,
  placeholderLabel,
  onSelectClick,
}: AgentHeaderPanelProps) {
  const title = agentName?.trim() || titlePlaceholder;

  return (
    <div>
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          userSelect: 'none',
          paddingTop: 12,
          paddingBottom: 2,
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '0.02em',
            color: '#5981F3',
          }}
        >
          {title}
        </h2>
        {/* 2026-09-12 fix, on request — this was copied verbatim from the
            real app's own `text-sm` (14px), but the real title next to it
            is RESPONSIVE (`text-xl md:text-2xl` — 20px, 24px at md+
            viewports), so at the real app's typical desktop width that
            title actually renders at 24px, an ~1.7x gap over its 14px
            subtitle. This title is a fixed 20px (no breakpoint — a side
            panel's own viewport, unlike the real app's page, isn't
            reliably ever md+ wide), so a literal 14px subtitle closed
            that gap to just 1.4x, reading as oversized next to it. 11px
            (matching this package's other secondary/caption text —
            WalletAccountHeader.tsx's address line, MenuTabHeaderBar.tsx's
            tab labels) restores roughly the real app's proportions
            instead of its literal, breakpoint-dependent pixel value. */}
        <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
          {subtitle}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(51,65,85,0.5)',
          paddingBottom: 2,
        }}
      >
        <AgentSelectDropDown
          icon={icon}
          address={address}
          symbol={symbol}
          placeholderLabel={placeholderLabel}
          onSelectClick={onSelectClick}
        />
      </div>
    </div>
  );
}
