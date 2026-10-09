// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/WalletOverlayHost.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt row 7, S2b-4a) -- the wallet's overlay body, written once. This is the web app's
// components/views/RadioOverlayPanelHost.tsx moved into the package: the radio-group enforcement hooks and the PanelGate layout of every
// main overlay, the ASSET_RADIO_PANELS container, the Config / Info / Panel Tree overlays and the list and message overlays. The JSX and
// every comment below are the web app's, unchanged; the only difference is that each panel the web app imported directly is now a SLOT.
// The web app passes all of its panels as slots, so nothing changes for it. A host that has no equivalent panel yet leaves the slot empty
// (a slot left out renders nothing); MeritInfoPanel and PanelTreePanel already come from spcoin-panels and default to those.
//
// Why a slot and not an import: most of these panels are web-app components (some thin adapters over package code, a few still heavy:
// AccountManagementPanel, SponsorPanel, ProcessFlowPanel, SponsorStakingListPanel, TokenPanel). Each moves into the package on its own
// schedule (design doc, table row 7c), and the host contract (row 9) lists exactly these slots.
//
// useHostEffects: a hook the host wants called LAST, after the three enforcement hooks (the web app passes useTradeTokenTabSync, whose
// effect must run after them). It is a hook prop and must be a stable module-level function, not an inline one.
'use client';

import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PanelGate, PanelTreePanel } from '@sponsorcoin/spcoin-panels';
import { MeritInfoPanelReal } from './panels';
import {
  useEnforceRadioPanelGroups,
  useEnforcePanelAncestorVisibility,
  useEnforceRadioPanelContainers,
} from '@sponsorcoin/spcoin-exchange-engine';
import { RADIO_PANEL_GROUPS_WITH_FALLBACKS } from './radioPanelGroups';

export interface WalletOverlaySlots {
  sponsorPanel?: React.ReactNode;
  sendPanel?: React.ReactNode;
  processFlowPanel?: React.ReactNode;
  passwordPanel?: React.ReactNode;
  tradingStationPanel?: React.ReactNode;
  manageSponsorRecipients?: React.ReactNode;
  manageSponsorshipsPanel?: React.ReactNode;
  sponsorStakingListPanel?: React.ReactNode;
  accountPanel?: React.ReactNode;
  agentPanel?: React.ReactNode;
  sponsorAccountPanel?: React.ReactNode;
  recipientPanel?: React.ReactNode;
  tokenPanel?: React.ReactNode;
  tokenBuyPanel?: React.ReactNode;
  tokenSellPanel?: React.ReactNode;
  tokenBuySwapPanel?: React.ReactNode;
  tokenSellSwapPanel?: React.ReactNode;
  tokenSendPanel?: React.ReactNode;
  networkPanel?: React.ReactNode;
  walletConfig?: React.ReactNode;
  activeListPanel?: React.ReactNode;
  messagePanel?: React.ReactNode;
  meritInfoPanel?: React.ReactNode;
  panelTreePanel?: React.ReactNode;
}

export interface WalletOverlayHostProps {
  slots?: WalletOverlaySlots;
  /** Hook called last, after the enforcement hooks. Must be a stable function (see the file comment). */
  useHostEffects?: () => void;
}

const noHostEffects = () => undefined;

export default function WalletOverlayHost({ slots = {}, useHostEffects = noHostEffects }: WalletOverlayHostProps) {
  useEnforceRadioPanelGroups(RADIO_PANEL_GROUPS_WITH_FALLBACKS);
  // 2026-09-10 — reactive backstop for openPanel's own inline ancestor-walk
  // (setVisibleWithAncestors, panelTreeCallbacks.ts). Idempotent, same
  // no-op-on-the-atomic-path reasoning as useEnforceRadioPanelGroups above:
  // real work only happens for a write that bypasses openPanel entirely
  // (e.g. the bare useSetPanelVisible), which today's code has no ancestor
  // guarantee for at all. See useEnforcePanelAncestorVisibility.ts's own
  // header comment / extensionPlan.md's panel-tree discussion for the
  // full reasoning.
  useEnforcePanelAncestorVisibility();
  // 2026-10-03 — MUST stay after useEnforcePanelAncestorVisibility. React runs
  // effects in hook order within a commit, so reveal gets to open the container
  // first and this pass then sees it open and stands down. Called before it,
  // a bare setPanelVisible(ACCOUNT_PANEL, true) — a (3)-class write with no
  // ancestor walk of its own — would be closed again by containment in the
  // same flush that revealed its container, so the panel would silently never
  // open at all.
  useEnforceRadioPanelContainers(RADIO_PANEL_GROUPS_WITH_FALLBACKS);
  // eslint-disable-next-line react-hooks/rules-of-hooks -- a stable module-level hook passed by the host, called unconditionally
  useHostEffects();

  return (
    <>
      {/* ───────────────────────── Main overlays (radio group) ───────────────────────── */}
      {slots.sponsorPanel}
      {slots.sendPanel}
      {slots.processFlowPanel}
      {slots.passwordPanel}
      {slots.tradingStationPanel}
      {slots.manageSponsorRecipients}

      {/* lazyLoad={false}: ManageSponsorshipsPanel already gates its own render
          and resets its fetched state internally via usePanelVisible(isActive),
          so lazy-unmounting here too just forces its AssetSelectProvider/
          AddressSelect subtree to fully remount (and refetch) on every toggle. */}
      <PanelGate
        panel={SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL}
        lazyLoad={false}
        className="h-full min-h-0 flex flex-col overflow-hidden"
      >
        {slots.manageSponsorshipsPanel}
      </PanelGate>

      {slots.sponsorStakingListPanel}

{/* ───────────────────── ASSET_RADIO_PANELS container ───────────────────── */}
      {/* 2026-10-03 — ASSET_RADIO_PANELS (136) is a real CONTAINER, and this
          gate is what makes it one.

          136 joined MAIN_RADIO_OVERLAY_PANELS today (it was a pure structural
          node — "no own UI", status [N/A] in docs/panelMigrationStatus.txt —
          until then) and the twelve panels below are its detail group. It is
          the group's overlay ANCHOR rather than a thirteenth member of it:
          opening any panel below resolves its overlay ancestor to 136 through
          openPanel's PARENT_OF walk (panelTreeCallbacks.ts:240-250), so 136 is
          what wins the global radio on the child's behalf and closes every
          other overlay. The twelve are mutually exclusive with each other via
          their own ASSET_RADIO_PANELS radio group (panelGroups.ts).

          The wrapper is here on purpose, and it was REMOVED from here earlier
          the same day before being restored. It was removed on a read of Rule
          0 / Flow Rule B in docs/design/RulesOfPanelTreeDisplay.md ("no
          panel's visibility is derived, inferred, or computed from any other
          panel's state") — a fair reading of the rule as written. It is
          restored because containment is the intended behaviour here, not a
          side effect: closing 136 is supposed to take its contents with it.
          The rule's own scope is visibility DERIVATION for a panel's GUI, and
          136's children are not reading 136 to decide whether to render
          themselves — they each gate on their own flag, and the container
          decides what is CONTAINED rather than what is visible. Flag hygiene
          is handled separately and explicitly, by
          useEnforceRadioPanelContainers, which force-closes the twelve while
          136 is shut so reopening it returns an empty container.

          className="contents" so this wrapper does not become a layout box:
          each child below still resolves its min-h-0/flex-1 against the flex
          column in WalletRadioPanels.tsx, exactly as it did before the wrapper
          existed. The wrapper's job is mount/unmount control, not layout.

          lazyLoad is left at its default (true): the children unmount when the
          container closes, which is what "contained" means for the DOM. The
          twelve are cheap, and their own panels do their own internal reset on
          becoming visible. */}
      <PanelGate panel={SP_COIN_DISPLAY.ASSET_RADIO_PANELS} className="contents">
      <PanelGate panel={SP_COIN_DISPLAY.ACCOUNT_PANEL} className="min-h-0 flex-1">
        {slots.accountPanel}
      </PanelGate>

      <PanelGate panel={SP_COIN_DISPLAY.AGENT_PANEL} className="min-h-0 flex-1">
        {slots.agentPanel}
      </PanelGate>

      <PanelGate panel={SP_COIN_DISPLAY.SPONSOR_PANEL} className="min-h-0 flex-1">
        {slots.sponsorAccountPanel}
      </PanelGate>

      <PanelGate panel={SP_COIN_DISPLAY.RECIPIENT_PANEL} className="min-h-0 flex-1">
        {slots.recipientPanel}
      </PanelGate>

      {/* Token Contract detail overlay (self-gated; must always be mounted) */}
      {slots.tokenPanel}

      <PanelGate panel={SP_COIN_DISPLAY.TOKEN_BUY_PANEL} className="min-h-0 flex-1">
        {slots.tokenBuyPanel}
      </PanelGate>

      <PanelGate panel={SP_COIN_DISPLAY.TOKEN_SELL_PANEL} className="min-h-0 flex-1">
        {slots.tokenSellPanel}
      </PanelGate>

      <PanelGate panel={SP_COIN_DISPLAY.TOKEN_BUY_SWAP_PANEL} className="min-h-0 flex-1">
        {slots.tokenBuySwapPanel}
      </PanelGate>

      <PanelGate panel={SP_COIN_DISPLAY.TOKEN_SELL_SWAP_PANEL} className="min-h-0 flex-1">
        {slots.tokenSellSwapPanel}
      </PanelGate>

      <PanelGate panel={SP_COIN_DISPLAY.TOKEN_SEND_PANEL} className="min-h-0 flex-1">
        {slots.tokenSendPanel}
      </PanelGate>

        <PanelGate panel={SP_COIN_DISPLAY.NETWORK_PANEL} className="min-h-0 flex-1">
        {slots.networkPanel}
      </PanelGate>
      </PanelGate>

      {/* WALLET_CONFIG_PANEL and MERIT_INFO_PANEL sit OUTSIDE the
          ASSET_RADIO_PANELS container, on request: they are children of
          WALLET_RADIO_PANELS, not of ASSET_RADIO_PANELS, so the container does
          not contain them. Each gates its own flag. They were briefly inside
          the wrapper earlier the same day; see panelGroups.ts's
          ASSET_RADIO_PANELS_CHILDREN for the round trip. */}
      <PanelGate panel={SP_COIN_DISPLAY.WALLET_CONFIG_PANEL} className="min-h-0 flex-1">
        {slots.walletConfig}
      </PanelGate>

      <PanelGate panel={SP_COIN_DISPLAY.MERIT_INFO_PANEL} className="min-h-0 flex-1">
        {slots.meritInfoPanel ?? <MeritInfoPanelReal />}
      </PanelGate>

      {/* 2026-10-05, on request — the wallet's panel tree view, opened from the Config tab. */}
      <PanelGate panel={SP_COIN_DISPLAY.PANEL_TREE_PANEL} className="min-h-0 flex-1">
        {slots.panelTreePanel ?? <PanelTreePanel />}
      </PanelGate>

      {/* ───────────────────────── Select / aux overlays ───────────────────────── */}
      {/* walletChrome: this is the real docked Merit Wallet's own render (as
          opposed to a page-local FloatingSelectPopup like TokenListOverlay
          wrapping the same ActiveListPanel elsewhere) — see
          AssetSelectProvider's own doc comment for what this changes. */}
      {slots.activeListPanel}

      {slots.messagePanel}
    </>
  );
}
