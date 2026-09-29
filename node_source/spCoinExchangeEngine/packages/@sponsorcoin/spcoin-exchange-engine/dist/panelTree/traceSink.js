// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/traceSink.ts
//
// 2026-09-18, panel-tree runtime migration (see the approved plan at
// .claude/plans/warm-questing-cookie.md, "injection point #3"). The
// parent app's original panelStore.ts/panelTreeCallbacks.ts/
// panelTreeDebug.ts called `appendDebugTrace` (lib/utils/debugTrace.ts)
// directly — a dev-tool that itself writes to `window.localStorage` for
// its enabled-flag and persisted buffer. Bundling that into a
// "consumer-agnostic" shared package would contradict the principle
// already recorded in docs/npmMigrationDesign.md's Storage/persistence
// findings section (injectable persistence, not hardcoded). This module
// is that injection point: a no-op by default, with the web app's real
// appendDebugTrace wired in once at boot via setPanelTreeTraceSink.
let sink = () => { };
/** Wire a real trace sink (e.g. the web app's appendDebugTrace) in once,
 *  at app boot. Omit entirely for a consumer with no debug-trace UI. */
export function setPanelTreeTraceSink(fn) {
    sink = fn;
}
/** Internal — every panel-tree file traces through this instead of
 *  calling a concrete logger directly. */
export function panelTreeTrace(message, data) {
    sink(message, data);
}
