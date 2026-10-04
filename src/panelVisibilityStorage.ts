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
  type PanelVisibilitySnapshot,
} from '@sponsorcoin/spcoin-exchange-engine';

import { PANEL_DEFS } from '@sponsorcoin/spcoin-common/panels';

const STORAGE_KEY = 'spcoin_panel_visibility';

// The legacy ExchangeContext blob key (exchangeContextStorage.ts) — read ONLY
// for the one-time migration seed on a user's first boot after this shipped.
const LEGACY_CONTEXT_KEY = 'spcoin_exchange_context';

export async function readPanelVisibilityRaw(): Promise<PanelVisibilitySnapshot | null> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const out: PanelVisibilitySnapshot = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v !== 'boolean') return null;
      const id = Number(k);
      if (!Number.isFinite(id)) return null;
      out[String(id)] = v;
    }
    return out;
  } catch (error) {
    console.error('Failed to read persisted panel visibility:', error);
    return null;
  }
}

async function readLegacyDisplayPanelsForMigration(): Promise<[number, boolean][]> {
  try {
    const stored = await chrome.storage.local.get(LEGACY_CONTEXT_KEY);
    const raw = stored[LEGACY_CONTEXT_KEY];
    // The legacy blob is stored as a STRING (BigInt-safe codec —
    // exchangeContextStorage.ts's stringifyWithBigInt), not as an object.
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const list = parsed?.apiCoreSyncedMembers?.displayPanels;
    if (!Array.isArray(list) || list.length === 0) return [];
    const out: [number, boolean][] = [];
    for (const e of list) {
      const id = Number(e?.id ?? e?.panel ?? e?.displayTypeId);
      if (!Number.isFinite(id)) continue;
      out.push([id, !!e?.visible]);
    }
    return out;
  } catch {
    // A legacy blob written before the BigInt codec, or corrupted, is not a
    // reason to fail the panel boot — fall through to defaults.
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
  const merged = new Map<number, boolean>(
    PANEL_DEFS.map((d) => [Number(d.id), !!d.defaultVisible] as const),
  );
  if (persisted) {
    for (const [k, v] of Object.entries(persisted)) merged.set(Number(k), v);
  } else {
    // Stage D's one-time migration read: no panel key yet, but the user's
    // existing layout is in the legacy ExchangeContext blob. Layer it over the
    // defaults so they don't lose their current panel state on this build's
    // first boot.
    for (const [id, v] of legacyEntries) merged.set(id, v);
  }
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
