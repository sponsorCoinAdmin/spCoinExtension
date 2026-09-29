// File: spCoinCommon/src/panels/panelPersistence.ts
//
// Copied from lib/context/exchangeContext/panelTree/panelTreePersistence.ts
// in the parent app repo (2026-09-06, build plan step 3). Import path
// adjusted; content otherwise unchanged, EXCEPT this file's own
// `flattenPanelTree` is exported here as `flattenPersistedPanelTree` —
// see index.ts's own comment for why (a naming collision with
// defaultPanelTree.ts's unrelated `flattenPanelTree`, harmless in the
// parent app since the two files were never imported into the same
// barrel there).
//
// NOT copied from the same parent-app folder:
// lib/context/exchangeContext/panelTree/panelTreeUtils.ts. Despite the
// design doc originally describing it as a "pure helper" file alongside
// this one, it isn't — `diffAndPublish` there depends on `panelStore`,
// a live runtime singleton (not portable). Correction recorded in
// docs/design/spcoinPackagesDesign.md §2.2.

// Regular (value) import, not `import type` — `panelName` below reads
// SP_COIN_DISPLAY as a runtime value (enums compile to real objects),
// same as the parent app's original file.
import { SP_COIN_DISPLAY } from './spCoinDisplay';

export interface PanelEntry {
  panel: SP_COIN_DISPLAY;
  visible: boolean;
  name?: string;
}

/**
 * Persisted node shapes that may be encountered (read-compat):
 * - canonical (stage 3): { id, visible, name }
 * - legacy:             { panel, visible, name }
 * - older experimental: { displayTypeId, visible, name }
 * - optional nesting:   { children: [...] }
 */
export interface PersistedPanelNode {
  id?: number;
  panel?: number;
  displayTypeId?: number;
  visible?: boolean;
  name?: string;
  children?: PersistedPanelNode[];
}

/** Stable name resolver. */
export function panelName(id: number) {
  return (SP_COIN_DISPLAY as any)?.[id] ?? String(id);
}

/**
 * Single source-of-truth ID resolver (read-compat): accepts canonical +
 * legacy shapes ({ id } / { panel } / older { displayTypeId }).
 */
export function panelIdOf(v: unknown): number | null {
  const anyV = v as any;
  const raw = anyV?.id ?? anyV?.panel ?? anyV?.displayTypeId;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/**
 * Flattens a PERSISTED tree (arbitrary/legacy shapes) into a
 * de-duplicated flat list. Tree shape is not authoritative; visibility
 * is. First occurrence of a panel id wins (deterministic). Renamed from
 * `flattenPanelTree` in the parent app — see this file's own header
 * comment.
 */
export function flattenPersistedPanelTree(
  nodes: PersistedPanelNode[] | undefined,
  known: Set<number>,
): PanelEntry[] {
  if (!Array.isArray(nodes)) return [];

  const out: PanelEntry[] = [];

  const walk = (ns: PersistedPanelNode[]) => {
    for (const n of ns) {
      const id = panelIdOf(n);
      if (id == null) continue;
      if (!known.has(id)) continue;

      const name =
        typeof (n as any)?.name === 'string' && (n as any).name.length > 0
          ? (n as any).name
          : panelName(id);

      out.push({
        panel: id as SP_COIN_DISPLAY,
        visible: !!(n as any)?.visible,
        name,
      });

      if (Array.isArray((n as any)?.children) && (n as any).children.length) {
        walk((n as any).children as PersistedPanelNode[]);
      }
    }
  };

  walk(nodes);

  const seen = new Set<number>();
  return out.filter((e) => {
    const k = Number(e.panel);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Converts a flat list to a visibility map. Missing panels are implicitly false. */
export function toVisibilityMap(list: PanelEntry[]): Record<number, boolean> {
  const m: Record<number, boolean> = {};
  for (const e of list) {
    m[Number(e.panel)] = !!e.visible;
  }
  return m;
}

/** Ensures a panel exists in the flat list. Does NOT change visibility. */
export function ensurePanelPresent(
  list: PanelEntry[],
  panel: SP_COIN_DISPLAY,
): PanelEntry[] {
  if (list.some((e) => Number(e.panel) === Number(panel))) return list;
  return [
    ...list,
    {
      panel,
      visible: false,
      name: panelName(panel),
    },
  ];
}

/**
 * Writes the flat list back to persisted context form.
 *
 * - Persistence is a normalized flat list; no stack or tree reconstruction.
 * - Canonical write: { id, visible, name }; back-compat also writes { panel }.
 * - NEVER writes/keeps a legacy root `displayStack` — strips it if present
 *   on prevCtx so it can't be re-persisted (single source of truth is
 *   apiCoreSyncedMembers.displayStack in the parent app's ExchangeContext).
 */
export function writeFlatTree(prevCtx: any, next: PanelEntry[]) {
  const normalized = next.map((e) => {
    const id = Number(e.panel);
    return {
      id: id as SP_COIN_DISPLAY,
      panel: id as SP_COIN_DISPLAY,
      visible: !!e.visible,
      name: e.name ?? panelName(id),
    };
  });

  const { displayStack: _legacyRootDisplayStack, ...rest } = prevCtx ?? {};

  return {
    ...rest,
    apiCoreSyncedMembers: {
      ...(rest?.apiCoreSyncedMembers ?? {}),
      displayPanels: normalized,
    },
  };
}
