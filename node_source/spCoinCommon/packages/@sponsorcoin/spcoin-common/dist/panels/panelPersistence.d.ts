import { SP_COIN_DISPLAY } from './spCoinDisplay';
export interface PanelEntry {
    panel: SP_COIN_DISPLAY;
    visible: boolean;
    name?: string;
}
/**
 * Persisted node shapes that may be encountered (read-compat):
 * - canonical (stage 3): { id, visible, name }
 * - legacy:             { panel, visible, name }
 * - older experimental: { displayTypeId, visible, name }
 * - optional nesting:   { children: [...] }
 */
export interface PersistedPanelNode {
    id?: number;
    panel?: number;
    displayTypeId?: number;
    visible?: boolean;
    name?: string;
    children?: PersistedPanelNode[];
}
/** Stable name resolver. */
export declare function panelName(id: number): any;
/**
 * Single source-of-truth ID resolver (read-compat): accepts canonical +
 * legacy shapes ({ id } / { panel } / older { displayTypeId }).
 */
export declare function panelIdOf(v: unknown): number | null;
/**
 * Flattens a PERSISTED tree (arbitrary/legacy shapes) into a
 * de-duplicated flat list. Tree shape is not authoritative; visibility
 * is. First occurrence of a panel id wins (deterministic). Renamed from
 * `flattenPanelTree` in the parent app — see this file's own header
 * comment.
 */
export declare function flattenPersistedPanelTree(nodes: PersistedPanelNode[] | undefined, known: Set<number>): PanelEntry[];
/** Converts a flat list to a visibility map. Missing panels are implicitly false. */
export declare function toVisibilityMap(list: PanelEntry[]): Record<number, boolean>;
/** Ensures a panel exists in the flat list. Does NOT change visibility. */
export declare function ensurePanelPresent(list: PanelEntry[], panel: SP_COIN_DISPLAY): PanelEntry[];
/**
 * Writes the flat list back to persisted context form.
 *
 * - Persistence is a normalized flat list; no stack or tree reconstruction.
 * - Canonical write: { id, visible, name }; back-compat also writes { panel }.
 * - NEVER writes/keeps a legacy root `displayStack` — strips it if present
 *   on prevCtx so it can't be re-persisted (single source of truth is
 *   apiCoreSyncedMembers.displayStack in the parent app's ExchangeContext).
 */
export declare function writeFlatTree(prevCtx: any, next: PanelEntry[]): any;
