// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AgentHeaderPanel.tsx
//
// Real, portable migration of AGENT_HEADER_PANEL — promoted from the web
// app's real components/views/Headers/AgentHeaderContainer.tsx (2026-09-22,
// on request: "start with the easiest and move towards the hardest"). Every
// piece of that file's logic that was already free of ExchangeContext coupling
// moves here directly; the only non-portable pieces — `useAgentAccount` and
// `hydrateAccountFromAddress` — become callback props the web app's thin
// AgentHeaderContainer.tsx wrapper resolves and passes down.
//
// usePanelTree/usePanelVisible are genuinely portable (Path A, real shared
// engine) so this component calls them directly, same pattern as
// ConfigSlippagePanel.tsx/BuySellSwapArrowButton.tsx. MENU_TAB_HEADER_BAR
// visibility stays on the package's own meritPanelState (via
// setPanelVisible/meritPanelState.setVisible) — same dual-engine
// read/write split AgentHeaderContainer.tsx already had, confirmed correct
// via MeritWalletComponent.tsx/AccountPanelContent.tsx consuming the same
// Merit-only id. See docs/design/extensionPlan.md §7 for the full reasoning.
//
// The AgentSelectDropDown below is rendered as a slot (children) rather than
// imported directly: the web app's own hook-wiring wrapper
// (node_source/spCoinPanels/AssetSelectDropDowns/AgentSelectDropDown.tsx)
// resolves useAgentAccount/useOpenActiveListPanel/validateAccount and feeds
// them into the portable @sponsorcoin/spcoin-panels AgentSelectDropDown —
// that wiring is ExchangeContext-bound and stays local, same opaque-slot
// split TokenAddressComponent.tsx already uses for its icon.

'use client';

import React, { useEffect, useRef } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible, usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import PanelGate from './PanelGate';
import { usePanelVisible as useMeritPanelVisible } from './usePanelVisible';
import { meritPanelState } from './panelState';

export interface AgentHeaderPanelProps {
  /** The selected agent's display name — shown as the title. Omit (or
   *  blank/whitespace-only) for titlePlaceholder, matching the real app's
   *  `agentAccount?.name?.trim() || AGENT_TITLE_PLACEHOLDER`. */
  agentName?: string;
  /** Shown as the title when agentName is absent. */
  titlePlaceholder?: string;
  /** Subtitle under the title. Matches the real app's own default
   *  (NEXT_PUBLIC_AGENT_SUB_TITLE's fallback). */
  subtitle?: string;
  /** The agent picker dropdown (and any wrapper around it). Rendered in
   *  the AGENT_SELECT_DROP_DOWN row below the title/subtitle. The web app
   *  passes its own hook-wiring AgentSelectDropDown wrapper here. */
  children?: React.ReactNode;
  /** Address to seed as the default agent on first load when none is
   *  selected yet — the web app's NEXT_PUBLIC_DEFAULT_AGENT_ADDRESS env var.
   *  Omit (or pass a non-address) to skip seeding. */
  defaultAgentAddress?: string;
  /** Resolve an agent account from a raw address — the web app's own
   *  hydrateAccountFromAddress, wrapped to return the subset this component
   *  cares about. Called once, only, on first load if agentName is absent
   *  and defaultAgentAddress is a valid address. */
  onHydrateAgent?: (address: string) => Promise<HydratedAgent | undefined>;
  /** Commit the hydrated default agent back into the app's account state. */
  onSetAgentAccount?: (account: HydratedAgent) => void;
  /** Optional debug trace sink — the web app passes its own
   *  appendDebugTrace so the package stays free of @/-aliased imports. */
  debugTrace?: (label: string, data?: Record<string, unknown>) => void;
}

/** Minimal subset of spCoinAccount this component reads after hydration. */
export interface HydratedAgent {
  address: string;
  name?: string;
  symbol?: string;
  logoURL?: string;
}

/** Cheap regex check — the package has no viem dependency for isAddress. */
function isValidEthAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

export default function AgentHeaderPanel({
  agentName,
  titlePlaceholder = 'Select Agent',
  subtitle = 'Your Sponsor Agent',
  children,
  defaultAgentAddress,
  onHydrateAgent,
  onSetAgentAccount,
  debugTrace,
}: AgentHeaderPanelProps) {
  const agentHeaderVisible = usePanelVisible(SP_COIN_DISPLAY.AGENT_HEADER_PANEL);
  const agentSelectVisible = usePanelVisible(SP_COIN_DISPLAY.AGENT_SELECT_DROP_DOWN);
  const walletAccountsVisible = usePanelVisible(SP_COIN_DISPLAY.LOCAL_ACCOUNT_WALLET_LIST);
  const { setPanelVisible } = usePanelTree();
  const menuTabVisible = useMeritPanelVisible(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR);

  const trimmedName = agentName?.trim() ?? '';
  const title = trimmedName.length > 0 ? trimmedName : titlePlaceholder;

  // Alt+A: step through AGENT_HEADER_PANEL → AGENT_SELECT_DROP_DOWN →
  // both off, from anywhere. Alt+M: toggle MENU_TAB_HEADER_BAR.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      const key = event.key.toLowerCase();

      if (key === 'a') {
        event.preventDefault();
        if (!agentHeaderVisible) {
          debugTrace?.('AgentHeaderPanel:altA:showHeader', { agentHeaderVisible, agentSelectVisible });
          setPanelVisible(SP_COIN_DISPLAY.AGENT_HEADER_PANEL, true, 'AgentHeaderPanel:altA:showHeader');
        } else if (!agentSelectVisible) {
          debugTrace?.('AgentHeaderPanel:altA:showSelect', { agentHeaderVisible, agentSelectVisible });
          setPanelVisible(SP_COIN_DISPLAY.AGENT_SELECT_DROP_DOWN, true, 'AgentHeaderPanel:altA:showSelect');
        } else {
          debugTrace?.('AgentHeaderPanel:altA:hideAll', { agentHeaderVisible, agentSelectVisible });
          setPanelVisible(SP_COIN_DISPLAY.AGENT_HEADER_PANEL, false, 'AgentHeaderPanel:altA:hideAll');
          setPanelVisible(SP_COIN_DISPLAY.AGENT_SELECT_DROP_DOWN, false, 'AgentHeaderPanel:altA:hideAll');
        }
        return;
      }

      if (key === 'm') {
        event.preventDefault();
        debugTrace?.('AgentHeaderPanel:altM:toggleMenuTab', { menuTabVisibleBefore: menuTabVisible });
        meritPanelState.setVisible(SP_COIN_DISPLAY.MENU_TAB_HEADER_BAR, !menuTabVisible);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [agentHeaderVisible, agentSelectVisible, menuTabVisible, setPanelVisible, debugTrace]);

  // Seed the agent from defaultAgentAddress once, on first load, only when
  // nothing's selected yet — never re-fires once it's run, so a user
  // explicitly clearing the agent later doesn't get it silently reinstated.
  // agentNameRef mirrors the live value into the async hydrate callback
  // below (a plain closure over agentName would see whatever it was AT
  // EFFECT-SETUP time, not whatever a real selection landed by the time
  // the fetch actually resolves).
  const agentNameRef = useRef(agentName);
  agentNameRef.current = agentName;
  const seededDefaultRef = useRef(false);
  useEffect(() => {
    if (seededDefaultRef.current) return;
    if (agentName) {
      seededDefaultRef.current = true;
      return;
    }
    if (!defaultAgentAddress || !isValidEthAddress(defaultAgentAddress)) {
      seededDefaultRef.current = true;
      return;
    }
    seededDefaultRef.current = true;
    void onHydrateAgent?.(defaultAgentAddress).then((hydrated) => {
      if (agentNameRef.current) return; // a real selection won the race
      if (hydrated) {
        debugTrace?.('AgentHeaderPanel:defaultAgent:seeded', {
          address: hydrated.address,
          name: hydrated.name,
        });
        onSetAgentAccount?.(hydrated);
      }
    });
  }, [agentName, defaultAgentAddress, onHydrateAgent, onSetAgentAccount, debugTrace]);

  useEffect(() => {
    debugTrace?.('AgentHeaderPanel:agentSelectVisible:changed', {
      agentSelectVisible,
      walletAccountsVisible,
      agentAddress: agentName ? undefined : null,
    });
  }, [agentSelectVisible, walletAccountsVisible, agentName, debugTrace]);

  return (
    <PanelGate panel={SP_COIN_DISPLAY.AGENT_HEADER_PANEL}>
      <div className="relative shrink-0 select-none pt-3 pb-[2px] text-center">
        <h2
          className="m-0 text-xl font-extrabold leading-tight tracking-wide text-[#5981F3] md:text-2xl"
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
        <p className="m-0 mt-0.5 text-sm font-semibold text-white/75">
          {subtitle}
        </p>
      </div>
      <div id="AGENT_SELECT_DROP_DOWN" className="flex items-center justify-center border-b border-slate-700/50 pb-[1.32px]">
        {/* collapseKey: this panel stays mounted-but-hidden while toggled
            off (Alt+A) — see AssetSelectDropDown's own doc comment. No
            onExpandedChange needed: this pill is centered alone in its own
            flex row, nothing to its left an expanded address could
            overlap. The web app's AgentSelectDropDown wrapper handles
            its own panelGateId/panelGate wiring. */}
        {children}
      </div>
    </PanelGate>
  );
}
