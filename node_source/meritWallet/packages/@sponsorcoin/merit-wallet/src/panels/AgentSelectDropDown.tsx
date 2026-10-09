// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AgentSelectDropDown.tsx
//
// 2026-09-12 — portable placeholder for AGENT_SELECT_DROP_DOWN. Promoted
// 2026-09-18, on request (the "make npm the single source of truth"
// migration) — first of the five real dropdown wrapper components
// (Token/Account/Agent/Recipient/Pool SelectDropDown) to go real, since it
// already had a dead, unused npm-side placeholder (a literal two-copies
// case) and the web app's real implementation
// (node_source/spCoinPanels/AssetSelectDropDowns/AgentSelectDropDown.tsx)
// is a comparatively thin wrapper: useAgentAccount + useOpenActiveListPanel
// + usePanelVisible + validateAccount, all ExchangeContext-runtime hooks
// that don't exist in a portable package yet. Same treatment TradeAmountRow
// got: every hook-derived value becomes an optional prop, the component
// itself stays entirely hook-free — a real caller (the web app's own
// AgentSelectDropDown, now a thin hook-wiring wrapper around this one)
// resolves the real values and feeds them in; an extension caller with no
// ExchangeContext yet can render this exact same component inert, same
// look as before this promotion, by simply omitting the optional props.
//
// Deliberately NOT built on AssetSelectDropDown (the package's other real,
// portable dropdown) despite the obvious shape overlap — AssetSelectDropDown
// is styled with real Tailwind utility classes (`flex`, `gap-1`,
// `rounded-lg`, etc.), and spCoinExtension still has no Tailwind pipeline
// (confirmed 2026-09-18: no tailwind.config/postcss.config there either),
// so those classes render unstyled in the one environment this package
// exists to serve. Kept this file's own original inline-style approach
// instead, same reasoning every other extension-bound component in this
// package already follows — this is a real, currently-latent gap in
// AssetSelectDropDown itself (fine today only because nothing in the
// extension's live UI renders it yet), flagged here rather than silently
// worked around by inheriting it into a second component.

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, CheckCheck } from 'lucide-react';
import AnonymousAvatar from './AnonymousAvatar';
import { dropDownStyle } from '@sponsorcoin/spcoin-common/styles';

// Same component/reasoning as TradeAmountRow.tsx's own CopyAddressButton —
// duplicated rather than shared across files on purpose (this package has
// no internal-only shared-utility convention yet; see that file's own
// header comment history for why extracting one wasn't done speculatively).
function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(address).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Copy address"
      title="Copy address"
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        borderRadius: 3,
        border: 'none',
        background: hovered ? dropDownStyle.copyHoverBackground : 'transparent',
        color: copied ? dropDownStyle.copiedColor : 'inherit',
        cursor: 'pointer',
      }}
    >
      {copied ? <CheckCheck size={dropDownStyle.copyIconSizePx} /> : <Copy size={dropDownStyle.copyIconSizePx} />}
    </button>
  );
}

export interface AgentSelectDropDownProps {
  /** Rendered in the icon slot when an agent is selected. Omit for the
   *  unselected placeholder — no default avatar, since there's no default
   *  agent to show one for. Real caller passes its own resolved
   *  AccountAvatar-or-fallback element, same convention as TradeAmountRow's
   *  tokenIcon prop. */
  icon?: React.ReactNode;
  address?: string;
  symbol?: string;
  /** Shown (as "$placeholderLabel: ") when nothing is selected. */
  placeholderLabel?: string;
  /** Called on click (e.g. open/close an agent picker). Omit for an inert
   *  pill with no picker to open — today's placeholder default. */
  onSelectClick?: (e: React.SyntheticEvent) => void;
  /** Whether the picker this trigger opens is currently open — flips the
   *  chevron direction (matches AccountSelectDropDown's own
   *  CHEVRON_UP/CHEVRON_DN convention: up means open). Omit for a
   *  permanently-closed-looking chevron (today's placeholder default). */
  listOpen?: boolean;
  /** Chars kept before/after the "..." filler (see AssetSelectDropDown's
   *  own truncateMiddle). Omit for the full, untruncated address. */
  addrPrePostSize?: number;
  /** Panel id this instance is gated by. If omitted, renders unconditionally
   *  (no PanelGate) — same contract as AssetSelectDropDown's own
   *  panelGateId/panelGate pair, duplicated here rather than imported
   *  since this component deliberately has no dependency on
   *  AssetSelectDropDown (see this file's own header comment on why). */
  panelGateId?: number;
  /** The PanelGate implementation to gate with, when panelGateId is set —
   *  injected so this file has no hardcoded dependency on any one app's
   *  PanelGate. The web app passes its real '@/components/utility/PanelGate';
   *  an extension caller can pass this package's own PanelGate.tsx (2026-09-21,
   *  Path A — bound to the real @sponsorcoin/spcoin-exchange-engine, same
   *  code both apps share), or omit both props for unconditional
   *  rendering. No effect when panelGateId is omitted. */
  panelGate?: React.ComponentType<{
    panel: number;
    children: React.ReactNode;
    lazyLoad?: boolean;
    className?: string;
  }>;
}

function truncateMiddle(addr: string, size: number): string {
  return addr.length > size * 2 + 3 ? `${addr.slice(0, size)}...${addr.slice(-size)}` : addr;
}

export default function AgentSelectDropDown({
  icon,
  address,
  symbol,
  placeholderLabel = 'Select Agent',
  onSelectClick,
  listOpen,
  addrPrePostSize,
  panelGateId,
  panelGate: PanelGate,
}: AgentSelectDropDownProps) {
  const [hovered, setHovered] = useState(false);
  const hasEntity = Boolean(address);
  const displayAddress = address && addrPrePostSize != null ? truncateMiddle(address, addrPrePostSize) : address;

  const content = (
    <div
      onClick={onSelectClick}
      onMouseEnter={() => onSelectClick && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...dropDownStyle.row, cursor: onSelectClick ? 'pointer' : 'default' }}
    >
      {/* Outside the pill — sized by the shared asset-select scale (spcoin-common/styles, 22px; was a stale 40px that predates AssetSelectDropDown's own 2026-09-13 resize), matching the real
          AssetSelectDropDown.tsx's default icon slot exactly. */}
      <span
        style={{
          display: 'flex',
          height: dropDownStyle.iconSizePx,
          width: dropDownStyle.iconSizePx,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9999px',
          overflow: 'hidden',
          background: 'transparent',
        }}
      >
        {/* 2026-10-03 — no agent selected: the shared Anonymous avatar, not a
            blank dark circle (see AnonymousAvatar.tsx). */}
        {icon ?? <AnonymousAvatar />}
      </span>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: dropDownStyle.pill.height,
          padding: '0 8px',
          borderRadius: 9999,
          // Matches the real pill's solid bg-[#243056] (AssetSelectDropDown's
          // ADDR_COMP, non-blur variant — the one AGENT_SELECT_DROP_DOWN
          // actually uses, not WalletHeader's frosted-glass one).
          background: hovered ? dropDownStyle.pill.backgroundHover : dropDownStyle.pill.background,
        }}
      >
        <span style={{ ...dropDownStyle.text }}>
          {hasEntity ? [symbol, displayAddress].filter(Boolean).join(' ') : placeholderLabel}
        </span>
        {hasEntity && address && <CopyAddressButton address={address} />}
        {listOpen ? (
          <ChevronUp size={dropDownStyle.chevronSizePx} style={{ flexShrink: 0, color: dropDownStyle.glyphColor }} />
        ) : (
          <ChevronDown size={dropDownStyle.chevronSizePx} style={{ flexShrink: 0, color: dropDownStyle.glyphColor }} />
        )}
      </div>
    </div>
  );

  if (panelGateId === undefined || !PanelGate) return content;

  return (
    <PanelGate panel={panelGateId} lazyLoad={false}>
      {content}
    </PanelGate>
  );
}
