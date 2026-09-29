"use strict";
// File: spCoinCommon/src/panels/panelPersistence.ts
//
// Copied from lib/context/exchangeContext/panelTree/panelTreePersistence.ts
// in the parent app repo (2026-09-06, build plan step 3). Import path
// adjusted; content otherwise unchanged, EXCEPT this file's own
// `flattenPanelTree` is exported here as `flattenPersistedPanelTree` —
// see index.ts's own comment for why (a naming collision with
// defaultPanelTree.ts's unrelated `flattenPanelTree`, harmless in the
// parent app since the two files were never imported into the same
// barrel there).
//
// NOT copied from the same parent-app folder:
// lib/context/exchangeContext/panelTree/panelTreeUtils.ts. Despite the
// design doc originally describing it as a "pure helper" file alongside
// this one, it isn't — `diffAndPublish` there depends on `panelStore`,
// a live runtime singleton (not portable). Correction recorded in
// docs/design/spcoinPackagesDesign.md §2.2.
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.panelName = panelName;
exports.panelIdOf = panelIdOf;
exports.flattenPersistedPanelTree = flattenPersistedPanelTree;
exports.toVisibilityMap = toVisibilityMap;
exports.ensurePanelPresent = ensurePanelPresent;
exports.writeFlatTree = writeFlatTree;
// Regular (value) import, not `import type` — `panelName` below reads
// SP_COIN_DISPLAY as a runtime value (enums compile to real objects),
// same as the parent app's original file.
var spCoinDisplay_1 = require("./spCoinDisplay");
/** Stable name resolver. */
function panelName(id) {
    var _a;
    return (_a = spCoinDisplay_1.SP_COIN_DISPLAY === null || spCoinDisplay_1.SP_COIN_DISPLAY === void 0 ? void 0 : spCoinDisplay_1.SP_COIN_DISPLAY[id]) !== null && _a !== void 0 ? _a : String(id);
}
/**
 * Single source-of-truth ID resolver (read-compat): accepts canonical +
 * legacy shapes ({ id } / { panel } / older { displayTypeId }).
 */
function panelIdOf(v) {
    var _a, _b;
    var anyV = v;
    var raw = (_b = (_a = anyV === null || anyV === void 0 ? void 0 : anyV.id) !== null && _a !== void 0 ? _a : anyV === null || anyV === void 0 ? void 0 : anyV.panel) !== null && _b !== void 0 ? _b : anyV === null || anyV === void 0 ? void 0 : anyV.displayTypeId;
    var num = Number(raw);
    return Number.isFinite(num) ? num : null;
}
/**
 * Flattens a PERSISTED tree (arbitrary/legacy shapes) into a
 * de-duplicated flat list. Tree shape is not authoritative; visibility
 * is. First occurrence of a panel id wins (deterministic). Renamed from
 * `flattenPanelTree` in the parent app — see this file's own header
 * comment.
 */
function flattenPersistedPanelTree(nodes, known) {
    if (!Array.isArray(nodes))
        return [];
    var out = [];
    var walk = function (ns) {
        for (var _i = 0, ns_1 = ns; _i < ns_1.length; _i++) {
            var n = ns_1[_i];
            var id = panelIdOf(n);
            if (id == null)
                continue;
            if (!known.has(id))
                continue;
            var name_1 = typeof (n === null || n === void 0 ? void 0 : n.name) === 'string' && n.name.length > 0
                ? n.name
                : panelName(id);
            out.push({
                panel: id,
                visible: !!(n === null || n === void 0 ? void 0 : n.visible),
                name: name_1,
            });
            if (Array.isArray(n === null || n === void 0 ? void 0 : n.children) && n.children.length) {
                walk(n.children);
            }
        }
    };
    walk(nodes);
    var seen = new Set();
    return out.filter(function (e) {
        var k = Number(e.panel);
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
}
/** Converts a flat list to a visibility map. Missing panels are implicitly false. */
function toVisibilityMap(list) {
    var m = {};
    for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
        var e = list_1[_i];
        m[Number(e.panel)] = !!e.visible;
    }
    return m;
}
/** Ensures a panel exists in the flat list. Does NOT change visibility. */
function ensurePanelPresent(list, panel) {
    if (list.some(function (e) { return Number(e.panel) === Number(panel); }))
        return list;
    return __spreadArray(__spreadArray([], list, true), [
        {
            panel: panel,
            visible: false,
            name: panelName(panel),
        },
    ], false);
}
/**
 * Writes the flat list back to persisted context form.
 *
 * - Persistence is a normalized flat list; no stack or tree reconstruction.
 * - Canonical write: { id, visible, name }; back-compat also writes { panel }.
 * - NEVER writes/keeps a legacy root `displayStack` — strips it if present
 *   on prevCtx so it can't be re-persisted (single source of truth is
 *   apiCoreSyncedMembers.displayStack in the parent app's ExchangeContext).
 */
function writeFlatTree(prevCtx, next) {
    var _a;
    var normalized = next.map(function (e) {
        var _a;
        var id = Number(e.panel);
        return {
            id: id,
            panel: id,
            visible: !!e.visible,
            name: (_a = e.name) !== null && _a !== void 0 ? _a : panelName(id),
        };
    });
    var _b = prevCtx !== null && prevCtx !== void 0 ? prevCtx : {}, _legacyRootDisplayStack = _b.displayStack, rest = __rest(_b, ["displayStack"]);
    return __assign(__assign({}, rest), { apiCoreSyncedMembers: __assign(__assign({}, ((_a = rest === null || rest === void 0 ? void 0 : rest.apiCoreSyncedMembers) !== null && _a !== void 0 ? _a : {})), { displayPanels: normalized }) });
}
