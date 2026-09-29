// File: spCoinCommon/src/panels/index.ts
//
// Public barrel for @sponsorcoin/spcoin-common/panels. See
// docs/design/spcoinPackagesDesign.md (parent app repo) for the full
// scope record.
//
// Naming collision note: the parent app has TWO different, unrelated
// functions both named `flattenPanelTree` living in different files
// (defaultPanelTree.ts operates on authored PanelNode[]; the persistence
// one operates on arbitrary persisted/legacy shapes) — never a runtime
// collision there since neither file imports the other's version. Both
// had to land in this one package, so the persistence one is exported
// here under its own distinct name, `flattenPersistedPanelTree` — see
// panelPersistence.ts's own header comment.

// Not a blind `export *` from both panelGroups.ts and panelRegistry.ts:
// both files export MAIN_RADIO_OVERLAY_PANELS/MANAGE_SCOPED/
// STACK_COMPONENTS/IS_MAIN_RADIO_OVERLAY_PANEL/IS_MANAGE_SCOPED/
// IS_STACK_COMPONENT under the SAME names — panelRegistry.ts
// deliberately re-exports panelGroups.ts's values (mirroring the parent
// app's own registry.ts, which re-exports constants/spCoinDisplay.ts's
// values the same way). Harmless there because nothing re-exports both
// via `export *` in one barrel; would be an ambiguous-export error here
// if both were star-exported together. Fix: only star-export
// panelGroups.ts's names that panelRegistry.ts does NOT already
// re-export; let panelRegistry.ts's own `export *` supply the rest.
export {
  ACCOUNT_PANEL_MODES,
  REWARDS_GROUP_MODES,
  STAKED_SP_COIN_PANEL_MODES,
  ACTIVE_LIST_PANEL_MODES,
  ADD_WALLET_ACCOUNT_MODES,
  RADIO_PANEL_GROUPS,
} from './panelGroups';
export * from './spCoinDisplay';
export * from './panelNode';
export * from './defaultPanelTree';
export * from './panelRegistry';
export {
  panelName,
  panelIdOf,
  flattenPersistedPanelTree,
  toVisibilityMap,
  ensurePanelPresent,
  writeFlatTree,
} from './panelPersistence';
export type { PanelEntry, PersistedPanelNode } from './panelPersistence';
