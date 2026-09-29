// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/panelTree/panelBootstrap.tsx
//
// 2026-09-18 — moved from the parent app's
// lib/context/exchangeContext/helpers/panelBootstrap.ts (Phase B.2 Stage
// 1.c — see the approved plan at .claude/plans/warm-questing-cookie.md).
// Only real coupling was PanelBootstrap's own raw `lsGetRaw(EXCHANGE_CONTEXT_LS_KEY)`
// call (flagged, deferred, Stage 10) — now an optional injected
// `hasPersistedBefore` prop, same shape as displayStackStore.tsx's
// `storage` prop, defaulting to a small self-contained window.localStorage
// check using the same key string the web app's own
// localStorageKeys.ts declares ('exCtxLSKey') — zero behavior change for
// the web app's own usage. The repair helper functions below (used by the
// web app's own deriveWebAppBootPanelState, itself staying web-app-local,
// supplied via the already-injectable bootExtensions prop) had zero
// coupling of their own — moved verbatim.
'use client';

import { useEffect, useRef } from 'react';

import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { PanelNode } from '@sponsorcoin/spcoin-common/panels';
import {
  defaultSpCoinPanelTree,
  flattenPanelTree,
  NON_PERSISTED_PANELS,
  MUST_INCLUDE_ON_BOOT,
  MAIN_RADIO_OVERLAY_PANELS,
} from '@sponsorcoin/spcoin-common/panels';
import { usePanelTree } from './usePanelTree';
import { useExchangeContext } from '../hooks/useExchangeContext';

/* ------------------------------- PanelBootstrap ---------------------------- */

const EXCHANGE_CONTEXT_LS_KEY = 'exCtxLSKey';

/** Default "has this browser persisted an ExchangeContext before" check —
 *  real window.localStorage, same key the web app's own
 *  localStorageKeys.ts declares. Self-contained (no cross-package import
 *  of the web app's own lib/cache/localStorageCache.ts). */
function defaultHasPersistedBefore(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(EXCHANGE_CONTEXT_LS_KEY);
    const parsed = raw ? JSON.parse(raw) : undefined;
    return Array.isArray(parsed?.apiCoreSyncedMembers?.displayPanels);
  } catch {
    return false;
  }
}

export interface PanelBootstrapProps {
  /** Optional override — a consumer with a different persisted-state
   *  location (e.g. chrome.storage.local, read asynchronously elsewhere
   *  and cached) can supply its own check. Defaults to the real
   *  window.localStorage check above. */
  hasPersistedBefore?: () => boolean;
}

/**
 * Post-mount bootstrap which ensures a MAIN_RADIO_OVERLAY_PANELS panel is selected.
 * If nothing is active, it opens TRADING_STATION_PANEL once on mount.
 */
export function PanelBootstrap({ hasPersistedBefore = defaultHasPersistedBefore }: PanelBootstrapProps = {}) {
  const { activeMainOverlay, openPanel } = usePanelTree();
  const { exchangeContext } = useExchangeContext();
  const did = useRef(false);

  useEffect(() => {
    if (did.current) return;
    if (exchangeContext == null) return;
    did.current = true;

    // Has this browser completed at least one real persist before (i.e.
    // this isn't a genuinely first-ever boot)? Used to be a live check of
    // settings.visiblePanelTreeMembers' presence (every persist wrote it,
    // even as []); that field was removed 2026-09-02 (storage-only
    // compaction of displayPanels, never bought a meaningful size saving —
    // see writeExtensions.ts's hasLegacyPanelPersistenceFormat). displayPanels
    // is now the one persisted shape, and unlike visiblePanelTreeMembers
    // it's also present on the in-memory *default* context from first
    // render (not only after a real persist), so an in-memory check can't
    // distinguish "loaded" from "still on defaults" the way the old field
    // could — this reads the raw persisted blob directly instead, the one
    // place that distinction still actually lives.
    const hasPersistedDisplayPanels = hasPersistedBefore();

    // Only pick a default if nothing is selected (rare),
    // so we never override a persisted choice.
    if (activeMainOverlay == null && !hasPersistedDisplayPanels) {
      queueMicrotask(() =>
        openPanel(
          SP_COIN_DISPLAY.TRADING_STATION_PANEL,
          'ExchangeProvider:PanelBootstrap(openPanel)',
        ),
      );
    }
  }, [activeMainOverlay, openPanel, exchangeContext, hasPersistedBefore]);

  return null;
}

/* --------------------------- Panel helper functions ------------------------ */

const panelName = (id: number) => SP_COIN_DISPLAY[id] ?? String(id);

/** Type guard for a “flat” panel list in settings.spCoinPanelTree. */
export const isMainPanels = (x: any): x is PanelNode[] =>
  Array.isArray(x) &&
  x.length > 0 &&
  x.every(
    (n) =>
      n &&
      typeof n === 'object' &&
      typeof (n as any).panel === 'number' &&
      typeof (n as any).visible === 'boolean',
  );

/**
 * Ensure a single node has a valid name and visible flag. `children` is
 * omitted entirely (not set to `undefined`) when there isn't a real
 * array — flat displayPanels entries (the real, sole shape since
 * 2026-09-01/02, see DisplayPanel's own doc comment in types.ts) never
 * have one, and an explicit `children: undefined` key used to ride along
 * on every single entry as dead-weight noise in the debug tree (found
 * 2026-09-02 — every flat panel showed a meaningless "children: undefined"
 * row). Array.isArray(undefined) and Array.isArray(missing property)
 * behave identically, so omitting the key changes nothing for any real
 * (tree-shaped) consumer.
 */
const ensurePanelName = (n: PanelNode): PanelNode => ({
  panel: n.panel,
  name: n.name || panelName(n.panel),
  visible: !!n.visible,
  ...(Array.isArray(n.children) ? { children: n.children.map(ensurePanelName) } : {}),
});

/** Apply ensurePanelName to an entire in-memory tree. */
export const ensurePanelNamesInMemory = (panels: PanelNode[]): PanelNode[] =>
  panels.map(ensurePanelName);

/**
 * Start from authored defaults, merge persisted, enforce required and order.
 * This is the top-level “repair” used on boot.
 */
export function repairPanels(
  persisted: { panel: number; name?: string; visible?: boolean }[] | undefined,
): PanelNode[] {
  // Start from authored defaults, excluding non-persisted IDs
  const defaults = flattenPanelTree(defaultSpCoinPanelTree).filter(
    (p) => !NON_PERSISTED_PANELS.has(p.panel as SP_COIN_DISPLAY),
  );

  // Index defaults by id
  const byId = new Map<number, PanelNode>();
  for (const p of defaults) {
    byId.set(p.panel, {
      panel: p.panel,
      name: p.name || panelName(p.panel),
      visible: !!p.visible,
    });
  }

  // Merge any persisted visibility/name (if provided)
  if (Array.isArray(persisted)) {
    for (const p of persisted) {
      const id = p?.panel;
      if (!Number.isFinite(id) || NON_PERSISTED_PANELS.has(id as SP_COIN_DISPLAY))
        continue;

      const prev = byId.get(id);
      if (prev) {
        if (typeof p.visible === 'boolean') prev.visible = p.visible;
        if (p.name && p.name !== prev.name) prev.name = p.name;
      } else {
        byId.set(id, {
          panel: id,
          name: p.name || panelName(id),
          visible: !!p.visible,
        });
      }
    }
  }

  // Ensure required panels exist
  for (const [id, vis] of MUST_INCLUDE_ON_BOOT) {
    if (!byId.has(id)) {
      byId.set(id, {
        panel: id,
        name: panelName(id),
        visible: vis,
      });
    }
  }

  // Preserve default order, then append any extras
  const defaultOrder = defaults.map((d) => d.panel);
  const extras = [...byId.keys()].filter((id) => !defaultOrder.includes(id));
  const orderedIds = [...defaultOrder, ...extras];

  return orderedIds.map((id) => byId.get(id)!);
}

/** Drop non-persisted items (safety no-op if they’re already excluded). */
export function dropNonPersisted(panels: PanelNode[]): PanelNode[] {
  return panels.filter(
    (p) => !NON_PERSISTED_PANELS.has(p.panel as SP_COIN_DISPLAY),
  );
}

/** Ensure required panels exist; apply default visibility only when absent. */
export function ensureRequiredPanels(
  panels: PanelNode[],
  required: readonly (readonly [number, boolean])[],
): PanelNode[] {
  const byId = new Map(panels.map((p) => [p.panel, { ...p }]));
  for (const [id, vis] of required) {
    if (!byId.has(id)) {
      byId.set(id, {
        panel: id,
        name: panelName(id),
        visible: vis,
      });
    }
  }
  return [...byId.values()];
}

/** Zero/one visible overlay; prefer TRADING_STATION_PANEL if multiple. */
export function reconcileOverlayVisibility(flat: PanelNode[]): PanelNode[] {
  const isOverlay = (id: number) =>
    MAIN_RADIO_OVERLAY_PANELS.includes(id as SP_COIN_DISPLAY);

  const visible = flat.filter((n) => isOverlay(n.panel) && n.visible);
  if (visible.length <= 1) return flat;

  const preferred =
    visible.find((n) => n.panel === SP_COIN_DISPLAY.TRADING_STATION_PANEL) ??
    visible[0];

  return flat.map((n) =>
    isOverlay(n.panel)
      ? { ...n, visible: n.panel === preferred.panel }
      : n,
  );
}
