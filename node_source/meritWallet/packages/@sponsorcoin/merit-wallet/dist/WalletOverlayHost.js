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
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PanelGate, PanelTreePanel } from '@sponsorcoin/spcoin-panels';
import { MeritInfoPanelReal } from './panels';
import { useEnforceRadioPanelGroups, useEnforcePanelAncestorVisibility, useEnforceRadioPanelContainers, } from '@sponsorcoin/spcoin-exchange-engine';
import { RADIO_PANEL_GROUPS_WITH_FALLBACKS } from './radioPanelGroups';
const noHostEffects = () => undefined;
export default function WalletOverlayHost({ slots = {}, useHostEffects = noHostEffects }) {
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
    return (_jsxs(_Fragment, { children: [slots.sponsorPanel, slots.sendPanel, slots.processFlowPanel, slots.passwordPanel, slots.tradingStationPanel, slots.manageSponsorRecipients, _jsx(PanelGate, { panel: SP_COIN_DISPLAY.MANAGE_SPONSORSHIPS_PANEL, lazyLoad: false, className: "h-full min-h-0 flex flex-col overflow-hidden", children: slots.manageSponsorshipsPanel }), slots.sponsorStakingListPanel, _jsxs(PanelGate, { panel: SP_COIN_DISPLAY.ASSET_RADIO_PANELS, className: "contents", children: [_jsx(PanelGate, { panel: SP_COIN_DISPLAY.ACCOUNT_PANEL, className: "min-h-0 flex-1", children: slots.accountPanel }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.AGENT_PANEL, className: "min-h-0 flex-1", children: slots.agentPanel }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.SPONSOR_PANEL, className: "min-h-0 flex-1", children: slots.sponsorAccountPanel }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.RECIPIENT_PANEL, className: "min-h-0 flex-1", children: slots.recipientPanel }), slots.tokenPanel, _jsx(PanelGate, { panel: SP_COIN_DISPLAY.TOKEN_BUY_PANEL, className: "min-h-0 flex-1", children: slots.tokenBuyPanel }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.TOKEN_SELL_PANEL, className: "min-h-0 flex-1", children: slots.tokenSellPanel }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.TOKEN_BUY_SWAP_PANEL, className: "min-h-0 flex-1", children: slots.tokenBuySwapPanel }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.TOKEN_SELL_SWAP_PANEL, className: "min-h-0 flex-1", children: slots.tokenSellSwapPanel }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.TOKEN_SEND_PANEL, className: "min-h-0 flex-1", children: slots.tokenSendPanel }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.NETWORK_PANEL, className: "min-h-0 flex-1", children: slots.networkPanel })] }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.WALLET_CONFIG_PANEL, className: "min-h-0 flex-1", children: slots.walletConfig }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.MERIT_INFO_PANEL, className: "min-h-0 flex-1", children: slots.meritInfoPanel ?? _jsx(MeritInfoPanelReal, {}) }), _jsx(PanelGate, { panel: SP_COIN_DISPLAY.PANEL_TREE_PANEL, className: "min-h-0 flex-1", children: slots.panelTreePanel ?? _jsx(PanelTreePanel, {}) }), slots.activeListPanel, slots.messagePanel] }));
}
