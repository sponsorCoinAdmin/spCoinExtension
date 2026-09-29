// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/debugFlags.ts
//
// 2026-09-29, real fix — library isolation audit (on request, "the
// node_source ... library is suppose to be a standalone library requiring
// nothing from the web app or extension"). debugLogger.ts, panelTreeDebug.ts,
// panelTreeCallbacks.ts, panelTreeRadioController.ts, usePanelTree.ts, and
// usePerfMarks.ts each read process.env.NEXT_PUBLIC_* directly for their own
// debug/perf toggles — NEXT_PUBLIC_ build-time string-inlining is a Next.js-
// specific mechanism (Vite, the extension's own bundler, has no equivalent
// and never populates it), so every one of those reads is silently
// `undefined` in the extension today. Functionally harmless (every flag
// already defaults to off when unset — arguably the correct behavior for a
// production extension build regardless), but a real architectural leak:
// this "portable" package's behavior was silently determined by which app
// consumed it.
//
// Injectable instead — same "injectable, not hardcoded" principle this
// package already uses elsewhere (traceSink.ts's injectable sink,
// DisplayStackProvider's optional storage prop, panelTreeCallbacks.ts's own
// getPanelTreeGateCheck() indirection). Exported as live getter PROPERTIES
// on a plain object, not frozen `const`s computed once at module-load time —
// every consumer file used to compute its own `const DEBUG_X = process.env...`
// at import time, which would have made a later configureDebugFlags() call
// too late to matter for anything already evaluated. Reading `flags.X` at
// each actual use site instead keeps every flag live for the whole life of
// the process, however late the app's own bootstrap calls
// configureDebugFlags().
//
// Defaults to all-false/off, matching today's real behavior for any
// consumer that never had these NEXT_PUBLIC_* vars populated (the
// extension, always, today). The web app's own AppBootstrap.tsx (already
// the established single wiring point for every other injected extension-
// point in this codebase) should call configureDebugFlags() once with its
// real process.env reads to restore its own existing debug-flag behavior.

export interface DebugFlags {
  DEBUG_LOG_PANEL_TREE: boolean;
  DEBUG_LOG_OVERLAYS: boolean;
  DEBUG_LOG_OVERLAY_CLOSE: boolean;
  DEBUG_LOG_PANEL_CLOSE_INVARIANTS: boolean;
  DEBUG_LOG_PANEL_CLOSE_INVARIANTS_RENDER: boolean;
  DEBUG_LOG_PANEL_ACTIONS: boolean;
  DEBUG_LOG_PANEL_STACK: boolean;
  ALLOW_EMPTY_GLOBAL_OVERLAY: boolean;
  PRODUCTION_LOGGING: boolean;
  PERF_MARKS: boolean;
}

const state: DebugFlags = {
  DEBUG_LOG_PANEL_TREE: false,
  DEBUG_LOG_OVERLAYS: false,
  DEBUG_LOG_OVERLAY_CLOSE: false,
  DEBUG_LOG_PANEL_CLOSE_INVARIANTS: false,
  DEBUG_LOG_PANEL_CLOSE_INVARIANTS_RENDER: false,
  DEBUG_LOG_PANEL_ACTIONS: false,
  DEBUG_LOG_PANEL_STACK: false,
  ALLOW_EMPTY_GLOBAL_OVERLAY: false,
  PRODUCTION_LOGGING: false,
  PERF_MARKS: false,
};

/** Live, mutable — read `flags.X` at the point of use, never cache the value. */
export const flags: Readonly<DebugFlags> = state;

/**
 * Called once by the consuming app's own bootstrap (e.g. the web app's
 * AppBootstrap.tsx), passing its real process.env.NEXT_PUBLIC_* reads.
 * Never called by the extension — every flag simply stays at its
 * already-correct-for-production default (false).
 */
export function configureDebugFlags(overrides: Partial<DebugFlags>): void {
  Object.assign(state, overrides);
}
