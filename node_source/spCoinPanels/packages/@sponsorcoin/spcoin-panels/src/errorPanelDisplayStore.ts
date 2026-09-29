// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/errorPanelDisplayStore.ts
//
// 2026-09-22, real migration — promoted verbatim from the web app's
// lib/store/errorPanelDisplayStore.ts. Zero dependencies of its own (a
// plain module-level external store), so it's fully portable as-is. Toggles
// MessagePanelReal's body between horizontal-scroll (long lines preserved
// as-is) and wrap (text wraps to fit, no horizontal overflow). Read/written
// from two separate real-app components (ActiveWalletPanel's toggle
// button, MessagePanel's body) plus MessagePanelReal here — the web app's
// own copy is now a re-export shim so both stay on the same store.
//
// Defaults true (wrap on) — a long error/status message (e.g. a detailed
// contract-call failure) should be fully readable the instant the panel
// opens, not run off horizontally until the user notices and clicks "Wrap"
// themselves.
let wrap = true;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const errorPanelDisplayStore = {
  get(): boolean {
    return wrap;
  },
  toggle() {
    wrap = !wrap;
    emit();
  },
  set(next: boolean) {
    if (wrap === next) return;
    wrap = next;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): boolean {
    return wrap;
  },
  getServerSnapshot(): boolean {
    return false;
  },
};
