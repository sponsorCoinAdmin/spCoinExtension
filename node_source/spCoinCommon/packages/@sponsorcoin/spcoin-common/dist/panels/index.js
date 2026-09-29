"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFlatTree = exports.ensurePanelPresent = exports.toVisibilityMap = exports.flattenPersistedPanelTree = exports.panelIdOf = exports.panelName = exports.RADIO_PANEL_GROUPS = exports.ADD_WALLET_ACCOUNT_MODES = exports.ACTIVE_LIST_PANEL_MODES = exports.STAKED_SP_COIN_PANEL_MODES = exports.REWARDS_GROUP_MODES = exports.ACCOUNT_PANEL_MODES = void 0;
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
var panelGroups_1 = require("./panelGroups");
Object.defineProperty(exports, "ACCOUNT_PANEL_MODES", { enumerable: true, get: function () { return panelGroups_1.ACCOUNT_PANEL_MODES; } });
Object.defineProperty(exports, "REWARDS_GROUP_MODES", { enumerable: true, get: function () { return panelGroups_1.REWARDS_GROUP_MODES; } });
Object.defineProperty(exports, "STAKED_SP_COIN_PANEL_MODES", { enumerable: true, get: function () { return panelGroups_1.STAKED_SP_COIN_PANEL_MODES; } });
Object.defineProperty(exports, "ACTIVE_LIST_PANEL_MODES", { enumerable: true, get: function () { return panelGroups_1.ACTIVE_LIST_PANEL_MODES; } });
Object.defineProperty(exports, "ADD_WALLET_ACCOUNT_MODES", { enumerable: true, get: function () { return panelGroups_1.ADD_WALLET_ACCOUNT_MODES; } });
Object.defineProperty(exports, "RADIO_PANEL_GROUPS", { enumerable: true, get: function () { return panelGroups_1.RADIO_PANEL_GROUPS; } });
__exportStar(require("./spCoinDisplay"), exports);
__exportStar(require("./panelNode"), exports);
__exportStar(require("./defaultPanelTree"), exports);
__exportStar(require("./panelRegistry"), exports);
var panelPersistence_1 = require("./panelPersistence");
Object.defineProperty(exports, "panelName", { enumerable: true, get: function () { return panelPersistence_1.panelName; } });
Object.defineProperty(exports, "panelIdOf", { enumerable: true, get: function () { return panelPersistence_1.panelIdOf; } });
Object.defineProperty(exports, "flattenPersistedPanelTree", { enumerable: true, get: function () { return panelPersistence_1.flattenPersistedPanelTree; } });
Object.defineProperty(exports, "toVisibilityMap", { enumerable: true, get: function () { return panelPersistence_1.toVisibilityMap; } });
Object.defineProperty(exports, "ensurePanelPresent", { enumerable: true, get: function () { return panelPersistence_1.ensurePanelPresent; } });
Object.defineProperty(exports, "writeFlatTree", { enumerable: true, get: function () { return panelPersistence_1.writeFlatTree; } });
