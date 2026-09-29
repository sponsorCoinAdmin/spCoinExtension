// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/useEnforcePanelAncestorVisibility.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/hooks/useEnforcePanelAncestorVisibility.ts
// (panel-tree runtime migration). No coupling — content unchanged.
//
// Reactive replacement for the ancestor-reveal half of openPanel's old
// inline behavior (panelTreeCallbacks.ts's setVisibleWithAncestors,
// Rule 3 in docs/design/RulesOfPanelTreeDisplay.md — "openPanel ... walks
// up PARENT_OF and marks every ancestor panel visible"). Same shape and
// same file this pattern is proven in: useEnforceRadioPanelGroups.ts —
// watch panelStore, react to a content-stable key, write back through the
// bare setter, idempotent (only write what's actually changing) so this
// can't loop.
//
// Mounted alongside useEnforceRadioPanelGroups (RadioOverlayPanelHost.tsx
// in the web app) for this to actually run.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { panelStore } from './panelStore';
import { useSetPanelVisible } from './useSetPanelVisible';
import { SP_COIN_DISPLAY, PARENT_OF } from '@sponsorcoin/spcoin-common/panels';
// Only panels that actually have a parent ever need checking — a root
// panel has nothing to walk up to.
const PANELS_WITH_PARENT = Object.keys(PARENT_OF).map(Number);
const makeVisibleKey = () => PANELS_WITH_PARENT.filter((panel) => panelStore.getPanelSnapshot(panel))
    .map(Number)
    .join(',');
export function useEnforcePanelAncestorVisibility() {
    const setPanelVisible = useSetPanelVisible();
    const previousVisibleRef = useRef(new Set());
    const visibleKey = useSyncExternalStore((callback) => {
        const unsubscribers = PANELS_WITH_PARENT.map((panel) => panelStore.subscribePanel(panel, callback));
        return () => {
            for (const unsubscribe of unsubscribers)
                unsubscribe();
        };
    }, makeVisibleKey, () => '');
    useEffect(() => {
        const visibleNow = new Set(visibleKey
            ? visibleKey.split(',').map(Number).filter(Number.isFinite)
            : []);
        // Only panels that just BECAME visible can newly need an ancestor
        // revealed — a panel that was already visible already had its chance
        // to reveal its ancestors on the render it first appeared.
        const newlyVisible = [...visibleNow].filter((id) => !previousVisibleRef.current.has(id));
        previousVisibleRef.current = visibleNow;
        for (const id of newlyVisible) {
            let ancestor = PARENT_OF[id];
            while (ancestor != null) {
                if (!panelStore.getPanelSnapshot(ancestor)) {
                    setPanelVisible(ancestor, true, `useEnforcePanelAncestorVisibility:reveal:${SP_COIN_DISPLAY[ancestor]}`);
                }
                ancestor = PARENT_OF[ancestor];
            }
        }
    }, [visibleKey, setPanelVisible]);
}
