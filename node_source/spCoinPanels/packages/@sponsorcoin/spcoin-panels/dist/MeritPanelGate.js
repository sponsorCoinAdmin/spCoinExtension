// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritPanelGate.tsx
// (moved from node_source/spCoinPanels/engine/, 2026-09-10 — see index.ts's
// own comment for why)
//
// Merit's own independent panel-gating component — a near-direct copy of
// the app's existing components/utility/PanelGate.tsx (that pattern was
// already clean and proven; only the source it read from needed to
// change), bound to this engine's usePanelVisible instead of the app's.
//
// Built specifically because it was the real blocker for migrating any
// further Merit-exclusive panel: even a genuinely Merit-only panel ID
// still renders wrong if the component gating its visibility (PanelGate)
// reads the old engine while something else writes the new one — see
// docs/design/extensionPlan.md §7's "Real bug found and fixed" note for
// exactly this failure mode happening once already, on a component that
// didn't even use PanelGate.
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MeritPanelGate;
const jsx_runtime_1 = require("react/jsx-runtime");
const panels_1 = require("@sponsorcoin/spcoin-common/panels");
const usePanelVisible_1 = require("./usePanelVisible");
function MeritPanelGate({ panel, children, lazyLoad, mountAlways, className, }) {
    const resolvedLazy = typeof lazyLoad === 'boolean'
        ? lazyLoad
        : typeof mountAlways === 'boolean'
            ? !mountAlways
            : true; // default: lazy load
    const visible = (0, usePanelVisible_1.usePanelVisible)(panel);
    // Lazy path: don't even mount when hidden
    if (resolvedLazy && !visible)
        return null;
    // Non-lazy path: keep mounted; hide when not visible
    const wrapperClass = !resolvedLazy && !visible
        ? ['hidden', className].filter(Boolean).join(' ')
        : className !== null && className !== void 0 ? className : '';
    return ((0, jsx_runtime_1.jsx)("div", { "data-panel": panels_1.SP_COIN_DISPLAY[panel], "data-visible": visible ? 'true' : 'false', className: wrapperClass, children: children }));
}
