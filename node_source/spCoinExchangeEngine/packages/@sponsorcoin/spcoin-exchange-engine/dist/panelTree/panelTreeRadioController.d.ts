import { SP_COIN_DISPLAY, type PanelEntry } from '@sponsorcoin/spcoin-common/panels';
export interface RadioGroup {
    /** Optional label for debugging (e.g., "MAIN_RADIO_OVERLAY_PANELS", "MANAGE_SCOPED") */
    name?: string;
    /** The members that behave as a radio group */
    members: readonly SP_COIN_DISPLAY[];
}
/**
 * Apply radio selection for an arbitrary group:
 * - target is set visible=true
 * - all other group members are set visible=false
 * - any missing members are ensured present
 */
export declare function applyRadioSelection(flatIn: PanelEntry[], groupMembers: readonly SP_COIN_DISPLAY[], target: SP_COIN_DISPLAY, withName: (e: PanelEntry) => PanelEntry): PanelEntry[];
export interface RestorePrevRadioMemberResult {
    nextFlat: PanelEntry[];
    restored: SP_COIN_DISPLAY | null;
    matchedGroup?: string;
}
interface RestoreTrace {
    traceId?: string;
}
/**
 * restorePrevRadioMember
 *
 * Policy:
 * - First, hide `closing`.
 * - Then, find the *first* radio group (by priority order) that contains `closing`.
 * - Traverse the `displayStack` backwards (from the position of `closing` if present,
 *   otherwise from the top) to find a previous member of that SAME radio group.
 * - If found, make it visible AND enforce the radio invariant (close the other members).
 * - If not found, stop (no selection restored here).
 *
 * Notes:
 * - Restores at most ONE group (the highest-priority matching group).
 * - Higher-level close logic can still enforce global defaults (e.g. ensure one overlay visible).
 *
 * Debugging:
 * - If opts.traceId is supplied, it will be printed so you can correlate multi-step closes.
 *
 * ✅ Required fix:
 * - `displayStack` may arrive as DISPLAY_STACK_NODE[] (new strict persisted shape) or legacy ids.
 * - We normalize here so restore logic is stable.
 */
export declare function restorePrevRadioMember(opts: {
    flatIn: PanelEntry[];
    displayStack: unknown;
    closing: SP_COIN_DISPLAY;
    radioGroupsPriority: readonly RadioGroup[];
    withName: (e: PanelEntry) => PanelEntry;
    trace?: RestoreTrace;
}): RestorePrevRadioMemberResult;
/**
 * Enforces a "global overlay radio" selection:
 * - exactly one overlay in `overlays` is visible (the `target`)
 * - other overlays are set to visible=false
 */
export declare function applyGlobalRadio(accIn: PanelEntry[], overlays: SP_COIN_DISPLAY[], target: SP_COIN_DISPLAY, withName: (e: PanelEntry) => PanelEntry): PanelEntry[];
export declare function clearGlobalRadio(flat0: PanelEntry[], overlays: SP_COIN_DISPLAY[], withName: (e: PanelEntry) => PanelEntry): PanelEntry[];
/**
 * ensure exactly one overlay is visible.
 * - If any overlay is already visible, do nothing.
 * - Otherwise ensure defaultOverlay is present and selected.
 */
export declare function ensureOneGlobalOverlayVisible(flatIn: PanelEntry[], overlays: SP_COIN_DISPLAY[], defaultOverlay: SP_COIN_DISPLAY, withName: (e: PanelEntry) => PanelEntry): PanelEntry[];
export declare function switchToDefaultGlobal(flatIn: PanelEntry[], overlays: SP_COIN_DISPLAY[], defaultOverlay: SP_COIN_DISPLAY, withName: (e: PanelEntry) => PanelEntry): PanelEntry[];
export {};
