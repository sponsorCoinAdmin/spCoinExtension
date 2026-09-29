import { SP_COIN_DISPLAY, type PanelEntry } from '@sponsorcoin/spcoin-common/panels';
export declare function setPanelTreeGateCheck(fn: (() => boolean) | undefined): void;
export declare function getPanelTreeGateCheck(): (() => boolean) | undefined;
export type SetExchangeContextFn<TState = any> = (updater: (prev: TState) => TState, hookName?: string) => void;
export interface PanelTreeCallbacksDeps {
    known: Set<number>;
    overlays: SP_COIN_DISPLAY[];
    isGlobalOverlay: (p: SP_COIN_DISPLAY) => boolean;
    withName: (e: PanelEntry) => PanelEntry;
    diffAndPublish?: (prev: Record<number, boolean>, next: Record<number, boolean>, source?: string) => void;
    setExchangeContext: SetExchangeContextFn;
    /**
     * displayStack is real, independently-owned state now (2026-09-06,
     * extracted off ExchangeContext — see displayStackStore.tsx's own
     * header comment), not a field on the `prev` this file's own
     * setExchangeContext updaters receive. closePanel's radio-restore-on-pop
     * logic needs the current stack to decide what to restore; this
     * ref-based accessor replaces the old `prev.apiCoreSyncedMembers.displayStack`
     * read — same synchronous "current value right now" contract
     * usePanelTree.ts's own pushIfStackMember/removeIfStackMember/popTop
     * already relied on before this extraction.
     */
    getDisplayStackIds: () => SP_COIN_DISPLAY[];
    /**
     * Injection point #1 (2026-09-18 panel-tree migration) — replaces the
     * old hard `isWalletGateOpen` import. While the gate is closed, every
     * OTHER MAIN_RADIO_OVERLAY_PANELS open is redirected to PASSWORD_PANEL
     * instead. Omit for a consumer with no wallet-password-gate concept —
     * defaults to "always open" (no redirect).
     */
    isGateOpen?: () => boolean;
}
export declare function createPanelTreeCallbacks(deps: PanelTreeCallbacksDeps): {
    openPanel: (panel: SP_COIN_DISPLAY, invoker?: string, _parent?: SP_COIN_DISPLAY) => void;
    closePanel: (panel: SP_COIN_DISPLAY, invoker?: string, _unused?: unknown) => void;
};
