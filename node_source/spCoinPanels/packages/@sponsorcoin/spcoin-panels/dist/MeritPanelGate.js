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
//
// 2026-09-21, Path A — RESTORED after being briefly deleted the same day;
// see panelState.ts's own header comment for why it's not dead. This
// package's own `PanelGate.tsx` (Path A's new real replacement, bound to
// @sponsorcoin/spcoin-exchange-engine's own usePanelVisible) is used by
// this package's own components now — this file stays only for the web
// app's own remaining real consumer,
// components/views/Headers/WalletNetworkPanel.tsx, which gates
// WALLET_NETWORK_HEADER through this engine by deliberate 2026-09-14
// design, not something this session's Path A work is in scope to
// unwind.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelVisible } from './usePanelVisible';
export default function MeritPanelGate({ panel, children, lazyLoad, mountAlways, className, }) {
    const resolvedLazy = typeof lazyLoad === 'boolean'
        ? lazyLoad
        : typeof mountAlways === 'boolean'
            ? !mountAlways
            : true; // default: lazy load
    const visible = usePanelVisible(panel);
    // Lazy path: don't even mount when hidden
    if (resolvedLazy && !visible)
        return null;
    // Non-lazy path: keep mounted; hide when not visible
    const wrapperClass = !resolvedLazy && !visible
        ? ['hidden', className].filter(Boolean).join(' ')
        : className ?? '';
    // A real SP_COIN_DISPLAY member (number) reverse-looks-up its name via
    // the enum object; a Merit-only id is already its own plain string
    // label, no lookup needed or possible (SP_COIN_DISPLAY has no entry for
    // it).
    const panelLabel = typeof panel === 'number' ? SP_COIN_DISPLAY[panel] : panel;
    return (_jsx("div", { "data-panel": panelLabel, "data-visible": visible ? 'true' : 'false', className: wrapperClass, children: children }));
}
