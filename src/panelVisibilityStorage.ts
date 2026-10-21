// File: src/panelVisibilityStorage.ts
//
// 2026-09-30, Stage A of docs/design/visibilityEnumDesign.txt —
// chrome.storage.local-backed persistence for panelStore's panel-visibility
// state, matching this extension's own storage conventions
// (displayStackStorage.ts / meritWalletUiStorage.ts / openTargetStorage.ts:
// one dedicated key per concern, read once before the first render).
//
// Same sync/async bridge as displayStackStorage.ts, for the same reason: the
// panelStore read sink is called from panelStore.readPersisted() during the
// module-scope bootstrap, which is synchronous, while chrome.storage.local is
// not. So the real value is read in renderWallet()'s existing
// Promise.all (before the first render) and closed over here.
//
// No BigInt codec is needed (contrast exchangeContextStorage.ts, which
// requires one because the ExchangeContext blob carries BigInts): panel
// visibility is a flat { [panelId]: boolean }.

import {
  panelStore,
  setPanelVisibilityPersistence,
  parsePanelVisibilitySnapshot,
  parseMigrationMarkers,
  applyDefaultOnToSnapshot,
  applyDefaultOnToList,
  parseLegacyDisplayPanels,
  mergePanelVisibility,
  type PanelVisibilitySnapshot,
} from '@sponsorcoin/spcoin-exchange-engine';

import { PANEL_DEFS } from '@sponsorcoin/spcoin-common/panels';

const STORAGE_KEY = 'spcoin_panel_visibility';

// The legacy ExchangeContext blob key (exchangeContextStorage.ts) — read ONLY
// for the one-time migration seed on a user's first boot after this shipped.
const LEGACY_CONTEXT_KEY = 'spcoin_exchange_context';

// 2026-10-05, on request — a panel whose authored default became ON never reaches a RETURNING install: the
// saved snapshot below already holds the old `false`, and boot only seeds panels that are ABSENT. So each bump
// is applied once here, then recorded so a user who later hides the panel on purpose keeps it hidden.
const MIGRATIONS_KEY = 'spcoin_panel_visibility_migrations';
// (the default-on list itself and the rules that apply it are the engine's shared ones, docs/meritMigration.txt row 38; this file only reads and writes chrome.storage)

// The extension keeps the panel tree in TWO saved places that both feed boot: this snapshot AND the saved
// ExchangeContext's displayPanels list (exchangeContextStorage.ts) — and the tree wins at boot, so a bump must
// reach both. Each store has its own marker so neither read can mark the other's migration done.
export async function migrateDefaultOnPanelList(
  list: Array<{ panel?: number; id?: number; visible?: boolean }>,
): Promise<boolean> {
  const markerKey = `${MIGRATIONS_KEY}:tree`;
  try {
    const stored = await chrome.storage.local.get(markerKey);
    const done = parseMigrationMarkers(stored[markerKey]);
    const { listChanged, markersChanged } = applyDefaultOnToList(list, done);
    if (markersChanged) await chrome.storage.local.set({ [markerKey]: [...done] });
    return listChanged;
  } catch (error) {
    console.error('Failed to apply panel default-on migrations to the saved tree:', error);
    return false;
  }
}

async function applyDefaultOnMigrations(snapshot: PanelVisibilitySnapshot): Promise<PanelVisibilitySnapshot> {
  try {
    const stored = await chrome.storage.local.get(MIGRATIONS_KEY);
    const done = parseMigrationMarkers(stored[MIGRATIONS_KEY]);
    const { snapshotChanged, markersChanged } = applyDefaultOnToSnapshot(snapshot, done);
    if (snapshotChanged || markersChanged) {
      await chrome.storage.local.set({ [MIGRATIONS_KEY]: [...done], ...(snapshotChanged ? { [STORAGE_KEY]: snapshot } : {}) });
    }
  } catch (error) {
    console.error('Failed to apply panel default-on migrations:', error);
  }
  return snapshot;
}

export async function readPanelVisibilityRaw(): Promise<PanelVisibilitySnapshot | null> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const snapshot = parsePanelVisibilitySnapshot(stored[STORAGE_KEY]);
    return snapshot ? await applyDefaultOnMigrations(snapshot) : null;
  } catch (error) {
    console.error('Failed to read persisted panel visibility:', error);
    return null;
  }
}

async function readLegacyDisplayPanelsForMigration(): Promise<[number, boolean][]> {
  try {
    const stored = await chrome.storage.local.get(LEGACY_CONTEXT_KEY);
    const raw = stored[LEGACY_CONTEXT_KEY];
    // The legacy blob is stored as a STRING (BigInt-safe codec — exchangeContextStorage.ts's stringifyWithBigInt), not as an object.
    return parseLegacyDisplayPanels(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch {
    // A legacy blob written before the BigInt codec, or corrupted, is not a reason to fail the panel boot — fall through to defaults.
    return [];
  }
}

function writePanelVisibility(snapshot: PanelVisibilitySnapshot): void {
  void chrome.storage.local.set({ [STORAGE_KEY]: snapshot }).catch((error) => {
    // Best-effort, same contract as every other write in this extension: a
    // failed write means this session's panel state doesn't survive the next
    // side-panel reopen, not a hard failure. The legacy ExchangeContext
    // mirror remains the documented recovery path.
    console.error('Failed to persist panel visibility:', error);
  });
}

/** Wire persistence and seed the store from an already-resolved persisted
 *  value. Call ONCE from renderWallet(), inside its existing storage-read
 *  Promise.all, BEFORE root.render().
 *
 *  Must run before the first render: LiteExchangeProvider renders null until
 *  its own async boot resolves, but its first non-null render already mounts
 *  components that read panelStore. Seeding later would flash every panel
 *  closed for a frame — the exact flash the design doc's boot-sequencing item
 *  forbids.
 *
 *  Idempotent via panelStore.hydrate's once-only guard, so a stray second
 *  call can't stomp visibility the user has since changed. */
export function bootstrapPanelVisibility(
  persisted: PanelVisibilitySnapshot | null,
  legacyEntries: [number, boolean][],
): void {
  setPanelVisibilityPersistence(() => persisted, writePanelVisibility);

  if (panelStore.hasHydrated()) return;

  // 2026-10-03 — the store reads `false` for any panel nobody has written, and
  // this extension (unlike the web app, whose tree is seeded from
  // defaultPanelTree) never applied the registry defaults. A persisted snapshot
  // only ever holds the handful of ids something explicitly wrote (7 keys on a
  // fresh profile), so every other panel — PANEL_TITLE, MENU_TAB_HEADER_BAR,
  // WALLET_ACCOUNT_HEADER and its children — came up hidden once those got real
  // gates, and the extension looked nothing like the web app's default setup.
  // Defaults go underneath; persisted (or, on migration, legacy) values win, so
  // a panel the user actually closed stays closed.
  const merged = mergePanelVisibility(
    PANEL_DEFS.map((d) => [Number(d.id), !!d.defaultVisible] as const),
    persisted,
    legacyEntries,
  );
  panelStore.hydrate(merged);
}

/** Convenience: performs both reads in parallel. Split out so
 *  renderWallet()'s existing Promise.all stays readable. */
export async function readPanelVisibilityAndLegacy(): Promise<{
  persisted: PanelVisibilitySnapshot | null;
  legacy: [number, boolean][];
}> {
  const [persisted, legacy] = await Promise.all([
    readPanelVisibilityRaw(),
    readLegacyDisplayPanelsForMigration(),
  ]);
  return { persisted, legacy };
}
