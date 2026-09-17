// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AgentSelectDropDown.tsx
// Portable placeholder for AGENT_SELECT_DROP_DOWN (2026-09-12) — the real
// app version (node_source/spCoinPanels/AssetSelectDropDowns/
// AgentSelectDropDown.tsx) wraps AccountSelectDropDown/AssetSelectDropDown
// with useAgentAccount, useOpenActiveListPanel, and the Sponsor/Recipient/
// Agent mutual-exclusion rule (validateAccount) — all of which need a real
// ExchangeContext/panel-tree that doesn't exist in a standalone consumer
// (the extension, today). This is the same shape (icon + symbol/address
// pill + chevron), entirely inert, same "presentation only, no sync yet"
// scope every other extension-bound component in this package has
// followed so far.
//
// Not `AssetSelectDropDown` reused directly: that component is real and
// already portable, but it's styled with Tailwind classes — fine for the
// web app, which runs Tailwind, but the extension has no Tailwind
// pipeline (confirmed: no tailwind.config/postcss.config in
// spCoinExtension), so those classes would render unstyled there. Inline
// styles instead, same reasoning as every other component here.
//
// Deliberately its own small pill, not a clone of WalletAccountHeader's
// row — the real AGENT_SELECT_DROP_DOWN is a compact, centered trigger
// pill (icon + symbol + address + chevron), not a full-width header row.
//
// 2026-09-13 fix, on request, reversing the icon handling described
// above (kept literally so the history is legible, not because it's
// still current): the icon was inside a single rounded capsule together
// with the symbol/address/chevron, at a flat 18x18 "consistent across
// every dropdown" size. Neither matches the real component — AgentSelect
// DropDown -> AccountSelectDropDown -> AssetSelectDropDown.tsx (node_
// source/spCoinPanels/AssetSelectDropDowns/), whose `content` JSX has the
// icon as a SIBLING of (outside) the pill that wraps only the address/
// copy/chevron, sized via `iconSizeClassName`'s default `h-10 w-10` (40px
// — neither AccountSelectDropDown nor AgentSelectDropDown overrides it
// for this call site). Restructured to match both: icon slot moved
// outside the pill, resized 18->40 to reflect that actual real-app size
// rather than an invented compact placeholder value.

'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AgentSelectDropDownProps {
  /** Rendered in the icon slot when an agent is selected. Omit for the
   *  unselected placeholder — no default avatar, since there's no default
   *  agent to show one for. */
  icon?: React.ReactNode;
  address?: string;
  symbol?: string;
  /** Shown (as "$placeholderLabel: ") when nothing is selected — the only
   *  real state this component has anything to render for today. */
  placeholderLabel?: string;
  /** Called on click (e.g. open an agent picker). Omit for an inert pill
   *  with no picker to open yet. */
  onSelectClick?: () => void;
}

export default function AgentSelectDropDown({
  icon,
  address,
  symbol,
  placeholderLabel = 'Select Agent',
  onSelectClick,
}: AgentSelectDropDownProps) {
  const [hovered, setHovered] = useState(false);
  const hasEntity = Boolean(address);

  return (
    <div
      onClick={onSelectClick}
      onMouseEnter={() => onSelectClick && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: onSelectClick ? 'pointer' : 'default' }}
    >
      {/* 40x40 (h-10 w-10), outside the pill — matches the real
          AssetSelectDropDown.tsx's default icon slot exactly (see this
          file's own header comment). */}
      <span
        style={{
          display: 'flex',
          height: 40,
          width: 40,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9999px',
          overflow: 'hidden',
          background: icon ? 'transparent' : 'rgba(0,0,0,0.2)',
        }}
      >
        {icon}
      </span>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 25,
          padding: '0 8px',
          borderRadius: 9999,
          // Matches the real pill's solid bg-[#243056] (AssetSelectDropDown's
          // ADDR_COMP, non-blur variant — the one AGENT_SELECT_DROP_DOWN
          // actually uses, not WalletHeader's frosted-glass one).
          background: hovered ? '#2c3a68' : '#243056',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
          {hasEntity ? [symbol, address].filter(Boolean).join(' ') : placeholderLabel}
        </span>
        <ChevronDown size={11} style={{ flexShrink: 0, color: '#f8fafc' }} />
      </div>
    </div>
  );
}
