import type { SP_COIN_DISPLAY } from './spCoinDisplay';
/**
 * Panel node (may still have children for ephemeral/nested UI).
 * NOTE: For the persisted main panel list (apiCoreSyncedMembers.displayPanels),
 *       we keep a FLAT array. The `children` field is deprecated for
 *       persistence and should not be written.
 */
export interface PanelNode<M extends Record<string, unknown> = Record<string, unknown>> {
    panel: SP_COIN_DISPLAY;
    visible: boolean;
    name?: string;
    children?: PanelNode<M>[];
    meta?: M;
}
/**
 * The persisted main panel state is a FLAT array of PanelNode.
 */
export type SpCoinPanelTree<M extends Record<string, unknown> = Record<string, unknown>> = PanelNode<M>[];
/**
 * LEGACY shape: single root object with `.panel/.visible/.children`.
 * Still accepted on hydration; converted to the flat SpCoinPanelTree array.
 */
export interface LegacyMainPanelRoot<M extends Record<string, unknown> = Record<string, unknown>> {
    panel: SP_COIN_DISPLAY;
    visible: boolean;
    name?: string;
    children: PanelNode<M>[];
    meta?: M;
}
