// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/displayStackStore.tsx
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/displayStackStore.tsx (panel-tree runtime
// migration, injection point #2). The original hard-called the web app's
// `lsGetRaw`/`lsSetRaw` (lib/cache/localStorageCache.ts). `DisplayStackProvider`
// now takes optional `{ read, write }` storage props — same shape as
// ExchangeContext's own `ExchangeContextStorageReadFn`/`writeExtensions.persist`
// extension points — defaulting to a small self-contained localStorage
// implementation (works as-is in both the web app and an extension's
// side-panel document, which both have `window.localStorage`). A future
// extension build can pass `chrome.storage.local`-backed versions instead,
// without touching this file again.
//
// Real, independently-owned state (2026-09-06, on direct request) for the
// panel navigation stack. Extracted off
// ExchangeContext.apiCoreSyncedMembers.displayStack, following the exact
// same pattern already used for settings.testPage → webTestPageSettings.tsx
// and settings.apiTradingProvider → meritApiTradingProvider.tsx — see
// docs/design/exchangeContextLibraryDesign.md's "Target shape" section.
//
// Why this one is different from accounts/network/displayPanels (which
// stay on ExchangeContext, synced): displayStack is not independent data
// that two sides need to agree on directly — it's a DERIVED result of
// calling openPanel/closePanel (real push/pop/dedup/ancestor-walk logic
// in usePanelTree.ts — reimplementing that logic a second time in a
// server-side merge function to reconcile two sides' raw arrays would mean
// maintaining the same rules in two places, guaranteed to drift). The
// resolved approach: replicate the openPanel/closePanel CALL across
// processes (each side runs its own already-correct logic against
// synced displayPanels), not the resulting displayStack VALUE — so
// displayStack itself never needs direct cross-process reconciliation.
// See that discussion's own conclusion for the full reasoning.
//
// Deliberately its own small Context+Provider, not bolted onto
// createMimicContextProvider.tsx — same reasoning as webTestPageSettings.tsx:
// this is real, directly-written, directly-persisted state, not a
// projection of the real ExchangeContext.
'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';

/** Self-contained SSR-safe localStorage read, default for the `read` prop
 *  below — no cross-package dependency on the web app's own
 *  lib/cache/localStorageCache.ts. */
function defaultRead(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Self-contained SSR-safe localStorage write, default for the `write` prop
 *  below. */
function defaultWrite(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Degrade silently — quota or unavailable, same as every prior call site.
  }
}

/** Deliberately a brand-new key, not the old shared EXCHANGE_CONTEXT_LS_KEY
 *  blob — this state has nothing to do with ExchangeContext anymore. A
 *  stray apiCoreSyncedMembers.displayStack may still sit unused inside old
 *  saved ExchangeContext blobs; harmless dead data, never read again —
 *  same abandon-in-place precedent testPage/apiTradingProvider already
 *  set on their own extraction. */
const DISPLAY_STACK_LS_KEY = 'spcoin-display-stack';

export interface DisplayStackStorage {
  /** Read the persisted stack, or null if none/unavailable. */
  read: (key: string) => string | null;
  /** Best-effort write — failures (quota, disabled storage, SSR) should
   *  degrade silently, same contract every prior call site relied on. */
  write: (key: string, value: string) => void;
}

const DEFAULT_STORAGE: DisplayStackStorage = { read: defaultRead, write: defaultWrite };

function loadPersisted(storage: DisplayStackStorage): SP_COIN_DISPLAY[] {
  try {
    const raw = storage.read(DISPLAY_STACK_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x)) as unknown as SP_COIN_DISPLAY[];
  } catch {
    return [];
  }
}

export type SetDisplayStackIds = (updater: (prev: SP_COIN_DISPLAY[]) => SP_COIN_DISPLAY[]) => void;

interface DisplayStackContextValue {
  /** Current stack ids. Same one-render-tolerant contract as any other
   *  React state read — always up to date as of the last commit. */
  displayStackIds: SP_COIN_DISPLAY[];
  setDisplayStackIds: SetDisplayStackIds;
  /** Ref-based "current value right now" accessor — usePanelTree.ts's own
   *  push/pop/dedup logic reads this synchronously mid-callback (the same
   *  ref-read pattern it already used for the old persistedIdsRef before
   *  this extraction), and panelTreeCallbacks.ts's closePanel needs it
   *  passed in explicitly since it can no longer read displayStack off
   *  ExchangeContext's own `prev` inside its updater. */
  getDisplayStackIds: () => SP_COIN_DISPLAY[];
}

const DisplayStackContext = createContext<DisplayStackContextValue | null>(null);

export function DisplayStackProvider({
  children,
  storage,
}: {
  children: ReactNode;
  /** Optional storage backend — defaults to real `window.localStorage`.
   *  A future extension build passes `chrome.storage.local`-backed
   *  versions here instead. */
  storage?: DisplayStackStorage;
}) {
  const activeStorage = storage ?? DEFAULT_STORAGE;
  const [displayStackIds, setDisplayStackIdsState] = useState<SP_COIN_DISPLAY[]>(() =>
    loadPersisted(activeStorage),
  );
  const idsRef = useRef<SP_COIN_DISPLAY[]>(displayStackIds);
  idsRef.current = displayStackIds;

  useEffect(() => {
    try {
      activeStorage.write(DISPLAY_STACK_LS_KEY, JSON.stringify(displayStackIds.map(Number)));
    } catch {
      // Best-effort persistence — a write failure (private browsing, quota)
      // shouldn't break the page; the in-memory value still works for this
      // session.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayStackIds]);

  const setDisplayStackIds = useMemo<SetDisplayStackIds>(
    () => (updater) => setDisplayStackIdsState(updater),
    [],
  );

  const getDisplayStackIds = useMemo(() => () => idsRef.current, []);

  const value = useMemo<DisplayStackContextValue>(
    () => ({ displayStackIds, setDisplayStackIds, getDisplayStackIds }),
    [displayStackIds, setDisplayStackIds, getDisplayStackIds],
  );

  return <DisplayStackContext.Provider value={value}>{children}</DisplayStackContext.Provider>;
}

/** Throws outside DisplayStackProvider — real, always-available state once
 *  mounted, not something that can legitimately be null for a render. Same
 *  "fail loud" contract useTestPageSettings() uses. */
export function useDisplayStack(): DisplayStackContextValue {
  const ctx = useContext(DisplayStackContext);
  if (!ctx) {
    throw new Error('❌ useDisplayStack must be used within a DisplayStackProvider');
  }
  return ctx;
}
