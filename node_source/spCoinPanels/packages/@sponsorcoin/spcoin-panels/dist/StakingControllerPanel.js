// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/StakingControllerPanel.tsx
// Portable shell for the STAKING_CONTROLLER_PANEL (81) / SPONSOR_CONFIG_PANEL
// (82) recipient picker row + its cog-gated sponsor-config toggle, promoted
// out of the web app's components/views/TradingStationPanel/RecipientSelectPanel.tsx
// (295 ln). Non-portable pieces — next/image, next/link, every Tailwind
// className, AccountAvatar (same non-portable icon class as TokenLogo),
// useSponsorMode, useExchangeContext, resolveWallet, setOverlayCaller, the
// sessionStorage browser-tab dispatch, and the ToDo debug overlay — all stay
// in the web-app wrapper and are supplied here as opaque props/slots, same
// "opaque-slot split" shape as ConfigSlippagePanel / TokenAddressComponent /
// AffiliateFee this session. The package owns only what is genuinely portable:
// PanelGate-visibility reads, the container layout, the cog toggle wiring
// (openPanel/closePanel), and the mode-driven "You are Sponsoring" /
// "Revoking Sponsorship" label.
//
// 2026-09-23, on request ("migrate STAKING_CONTROLLER/SPONSOR_CONFIG"): the
// real component is large and web-coupled (295 ln, see
// docs/panelMigrationStatus.txt STAKING_CONTROLLER_PANEL row), but the only
// things that have to move to a portable shell are the layout/visibility/
// toggle — every data-dependent and web-only surface stays in the wrapper.
// This port is faithful: the web app keeps its AccountAvatar + next/Link +
// resolveWallet + sessionStorage tab-open behavior unchanged via the
// recipientContent / configCog slots. The package shell uses inline styles
// throughout (no Tailwind — the extension has no Tailwind pipeline),
// pixel-identical to the real web app's structure. Cosmetic only: the cog's
// hover-rotate animation is dropped (no inline-hover-rotate in the shared
// shell; click/toggle/keyboard behavior is preserved exactly).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PANEL_GAP } from '@sponsorcoin/spcoin-common/styles';
import { usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
const MODE_LABEL = {
    SPONSOR: 'You are Sponsoring',
    STAKE: 'You are Sponsoring',
    REVOKE: 'Revoking Sponsorship',
};
export default function StakingControllerPanel({ panelId = SP_COIN_DISPLAY.STAKING_CONTROLLER_PANEL, configPanelId = SP_COIN_DISPLAY.SPONSOR_CONFIG_PANEL, parentPanelId = SP_COIN_DISPLAY.SPONSORSHIP_PANEL, sponsorMode = 'SPONSOR', recipientContent, configCog, debugToDo, }) {
    const { openPanel, closePanel } = usePanelTree();
    const configVisible = usePanelVisible(configPanelId);
    const addVisible = usePanelVisible(panelId);
    // parentVisible powers the web wrapper's own overlay-caller registration
    // effect (setOverlayCaller); the shell itself only needs its own visibility.
    void parentPanelId;
    const toggleSponsorConfig = useCallback(() => {
        if (configVisible) {
            closePanel(configPanelId, 'StakingControllerPanel:toggleSponsorConfig(close)');
        }
        else {
            openPanel(configPanelId, 'StakingControllerPanel:toggleSponsorConfig(open)');
        }
    }, [configPanelId, configVisible, closePanel, openPanel]);
    if (!addVisible)
        return null;
    return (_jsxs("div", { id: SP_COIN_DISPLAY[panelId], style: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: PANEL_GAP,
            paddingTop: 8,
            paddingBottom: 8,
            borderRadius: 12,
            backgroundColor: 'transparent',
            color: '#94a3b8',
        }, children: [_jsx(TabBodyMarker, { path: "StakingControllerPanel.tsx", build: PACKAGE_BUILD }), configPanelId && configCog ? (_jsx("button", { type: "button", onClick: toggleSponsorConfig, onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSponsorConfig();
                    }
                }, "aria-label": "Sponsorship settings", style: {
                    position: 'absolute',
                    top: 9,
                    right: 3,
                    width: 15,
                    height: 15,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    objectFit: 'contain',
                }, children: configCog })) : null, _jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    paddingTop: 2,
                }, children: [_jsx("div", { style: { fontSize: 10, color: '#94a3b8' }, children: MODE_LABEL[sponsorMode ?? 'SPONSOR'] }), recipientContent] }), debugToDo] }));
}
