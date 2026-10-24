// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletRadioPanels.tsx
//
// 2026-09-22 — shared gate for WALLET_RADIO_PANELS, the single ancestor
// every radio panel (Trading Station, Send, Sponsor, Rewards, Config,
// Account, Token, Wallet Config, Message, every remote list) sits under
// on both the Web App and the Extension — see docs/npmPanelDisplayIssue.md
// for the investigation that motivated pulling this out as real shared
// code instead of two independently-hand-synced copies.
//
// Reads WALLET_RADIO_PANELS' own visibility directly via this package's
// usePanelVisible (bound to the real, shared @sponsorcoin/spcoin-exchange-
// engine), so a consumer's WALLET_RADIO_PANELS visibility reads from the
// literal same code the Web App's own equivalent already used, not a
// second implementation. No @/-aliased imports, no Tailwind dependency —
// RADIO_PANEL_BUFFER applied via inline style (@sponsorcoin/spcoin-common/
// styles), same reasoning as every other dynamic value in this package: a
// Tailwind class built from a JS constant has no guarantee of ever
// compiling to real CSS (confirmed, the hard way, on the Web App side —
// see that same doc).
//
// 2026-10-24 (owner request) — converted from a PanelGate-gated hard
// mount/unmount to a collapsible component: children stay mounted and the
// wrapper animates shut via panelBoxStyle.radioSlide (same maxHeight/
// opacity technique MenuTabHeaderBar's own TabRow already uses for its
// collapse), instead of PanelGate's instant, unanimated remove-from-DOM.
// Closing WALLET_RADIO_PANELS is not wired to any visible control yet
// (nothing currently calls closePanel/openPanel on it outside the debug
// panel tree) — this just makes the component itself capable of
// collapsing smoothly once something does.
//
// 2026-10-24 (owner request, same day) — `activeRadioPanel`: an optional
// MAIN_RADIO_OVERLAY_PANELS member a caller can pass to make THAT the open
// radio panel. Fires openPanel whenever the prop is supplied and changes
// (includes first mount, if already set then) — same openPanel a caller
// would reach for directly via usePanelTree(), just reachable as a prop
// here instead, for a caller that wants "show WALLET_RADIO_PANELS with X
// already active" as one call rather than two (open the panel, then also
// handle WALLET_RADIO_PANELS' own visibility separately).
//
// Deliberately scoped to JUST the visibility read + RADIO_PANEL_BUFFER's
// horizontal padding — NOT flex/scroll sizing. The two real consumers wrap
// this differently for that, and neither wrapping is wrong, just
// structurally different: the Web App's own `components/views/Headers/
// WalletRadioPanels.tsx` (a thin wrapper around this component) owns its
// own scrollbar-hide/flex-1/overflow-y-auto shell, because its own
// `MenuTabHeaderBar.tsx` is a bare Fragment with no shell of its own.
// This package's own `MenuTabHeaderBar.tsx` already wraps its `children`
// in exactly that same kind of scroll box internally — a second one here
// would just be redundant nesting. Trying to force both apps onto one
// identical DOM shape here would mean changing one of the two apps'
// already-working, unrelated layout structure just to make this one
// piece look more "shared" than it actually needs to be.

'use client';

import React, { useEffect } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { RADIO_PANEL_BUFFER, panelBoxStyle } from '@sponsorcoin/spcoin-common/styles';
import { usePanelVisible, usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';

// 2026-09-30 — this panel's own internal bottom buffer (distinct from
// PANEL_GAP, the 2px buffer BETWEEN panels used elsewhere in this
// package). Corrected same day: first set to PANEL_GAP (2px) on a live
// report that actually meant this panel specifically, then explicitly
// raised to 4px once the reporter clarified — e.g. the spacing from
// UNI_TRADE_BUTTON down to WALLET_RADIO_PANELS' own bottom edge
// should read as 4px, not 2px.

export interface WalletRadioPanelsProps {
  children: React.ReactNode;
  /** Optional: a MAIN_RADIO_OVERLAY_PANELS member to open (openPanel) when
   *  supplied — makes it the active radio panel. Fires on mount if already
   *  set, and again every time the value changes. Omit for a caller that
   *  manages the active radio panel itself. */
  activeRadioPanel?: SP_COIN_DISPLAY;
}

export default function WalletRadioPanels({ children, activeRadioPanel }: WalletRadioPanelsProps) {
  const visible = usePanelVisible(SP_COIN_DISPLAY.WALLET_RADIO_PANELS);
  const { openPanel } = usePanelTree();

  useEffect(() => {
    if (activeRadioPanel != null) {
      openPanel(activeRadioPanel, 'WalletRadioPanels:activeRadioPanel');
    }
  }, [activeRadioPanel, openPanel]);

  return (
    <div
      data-panel={SP_COIN_DISPLAY[SP_COIN_DISPLAY.WALLET_RADIO_PANELS]}
      data-visible={visible ? 'true' : 'false'}
      style={panelBoxStyle.radioSlide(visible)}
    >
      <div
        style={panelBoxStyle.radioFrame(RADIO_PANEL_BUFFER)}
      >
        {children}
      </div>
    </div>
  );
}
