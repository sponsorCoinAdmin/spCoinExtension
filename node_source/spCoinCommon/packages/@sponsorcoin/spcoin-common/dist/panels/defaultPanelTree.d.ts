import type { SpCoinPanelTree, PanelNode } from './panelNode';
import { SP_COIN_DISPLAY as SP } from './spCoinDisplay';
/** Panels that should NOT be persisted/seeded from the canonical tree. */
export declare const NON_PERSISTED_PANELS: Set<SP>;
export declare const MUST_INCLUDE_ON_BOOT: readonly (readonly [SP, boolean])[];
/** Canonical authored tree for the SponsorCoin UI. */
export declare const defaultSpCoinPanelTree: SpCoinPanelTree;
export interface FlatPanel {
    panel: SP;
    name: string;
    visible: boolean;
}
/** Single-pass flatten (iterative; no nested closures) */
export declare function flattenPanelTree(nodes: PanelNode[]): FlatPanel[];
export declare const DEFAULT_PANEL_ORDER: readonly SP[];
/** Seed persisted panel visibility from the canonical authored tree */
export declare function seedPanelsFromDefault(): FlatPanel[];
/** Flatten a single authored node (itself + descendants) — used for a
 * per-panel "reset just this radio panel's subtree" action. */
export declare function getDefaultPanelSubtree(panel: SP): FlatPanel[];
