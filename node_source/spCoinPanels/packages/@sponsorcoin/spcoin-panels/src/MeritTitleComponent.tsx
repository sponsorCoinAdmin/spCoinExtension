// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritTitleComponent.tsx
// Portable copy of components/views/Headers/MeritTitleComponent.tsx
// (2026-09-11, "Pages Grey header bar" slice — see
// docs/design/extensionPlan.md). Three real couplings found and removed,
// same "injected prop, not hardcoded" pattern already proven on
// AssetSelectDropDown.tsx:
//
// 1. `next/image` — doesn't resolve outside a Next.js build. Swapped for a
//    plain <img>.
// 2. A hardcoded `usePanelTree().openPanel(MERIT_INFO_PANEL, ...)` click
//    handler — real ExchangeContext/panel-tree coupling. Replaced with an
//    optional `onTitleClick` prop: the app passes its own MERIT_INFO_PANEL
//    opener in; a consumer with no info panel yet (the extension, today)
//    omits it and gets an inert, non-interactive title instead of a dead
//    button.
// 3. Tailwind utility classes (2026-09-11, on request — "no tailwind is
//    too bad" for a component library every consumer would otherwise have
//    to run a PostCSS/Tailwind pipeline just to render correctly). Rewritten
//    as plain inline styles — zero build tooling required by any consumer,
//    Next.js or Vite alike. Only the app's own non-portable
//    components/views/Headers/MeritTitleComponent.tsx keeps its original
//    Tailwind classes; this file is a deliberate visual match, not a shared
//    source file.

'use client';

import React from 'react';

export interface MeritTitleComponentProps {
  /** Icon badge shown in front of the title text. Defaults to the app's
   *  own hosted asset — override for any consumer that can't reach that
   *  origin (e.g. bundle the image locally and pass its extension/asset
   *  URL instead). */
  badgeSrc?: string;
  /** Called when the title is clicked (e.g. open an "About Merit Wallet"
   *  overlay). Omit to render a plain, non-interactive title — the correct
   *  default for any consumer with no such overlay to open yet. */
  onTitleClick?: () => void;
}

const DEFAULT_BADGE_SRC = '/assets/miscellaneous/meritWallet.png?v=22';

const wrapperStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const buttonStyle: React.CSSProperties = {
  ...wrapperStyle,
  pointerEvents: 'auto',
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  color: 'inherit',
  font: 'inherit',
};

export default function MeritTitleComponent({
  badgeSrc = DEFAULT_BADGE_SRC,
  onTitleClick,
}: MeritTitleComponentProps) {
  const content = (
    <>
      <img
        src={badgeSrc}
        alt=""
        width={50}
        height={50}
        style={{ height: 50, width: 50, flexShrink: 0, objectFit: 'contain' }}
      />
      Merit Wallet
    </>
  );

  if (!onTitleClick) {
    // Inert path: matches WalletHeader's own pointer-events-none title
    // slot by default — no dead click affordance shown.
    return <span style={wrapperStyle}>{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={onTitleClick}
      style={buttonStyle}
      aria-label="About Merit Wallet"
      title="About Merit Wallet"
    >
      {content}
    </button>
  );
}
