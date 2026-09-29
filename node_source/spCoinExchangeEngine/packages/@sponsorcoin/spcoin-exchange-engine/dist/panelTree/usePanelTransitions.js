// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/usePanelTransitions.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/hooks/usePanelTransitions.ts (panel-tree
// migration follow-up, "stage 9d" — found while checking useSelectionCommit's
// dependencies for stage 9c; useSelectionCommit itself stays blocked on
// accountHydration.ts, but this sibling hook it calls turned out to have
// zero coupling of its own). No coupling — content unchanged,
// usePerfMarks now an in-package sibling.
'use client';
import { useCallback } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { usePanelTree } from './usePanelTree';
import { usePerfMarks } from './usePerfMarks';
export function usePanelTransitions() {
    const { openPanel, closePanel } = usePanelTree();
    const perf = usePerfMarks('panelTransition');
    const toClickHandler = (act, base) => {
        const { preventDefault = true, stopPropagation = true, defer = true, methodName, } = base ?? {};
        return (e) => {
            if (preventDefault)
                e.preventDefault();
            if (stopPropagation)
                e.stopPropagation();
            const runner = () => act({ methodName });
            if (defer) {
                if (typeof queueMicrotask === 'function')
                    queueMicrotask(runner);
                else
                    void Promise.resolve().then(runner);
            }
            else {
                runner();
            }
        };
    };
    /** OPEN (stack-aware) */
    const openOverlay = useCallback((panel, opts) => {
        const name = SP_COIN_DISPLAY[panel];
        const methodName = opts?.methodName ? `(${opts.methodName})` : '';
        perf.start();
        openPanel(panel, `usePanelTransitions:openOverlay${methodName}(${name})`);
        perf.end(`openOverlay:${panel}`);
    }, [openPanel, perf]);
    /** CLOSE TOP (stack POP) */
    const closeTop = useCallback((invoker, arg) => {
        perf.start();
        closePanel(invoker ?? 'usePanelTransitions:closeTop(pop)', arg);
        perf.end('closeTop');
    }, [closePanel, perf]);
    /** Click-safe opener */
    const openOverlayClick = useCallback((panel, opts) => toClickHandler((o) => openOverlay(panel, o), opts), [openOverlay]);
    /** Click-safe closeTop */
    const closeTopClick = useCallback((opts) => toClickHandler(() => closeTop(opts?.invoker, opts?.arg), opts), [closeTop]);
    return {
        // core
        openOverlay,
        closeTop,
        // click-safe
        openOverlayClick,
        closeTopClick,
    };
}
