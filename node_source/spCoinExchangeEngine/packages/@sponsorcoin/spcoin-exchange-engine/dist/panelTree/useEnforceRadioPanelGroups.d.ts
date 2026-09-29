import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
interface RadioPanelGroup {
    name: string;
    members: readonly SP_COIN_DISPLAY[];
    /**
     * Panel to open when this group drops to ZERO visible members (2026-09-07,
     * on request — "in the WALLET_RADIO_PANELS at least 1 should be selected, if
     * none is selected, open TRADING_STATION"). Optional and per-group: only
     * MAIN_RADIO_OVERLAY_PANELS (the WALLET_RADIO_PANELS node in the debug tree)
     * gets one, wired in RadioOverlayPanelHost.tsx — the other five groups
     * here (ACCOUNT_PANEL_MODES, REWARDS_GROUP_MODES, ...) are documented in
     * panelGroups.ts as "exactly 0 or 1 visible", where 0 is a genuinely
     * valid, intentional state (no account-mode tab selected yet, etc.), not
     * a bug to self-heal. Left undefined there so this invariant only
     * applies where it's actually wanted.
     */
    fallbackPanel?: SP_COIN_DISPLAY;
}
export declare function useEnforceRadioPanelGroups(groups: readonly RadioPanelGroup[]): void;
export {};
