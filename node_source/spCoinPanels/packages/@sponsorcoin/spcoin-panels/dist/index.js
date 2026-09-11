"use strict";
// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/index.ts
//
// Moved here from node_source/spCoinPanels/engine/ (2026-09-10, same day)
// to match the sibling packages' layout (spCoinCommon/spCoinLib/
// spCoinAccess all use <root>/packages/@sponsorcoin/<name>/src) — required
// by app/api/spCoin/access-manager/route.ts's getPackageWorkspaceRoot(),
// which hardcodes that shape, so this package could be wired into the
// SpCoinAccessController "NPM Deployment" upload/download/install panel
// like the other three. No behavior change, only location + how the app
// imports it (bare `@sponsorcoin/spcoin-panels` specifier now, via a
// `file:` dependency, instead of the `@/node_source/spCoinPanels/engine`
// path alias).
//
// Merit's own independent panel-state engine — public surface. Deliberately
// small (2026-09-10, on request: "keep it simple for now, we will add
// more intricate options once we get this in a working state"). See
// docs/design/extensionPlan.md §7 for the full design/reasoning.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meritPanelState = exports.isPanelVisible = exports.setPanelVisible = exports.MeritTitleComponent = exports.WalletHeader = exports.ASSET_SELECT_DISPLAY = exports.AssetSelectDropDown = exports.MeritPanelGate = exports.usePanelVisible = void 0;
var usePanelVisible_1 = require("./usePanelVisible");
Object.defineProperty(exports, "usePanelVisible", { enumerable: true, get: function () { return usePanelVisible_1.usePanelVisible; } });
var MeritPanelGate_1 = require("./MeritPanelGate");
Object.defineProperty(exports, "MeritPanelGate", { enumerable: true, get: function () { return __importDefault(MeritPanelGate_1).default; } });
// 2026-09-11 — first UI component in the package (previously engine-only,
// per this file's own "keep it simple" header note above). Portability
// pass done first (see AssetSelectDropDown.tsx's own inlined-truncateMiddle
// comment): no @/-aliased imports left, PanelGate is an injected prop
// rather than a hardcoded one, so this has no dependency on any one app's
// ExchangeContext/panel-tree — see extensionPlan.md's panel-tree discussion
// for the full reasoning.
var AssetSelectDropDown_1 = require("./AssetSelectDropDown");
Object.defineProperty(exports, "AssetSelectDropDown", { enumerable: true, get: function () { return __importDefault(AssetSelectDropDown_1).default; } });
Object.defineProperty(exports, "ASSET_SELECT_DISPLAY", { enumerable: true, get: function () { return AssetSelectDropDown_1.ASSET_SELECT_DISPLAY; } });
// 2026-09-11 — second UI component ("Pages Grey header bar" slice, see
// docs/design/extensionPlan.md). Same portability pass as above: next/image
// swapped for <img>, the hardcoded MERIT_INFO_PANEL click handler replaced
// with an optional onTitleClick prop.
var WalletHeader_1 = require("./WalletHeader");
Object.defineProperty(exports, "WalletHeader", { enumerable: true, get: function () { return __importDefault(WalletHeader_1).default; } });
var MeritTitleComponent_1 = require("./MeritTitleComponent");
Object.defineProperty(exports, "MeritTitleComponent", { enumerable: true, get: function () { return __importDefault(MeritTitleComponent_1).default; } });
// The single write chokepoint. A direct export, not a hook — meritPanelState
// .setVisible is already a stable, non-reactive class-field reference, so a
// hook wrapper would add nothing. Named `setPanelVisible` here to match the
// app's own existing naming (usePanelTree's setPanelVisible) for anyone
// porting call sites over.
const panelState_1 = require("./panelState");
exports.setPanelVisible = panelState_1.meritPanelState.setVisible;
exports.isPanelVisible = panelState_1.meritPanelState.isVisible;
// Exported for advanced/debug use (e.g. a future debug-tree equivalent) —
// not part of the normal read/write surface above.
var panelState_2 = require("./panelState");
Object.defineProperty(exports, "meritPanelState", { enumerable: true, get: function () { return panelState_2.meritPanelState; } });
