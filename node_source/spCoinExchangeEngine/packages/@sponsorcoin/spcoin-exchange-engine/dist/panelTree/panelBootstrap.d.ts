import type { PanelNode } from '@sponsorcoin/spcoin-common/panels';
export interface PanelBootstrapProps {
    /** Optional override — a consumer with a different persisted-state
     *  location (e.g. chrome.storage.local, read asynchronously elsewhere
     *  and cached) can supply its own check. Defaults to the real
     *  window.localStorage check above. */
    hasPersistedBefore?: () => boolean;
}
/**
 * Post-mount bootstrap which ensures a MAIN_RADIO_OVERLAY_PANELS panel is selected.
 * If nothing is active, it opens TRADING_STATION_PANEL once on mount.
 */
export declare function PanelBootstrap({ hasPersistedBefore }?: PanelBootstrapProps): null;
/** Type guard for a “flat” panel list in settings.spCoinPanelTree. */
export declare const isMainPanels: (x: any) => x is PanelNode[];
/** Apply ensurePanelName to an entire in-memory tree. */
export declare const ensurePanelNamesInMemory: (panels: PanelNode[]) => PanelNode[];
/**
 * Start from authored defaults, merge persisted, enforce required and order.
 * This is the top-level “repair” used on boot.
 */
export declare function repairPanels(persisted: {
    panel: number;
    name?: string;
    visible?: boolean;
}[] | undefined): PanelNode[];
/** Drop non-persisted items (safety no-op if they’re already excluded). */
export declare function dropNonPersisted(panels: PanelNode[]): PanelNode[];
/** Ensure required panels exist; apply default visibility only when absent. */
export declare function ensureRequiredPanels(panels: PanelNode[], required: readonly (readonly [number, boolean])[]): PanelNode[];
/** Zero/one visible overlay; prefer TRADING_STATION_PANEL if multiple. */
export declare function reconcileOverlayVisibility(flat: PanelNode[]): PanelNode[];
