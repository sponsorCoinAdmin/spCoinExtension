import { SP_COIN_DISPLAY as SP } from './spCoinDisplay';
import { IS_MAIN_RADIO_OVERLAY_PANEL, IS_MANAGE_SCOPED, IS_STACK_COMPONENT } from './panelGroups';
export type PanelKind = 'root' | 'panel' | 'button' | 'list' | 'control' | 'flag';
export type PanelDef = Readonly<{
    id: SP;
    kind: PanelKind;
    /** If true: participates in the GLOBAL overlay radio group (sourced from panelGroups.ts). */
    overlay?: boolean;
    /** Cold-start visibility (persisted state may override) */
    defaultVisible?: boolean;
    /** Structural children (tree shape only) */
    children?: readonly SP[];
}>;
export declare const PANEL_DEFS: readonly PanelDef[];
export declare const MAIN_RADIO_OVERLAY_PANELS: readonly SP[];
export declare const MANAGE_SCOPED: readonly SP[];
export declare const STACK_COMPONENTS: readonly SP[];
export { IS_MAIN_RADIO_OVERLAY_PANEL, IS_MANAGE_SCOPED, IS_STACK_COMPONENT };
export declare const NON_INDEXED_PANELS: Set<SP>;
export declare const ROOTS: readonly SP[];
/** Fast id → definition lookup */
export declare const PANEL_BY_ID: ReadonlyMap<SP, PanelDef>;
/** parent → children (from defs that declare children) */
export declare const CHILDREN: Partial<Record<SP, readonly SP[]>>;
/** child → parent (inverse of CHILDREN) */
export declare const PARENT_OF: Partial<Record<SP, SP>>;
/** id → kind */
export declare const KINDS: Partial<Record<SP, PanelKind>>;
export { defaultSpCoinPanelTree } from './defaultPanelTree';
