// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/panelTreeDebug.ts
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/panelTree/panelTreeDebug.ts (panel-tree
// runtime migration). Behavior unchanged; `appendDebugTrace` calls now
// route through traceSink.ts (injection point #3) instead of the web
// app's window.localStorage-backed dev tool directly.

import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { createDebugLogger } from './debugLogger';
import { panelTreeTrace } from './traceSink';
import { flags } from './debugFlags';

export const LOG_TIME = false;
// 2026-09-29, real fix — was process.env.NEXT_PUBLIC_DEBUG_LOG_PANEL_TREE /
// NEXT_PUBLIC_DEBUG_LOG_OVERLAYS directly; see debugFlags.ts's own header
// comment. `debugLog` below is still only computed once, at this module's
// own load time (createDebugLogger captures `enabled` by value, not by
// reference) — matches this flag's own pre-existing behavior exactly
// (previously also frozen at process.env's own value at import time), so
// this fix restores real isolation without changing when the flag is read.
export const DEBUG_ENABLED = flags.DEBUG_LOG_PANEL_TREE || flags.DEBUG_LOG_OVERLAYS;

export const debugLog = createDebugLogger('usePanelTree', DEBUG_ENABLED, LOG_TIME);

// Always-on: every openPanel/closePanel call is deferred to a microtask
// here, not applied synchronously — so two calls fired back-to-back in one
// click handler become TWO independent, separately-scheduled state
// transitions instead of one atomic update, each running its own full
// React effect cascade. (This is what useOpenAccountComponent.ts's own
// openPanel(ACCOUNT_PANEL) + openPanel(mode) two-step used to do, for
// every mode — fixed 2026-09-08 to a single openPanel(mode) call for
// ACTIVE_ACCOUNT/SPONSOR_ACCOUNT/RECIPIENT_ACCOUNT, and to AGENT_ACCOUNT's
// own dedicated openPanel(AGENT_PANEL) — but the underlying deferral
// mechanism here is general-purpose and still applies to any caller that
// does fire multiple related openPanel/closePanel calls back-to-back.)
// `seq` (assigned at CALL time, i.e. in the same
// order logAction's own trace for the same call already appears in the
// Trace Log) plus this "run" trace's own position is what shows whether
// deferred writes actually execute in call order or interleave with
// something else — the "queued" half of this used to be a separate trace
// line too, but it fired at essentially the same instant as logAction's
// already-existing per-call trace, so it added no ordering information
// logAction's own trace order doesn't already give for free.
let scheduleSeq = 0;
export const schedule = (fn: () => void, label?: string) => {
  const seq = ++scheduleSeq;
  const run = () => {
    panelTreeTrace('panelTreeDebug:schedule:run', { seq, label: label ?? '(unlabeled)' });
    fn();
  };
  return typeof queueMicrotask === 'function' ? queueMicrotask(run) : setTimeout(run, 0);
};

export function logAction(
  kind: 'openPanel' | 'closePanel',
  panel: SP_COIN_DISPLAY,
  invoker?: string,
  extra?: Record<string, unknown>,
) {
  // Always-on (previously gated behind DEBUG_ENABLED, which meant openPanel/
  // closePanel calls were invisible in the Trace Log by default) — this is
  // the actual call site, panel + invoker, for every open/close, which is
  // exactly what's needed to see what's really driving a panel-visibility
  // toggle instead of inferring it from panelStore's own writes alone.
  panelTreeTrace(`panelTreeCallbacks:${kind}`, {
    panel: SP_COIN_DISPLAY[panel],
    invoker: invoker ?? 'unknown',
    ...(extra ?? {}),
  });

  if (!DEBUG_ENABLED) return;

  debugLog.log?.('[usePanelTree] action', {
    kind,
    panel: SP_COIN_DISPLAY[panel],
    invoker: invoker ?? 'unknown',
    ...(extra ?? {}),
  });
}
