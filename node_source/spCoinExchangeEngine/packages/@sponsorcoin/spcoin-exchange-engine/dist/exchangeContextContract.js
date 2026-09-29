// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/exchangeContextContract.ts
//
// 2026-09-18, Phase B.1 of the ExchangeContext runtime unification (see
// docs/npmMigrationDesign.md's stage 7 entry, and the approved plan at
// .claude/plans/warm-questing-cookie.md) — the "contract-only" slice moved
// out of the parent app's lib/context/ExchangeProvider.tsx (1188 lines):
// the extension-point types/interfaces, the shared React.Context object,
// and three genuinely pure helper functions. The stateful ExchangeProvider
// component itself (and everything it directly imports — account/token
// hydration, Merit-mimic verification instrumentation, panel/app bootstrap)
// stays in the parent app for now — explicitly deferred to "Phase B.2",
// which needs its own follow-up plan resolving 4 real open questions (see
// the approved plan's "Phase B scope decision" section) before it can move
// safely. This file is that plan's item 1-3; item 4 (the parent app's own
// re-export shim) and item 5 (the extension's exchangeContextTypes.ts
// follow-up) are separate edits alongside this one.
//
// One deliberate deviation from the approved plan's helper list:
// `isHydratedAccount` was NOT moved here, even though it looked pure at a
// glance. It's never exported from ExchangeProvider.tsx today (a private
// implementation detail of the stateful hydration effects, which are
// explicitly NOT part of this pass), and it has a real dependency the
// other three don't: it compares against `ANONYMOUS_ACCOUNT_IMAGE`, a
// hardcoded `/assets/miscellaneous/Anonymous.png` path from
// accountHydration.ts (609 lines, itself deferred to Phase B.2). Moving it
// here would have meant either baking a parent-app-specific asset path
// into a portable package, or parameterizing it ahead of any real second
// caller asking for that — neither is this pass's job. Left exactly where
// it is, unmoved, still module-private to ExchangeProvider.tsx.
import { createContext } from 'react';
// Stable module-level defaults (not fresh literals per render) so a
// Provider built on this contract doesn't churn callback identity on every
// render when writeExtensions is omitted.
export const EMPTY_WRITE_MIDDLEWARE = [];
export const NOOP_PERSIST = () => { };
export const DEFAULT_BOOT_PANEL_EXTENSION = ({ settingsAny }) => ({
    displayPanels: Array.isArray(settingsAny?.displayPanels) ? settingsAny.displayPanels : [],
});
export const DEFAULT_STORAGE_READ = async () => undefined;
/** The one shared React.Context object every real consumer's Provider
 * mounts a value onto, and every `useExchangeContext()`-equivalent hook
 * reads from — this is what actually makes "one contract, independently
 * running instances" possible: the web app and the extension each run
 * their own Provider, but both are typed against (and, for the web app
 * today, literally instantiate) this same Context object. */
export const ExchangeContextState = typeof createContext === 'function'
    ? createContext(null)
    : null;
/* --------------------------------- Pure helpers -------------------------------- */
/** Fills in every NetworkElement field with a safe default for any that
 * are missing — used when merging a partial/persisted network blob into a
 * real NetworkElement on boot. */
export const ensureNetwork = (n) => ({
    connected: !!n?.connected,
    appChainId: n?.appChainId ?? 0,
    chainId: typeof n?.chainId === 'number' ? n.chainId : 0,
    logoURL: n?.logoURL ?? '',
    name: n?.name ?? '',
    symbol: n?.symbol ?? '',
    url: n?.url ?? '',
    rpcUrl: n?.rpcUrl ?? '',
});
/** structuredClone when available, JSON round-trip fallback otherwise —
 * every ExchangeContext write clones before mutating so `prev` stays
 * untouched for the before/after diff. */
export const clone = (o) => typeof structuredClone === 'function'
    ? structuredClone(o)
    : JSON.parse(JSON.stringify(o));
/** Case-insensitive address/string comparison helper — undefined-safe. */
export const lower = (s) => (s ? s.toLowerCase() : s);
