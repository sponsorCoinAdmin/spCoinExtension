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
// its own frame applied via inline style (@sponsorcoin/spcoin-common/
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
// 2026-10-24 (owner clarification, same day) — omitting activeRadioPanel
// sets nothing BY ITSELF; it is not a disguised "open MERIT_INFO_PANEL"
// default. Separately, though: MAIN_RADIO_OVERLAY_PANELS deliberately has
// no fallbackPanel of its own (panelGroups.ts — "all ten being closed is
// a valid state"), so WITHOUT this, a caller that never sets
// activeRadioPanel and whose last-open radio panel got closed some other
// way would show a genuinely blank body. useActiveRadioPanel() (the same
// "is anything in the group currently open" read PanelListSelectWrapper.tsx
// already uses) answers that here: whenever it reports undefined AND no
// explicit activeRadioPanel override is in play, MERIT_INFO_PANEL opens as
// the default so the body is never blank. This re-checks on every change
// to either value, not just on mount, so it holds as a standing invariant.
//
// 2026-10-24 (owner request, same day) — radioFrame (the production frame,
// side buffer of the wallet + 4px below, panelBoxStyle in spcoin-common)
// swapped for radioDebugFrame here: yellow background, 4px on all four
// sides, a visual debug marker for live-testing the behavior above — not a
// production style, see that style's own comment for how to revert it.
//
// 2026-10-24 (owner correction, same day) — DOES now own its own flex/
// scroll sizing (radioSlide: flex:1/minHeight:0/overflowY:auto), reversing
// the "deliberately NOT flex/scroll sizing" split this file used to
// describe. The owner's own correction: WALLET_RADIO_PANELS should be the
// scroll panel itself, with its own real external margin (marginBottom on
// radioSlide) marking its boundary from MERIT_WALLET's own frame — not an
// ancestor (MenuTabHeaderBar's own body wrapper) scrolling on its behalf
// with WALLET_RADIO_PANELS' content buried inside the scrolled area (a
// scrolled-away child's own margin is unreliable there, a known Chromium
// quirk — see panelBoxStyle.radioDebugFrame's own comment). The
// .spcoinMenuTabBodyScroll scrollbar-hide class moved here too, onto the
// actual scrolling element, matching where the rule's own ::-webkit-
// scrollbar selector needs to land to do anything.
//
// This still leaves MenuTabHeaderBar.tsx owning the flex column ABOVE this
// (TabRow + the plain body wrapper div, now non-scrolling, that gives this
// component its bounded height to flex:1 against) — the split is now "who
// scrolls," not "who sizes," between the two files.

'use client';

import React, { useEffect } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { panelBoxStyle, panelPartClass } from '@sponsorcoin/spcoin-common/styles';
import { usePanelVisible, usePanelTree, useActiveRadioPanel } from '@sponsorcoin/spcoin-exchange-engine';

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
   *  set, and again every time the value changes. Omitting it sets nothing
   *  by itself — but if NO radio panel is active at all (the group has no
   *  fallbackPanel of its own), MERIT_INFO_PANEL opens as the default so
   *  the body is never blank. */
  activeRadioPanel?: SP_COIN_DISPLAY;
}

export default function WalletRadioPanels({ children, activeRadioPanel }: WalletRadioPanelsProps) {
  const visible = usePanelVisible(SP_COIN_DISPLAY.WALLET_RADIO_PANELS);
  const { openPanel } = usePanelTree();
  const currentlyActive = useActiveRadioPanel();

  useEffect(() => {
    if (activeRadioPanel != null) {
      openPanel(activeRadioPanel, 'WalletRadioPanels:activeRadioPanel');
    } else if (currentlyActive == null) {
      openPanel(SP_COIN_DISPLAY.MERIT_INFO_PANEL, 'WalletRadioPanels:activeRadioPanel:default');
    }
  }, [activeRadioPanel, currentlyActive, openPanel]);

  return (
    <div
      data-panel={SP_COIN_DISPLAY[SP_COIN_DISPLAY.WALLET_RADIO_PANELS]}
      data-visible={visible ? 'true' : 'false'}
      className={panelPartClass.menuTabBody}
      style={panelBoxStyle.radioSlide(visible)}
    >
      <div
        style={panelBoxStyle.radioDebugFrame}
      >
        {children}
      </div>
    </div>
  );
}
