// File: exchangeContext/exchangeContextFeed.ts
//
// 2026-09-17, Phase A of the ExchangeContext unification stage (see
// docs/npmMigrationDesign.md in the web app repo) — a minimal read-only
// client for GET /api/exchangeContext?key=<address>, proving a standalone
// consumer (the extension) can reach the server's content-hash check
// cross-origin. NOT yet wired into any real UI state — that's Phase B
// (extracting the real ExchangeContext runtime into
// @sponsorcoin/spcoin-exchange-engine) and Phase C (the write path).
//
// `apiCoreSyncedMembers` is deliberately typed as `unknown`, not the real
// `APICoreSyncedMembers` shape — this package has zero dependency on
// @sponsorcoin/spcoin-common by design (see this package's own
// package.json description: "zero wagmi/viem transitive weight"), and
// Phase A only needs `contentHash`, not the structured content. A real
// typed consumer (Phase B's extracted runtime) imports the real shape
// from spcoin-common directly instead of through here.
//
// Also deliberately NOT round-tripping BigInt-wrapped fields correctly
// yet: the server serializes `apiCoreSyncedMembers` via serializeWithBigInt
// (wrapped strings like "BigInt(0)"), and this function's plain
// `response.json()` (via fetchJson) leaves those as literal strings, not
// real bigints. Harmless for Phase A (the field is unconsumed, typed
// `unknown`) — Phase B's real runtime will need its own BigInt-aware
// deserialization step before treating this payload as real
// APICoreSyncedMembers data.
import { fetchJson } from '../shared/fetchJson';
import type { FetchJsonConfig } from '../shared/fetchJson';

export interface ExchangeContextEntry {
  apiCoreSyncedMembers: unknown;
  updatedAt: number;
  revision: number;
  /** SHA-256 of the server's canonical serialization — see the web app's own contentHash.ts. */
  contentHash: string;
  source?: string;
}

/**
 * GET /api/exchangeContext?key=<address> — read-only, unauthenticated by
 * design (the web app's own route.ts: "reading isn't the sensitive
 * operation"). Requires the caller's origin to be allow-listed
 * server-side (MERIT_EXTENSION_ORIGIN) when called cross-origin — see
 * the web app's exchangeContextCors.ts.
 */
export async function fetchExchangeContextEntry(
  key: string,
  config?: FetchJsonConfig,
): Promise<ExchangeContextEntry> {
  return fetchJson<ExchangeContextEntry>(`/api/exchangeContext?key=${encodeURIComponent(key)}`, config);
}
