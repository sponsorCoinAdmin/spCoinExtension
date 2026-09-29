// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/useSetPanelVisible.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/hooks/useSetPanelVisible.ts (panel-tree
// runtime migration). `useExchangeContext` is now an in-package sibling
// import (moved here in the earlier "stage 7b" hooks batch) rather than
// a cross-package one; persistence helpers now come from
// @sponsorcoin/spcoin-common/panels (flattenPanelTree renamed to
// flattenPersistedPanelTree there — see panelPersistence.ts's own header
// comment). Behavior otherwise unchanged.
//
// The bare panel-visibility write chokepoint, extracted standalone
// (2026-09-10 — see docs/design/RulesOfPanelTreeDisplay.md /
// extensionPlan.md's panel-tree discussion) from usePanelTree.ts's own
// setPanelVisible, which used to be reachable only by calling the full
// usePanelTree() hook — pulling in openPanel/closePanel's stack/radio/
// ACCOUNT_PANEL_MODES/PROCESS_FLOW machinery, the hydration-repair effect,
// and the republish-to-panelStore effect, none of which a caller that only
// wants "flip this one enum" (e.g. TokenLogo's click handler) has any use
// for. This hook's ONLY job is that one write — no stack, no radio
// exclusivity, no ancestor-walk, no other business rule. Those stay
// exactly where they are for now (usePanelTree's openPanel/closePanel,
// useEnforceRadioPanelGroups, etc.) — extracting them into their own
// independent reactive rules is separate, later work, not done here.
//
// usePanelTree() itself now delegates to this hook internally for its own
// setPanelVisible/setVisible, so every one of its existing importers
// sees byte-identical behavior — this is purely additive, not a rewrite.
import { useCallback } from 'react';
import { useExchangeContext } from '../hooks/useExchangeContext';
import { PANEL_DEFS, flattenPersistedPanelTree, panelName, writeFlatTree } from '@sponsorcoin/spcoin-common/panels';
// Exported (2026-09-11, cleanup pass) so usePanelTree.ts can import this
// instead of independently recomputing the identical Set from the same
// PANEL_DEFS source — was a real, if cheap, duplication between the two
// files.
export const KNOWN = new Set(PANEL_DEFS.map((d) => d.id));
export function useSetPanelVisible() {
    const { exchangeContext, setExchangeContext } = useExchangeContext();
    const setExchangeContextSafe = useCallback((nextOrUpdater, hookName) => {
        try {
            setExchangeContext(nextOrUpdater, hookName);
        }
        catch {
            if (typeof nextOrUpdater === 'function') {
                setExchangeContext(nextOrUpdater(exchangeContext), hookName);
            }
            else {
                setExchangeContext(nextOrUpdater, hookName);
            }
        }
    }, [setExchangeContext, exchangeContext]);
    const setPanelVisible = useCallback((panel, visible, hookName = 'useSetPanelVisible:setPanelVisible') => {
        setExchangeContextSafe((prev) => {
            const flat0 = flattenPersistedPanelTree(prev?.apiCoreSyncedMembers?.displayPanels, KNOWN);
            let found = false;
            let changed = false;
            const next = flat0.map((entry) => {
                if (Number(entry.panel) !== Number(panel))
                    return entry;
                found = true;
                if (!!entry.visible === !!visible)
                    return entry;
                changed = true;
                return { ...entry, visible: !!visible };
            });
            if (!found) {
                changed = true;
                next.push({
                    panel,
                    name: panelName(panel),
                    visible: !!visible,
                });
            }
            if (!changed)
                return prev;
            return writeFlatTree(prev, next);
        }, hookName);
    }, [setExchangeContextSafe]);
    return setPanelVisible;
}
