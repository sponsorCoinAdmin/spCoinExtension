// File: src/exchangeContextStorage.ts
//
// 2026-09-18, Phase B.2 Stage 1.b (see the web app repo's approved plan at
// .claude/plans/warm-questing-cookie.md) — chrome.storage.local-backed
// implementations of @sponsorcoin/spcoin-exchange-engine's
// ExchangeContextStorageExtensions/ExchangeContextWriteExtensions.persist
// contracts, matching the web app's own webAppExchangeContextStorageExtensions/
// webAppExchangeContextWriteExtensions shape (localStorage there,
// chrome.storage.local here — same reasoning as meritWalletUiStorage.ts/
// openTargetStorage.ts: this is a chrome-extension:// page, no access to
// the web app's own localStorage even if it wanted to reuse it, different
// origin entirely).

import type {
  ExchangeContextStorageExtensions,
  ExchangeContextWriteExtensions,
} from '@sponsorcoin/spcoin-exchange-engine';

import { migrateDefaultOnPanelList } from './panelVisibilityStorage';

const STORAGE_KEY = 'spcoin_exchange_context';

// Real bug, found live 2026-09-18 ("extension opens, no content") —
// chrome.storage.local can't serialize BigInt (TokenContract.balance,
// and — since Stage 2.c — apiCoreSyncedMembers.accounts.activeAccount.balance,
// set the moment any account activates via makeMinimalAccountFallback).
// This file's own earlier comment called that "not yet relevant until
// Stage 3" — wrong: Stage 2.c already introduces a real BigInt as soon as
// an account is selected, not just once hydration lands. A failed
// chrome.storage.local.set() with an unserializable value can throw
// synchronously, which (before LiteExchangeProvider's own boot effect got
// a try/catch, same live fix) meant the whole extension silently never
// finished booting. Stored as a BigInt-safe JSON STRING instead of a raw
// object — chrome.storage.local happily stores a string — round-tripped
// back to real BigInt values on read via the matching reviver below.
const BIGINT_MARKER = '__bigint__:';

function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? `${BIGINT_MARKER}${v.toString()}` : v));
}

function parseWithBigInt(json: string): unknown {
  return JSON.parse(json, (_key, v) =>
    typeof v === 'string' && v.startsWith(BIGINT_MARKER) ? BigInt(v.slice(BIGINT_MARKER.length)) : v,
  );
}

async function readExchangeContext(): Promise<unknown | undefined> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const raw = stored[STORAGE_KEY];
    if (typeof raw !== 'string') return undefined;
    const parsed = parseWithBigInt(raw);
    // 2026-10-05 — a panel whose default became ON (ZERO_X_TRADE_BUTTON) must also flip in this saved tree, which
    // wins over the panel-visibility snapshot at boot. Written back so the change survives the next boot.
    const list = (parsed as { apiCoreSyncedMembers?: { displayPanels?: unknown } } | undefined)?.apiCoreSyncedMembers?.displayPanels;
    if (Array.isArray(list) && (await migrateDefaultOnPanelList(list))) {
      await chrome.storage.local.set({ [STORAGE_KEY]: stringifyWithBigInt(parsed) });
    }
    return parsed;
  } catch (error) {
    // A malformed/corrupted persisted blob shouldn't block boot — see
    // LiteExchangeProvider's own boot-effect try/catch, which falls back
    // to a fresh default context when readStorage() returns undefined
    // (or throws — this catch turns a throw into that same undefined
    // fallback signal).
    // eslint-disable-next-line no-console
    console.error('[exchangeContextStorage] failed to read/parse persisted ExchangeContext, starting fresh:', error);
    return undefined;
  }
}

export const extensionExchangeContextStorageExtensions: ExchangeContextStorageExtensions = {
  read: readExchangeContext,
};

export const extensionExchangeContextWriteExtensions: ExchangeContextWriteExtensions = {
  // No middleware yet — the web app's registry-sync/legacy-cleanup
  // middleware in writeExtensions.ts is real account/token registry logic
  // not yet relevant here (Stage 1 has a stub, addressless wallet source).
  persist: (_prev, next, info) => {
    if (!info.changed) return;
    try {
      const serialized = stringifyWithBigInt(next);
      // Fire-and-forget, same as the web app's own persist (a sync
      // function wrapping an underlying async/sync write either way) —
      // chrome.storage.local.set() returns a Promise but nothing here
      // needs to await it.
      void chrome.storage.local.set({ [STORAGE_KEY]: serialized }).catch((error) => {
        // Best-effort — a write failure (quota, disabled storage) shouldn't
        // break the extension; the in-memory value still works this session.
        // eslint-disable-next-line no-console
        console.error('[exchangeContextStorage] failed to persist ExchangeContext:', error);
      });
    } catch (error) {
      // stringifyWithBigInt itself throwing (a genuinely unserializable
      // value, e.g. a function or circular reference somehow present) —
      // same "log loudly, don't break the extension" reasoning as above.
      // eslint-disable-next-line no-console
      console.error('[exchangeContextStorage] failed to serialize ExchangeContext for persistence:', error);
    }
  },
};
