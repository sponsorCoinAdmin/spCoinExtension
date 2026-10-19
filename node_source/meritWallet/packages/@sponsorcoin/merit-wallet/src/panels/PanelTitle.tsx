// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/PanelTitle.tsx
// Portable shell for PANEL_TITLE (2026-09-12, reworked 2026-09-22 — see
// WalletHeader.tsx's own "opaque slot" precedent for the pattern this
// follows). Originally an inert placeholder (no panel tree existed in a
// standalone consumer to navigate with); its prop surface (title/
// onBackClick/onMenuClick/menuOpen) turned out to already fit the web
// app's own real usage exactly — a live `useActiveWalletPanelTitle()`
// computed title and a plain `() => closePanel(...)` callback for the
// back button — so the web app's own separate copy
// (components/views/PopupHeader.tsx, via ActiveWalletPanelTitle.tsx) was
// retired entirely in favor of this one file. Real back-button behavior
// still differs between the two apps (the web app's closePanel(...) is a
// single generic call into the shared panel-tree engine covering every
// "go back" case; the package's own MeritWallet.tsx still hand-rolls its
// own local 4-way branch) — that's each caller's own callback, not
// something this shell needs to know about. Inline styles (no Tailwind),
// same reasoning as every sibling component.
//
// Sizing scaled down from the real app's 44px (h-11 w-11) buttons/20px
// title to this panel's own established compact scale (see WalletHeader.tsx's
// 30px buttons) rather than copying the real, popup-sized numbers verbatim.

'use client';

import { panelTitleStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useState } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';

export interface PanelTitleProps {
  /** Centered title text. Defaults to the app's own default post-boot
   *  panel (Trading Station — see PanelBootstrap.tsx) since that's the
   *  only title this component has a real default for without a live
   *  panel-tree to compute one from. */
  title?: React.ReactNode;
  /** Omit for an inert back button (no panel tree to go back in yet). */
  onBackClick?: () => void;
  /** Omit for an inert menu button. */
  onMenuClick?: () => void;
  /** Purely visual — highlights the menu button while whatever it opens
   *  (e.g. MenuTabHeaderBar) is open. No effect on behavior. */
  menuOpen?: boolean;
  /** 2026-10-03, on request — render nothing (not an inert button) where the
   *  back button goes. A same-width spacer keeps the title centered. Used while
   *  the password panel is active: there is nothing to go back to before the
   *  wallet is unlocked. */
  hideBackButton?: boolean;
  /** Same, for the hamburger menu button on the right. */
  hideMenuButton?: boolean;
}

// IconButton's own width (see IconButton below) — the spacer must match it or
// hiding one side would shift the centered title.

function IconButton({
  onClick,
  ariaLabel,
  active,
  children,
}: {
  onClick?: () => void;
  ariaLabel: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={panelTitleStyle.iconButton({ active: !!active, hovered, clickable: !!onClick })}
    >
      {children}
    </button>
  );
}

export default function PanelTitle({
  title = 'Trading Station',
  onBackClick,
  onMenuClick,
  menuOpen,
  hideBackButton = false,
  hideMenuButton = false,
}: PanelTitleProps) {
  return (
    <div
      style={panelTitleStyle.row}
    >
      <div style={panelTitleStyle.side(hideBackButton)}>
        {!hideBackButton && (
          <IconButton onClick={onBackClick} ariaLabel="Go back">
            <ArrowLeft {...panelTitleStyle.icon} />
          </IconButton>
        )}
      </div>
      <h2
        style={panelTitleStyle.title}
      >
        {title}
      </h2>
      <div style={panelTitleStyle.side(hideMenuButton)}>
        {!hideMenuButton && (
          <IconButton onClick={onMenuClick} ariaLabel="Open wallet menu" active={menuOpen}>
            <Menu {...panelTitleStyle.icon} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
