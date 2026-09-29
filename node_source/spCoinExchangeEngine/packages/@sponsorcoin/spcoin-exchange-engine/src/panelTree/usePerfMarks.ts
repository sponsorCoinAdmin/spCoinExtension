// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/usePerfMarks.ts
//
// 2026-09-18 — moved from the parent app's lib/hooks/perf/usePerfMarks.ts
// (panel-tree migration follow-up, "stage 9d" — usePanelTransitions.ts's
// sole dependency besides the already-portable usePanelTree). No coupling
// — a self-contained window.performance wrapper, safe no-op unless
// enabled, content unchanged. Not part of the package's public barrel
// (only usePanelTransitions.ts uses it) — moved alongside it rather than
// left as a cross-package dependency back to the web app.
'use client';

import { useCallback } from 'react';
// 2026-09-29, real fix — PERF_ON used to be a frozen module-level const
// reading process.env.NEXT_PUBLIC_PERF_MARKS directly; each callback below
// now reads flags.PERF_MARKS live instead — see debugFlags.ts's own header
// comment.
import { flags } from './debugFlags';

export function usePerfMarks(base: string) {
  const start = useCallback(() => {
    if (!flags.PERF_MARKS || typeof window === 'undefined' || typeof performance === 'undefined') return;
    performance.mark(`${base}:start`);
  }, [base]);

  const end = useCallback((label?: string) => {
    if (!flags.PERF_MARKS || typeof window === 'undefined' || typeof performance === 'undefined') return;
    const s = `${base}:start`;
    const e = `${base}:end`;
    performance.mark(e);
    try {
      performance.measure(label ? `${base}:${label}` : base, s, e);
    } catch {
      /* ignore */
    } finally {
      performance.clearMarks(s);
      performance.clearMarks(e);
    }
  }, [base]);

  // Convenience wrapper if you want to time an inline function
  const time = useCallback(<T,>(label: string, fn: () => T): T => {
    if (!flags.PERF_MARKS || typeof window === 'undefined' || typeof performance === 'undefined') return fn();
    const s = `${base}:${label}:s`;
    const e = `${base}:${label}:e`;
    performance.mark(s);
    try {
      return fn();
    } finally {
      performance.mark(e);
      try { performance.measure(`${base}:${label}`, s, e); } catch { /* ignore */ }
      performance.clearMarks(s);
      performance.clearMarks(e);
    }
  }, [base]);

  return { start, end, time };
}
