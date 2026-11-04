// File: src/publishedProfiles.ts
//
// 2026-11-04 (owner rule: no merit app depends on another): the profile of an account edited in this wallet is kept HERE, on this device (chrome.storage.local), and registered with the feeds as that account's own account.json, the same way the bundled data is. Every reader (the
// header, the list, the details form) then answers from the device with no request, and the avatar is kept the same way in the image cache. The account service is asked for one thing only: to publish.
import { registerBundledFeeds, blobToDataUrl } from '@sponsorcoin/spcoin-feeds/shared';
import { getAccountAvatarURL } from '@sponsorcoin/spcoin-feeds/accounts';
import { engineTrace, loadAccountRecord } from '@sponsorcoin/spcoin-exchange-engine';
import { getCachedAccountIconDataUrl } from './accountIconCache';

export interface PublishedProfile {
  name?: string;
  symbol?: string;
  website?: string;
  description?: string;
  email?: string;
}

const KEY = 'spcoin_published_profiles';

async function readAll(): Promise<Record<string, PublishedProfile>> {
  const stored = (await chrome.storage.local.get(KEY))[KEY];
  return stored && typeof stored === 'object' ? (stored as Record<string, PublishedProfile>) : {};
}

function accountJson(address: string, profile: PublishedProfile): Record<string, unknown> {
  return { address: address.toLowerCase(), name: profile.name ?? '', symbol: profile.symbol ?? '', email: profile.email ?? '', website: profile.website ?? '', description: profile.description ?? '', recipientNetwork: [] };
}

function register(address: string, profile: PublishedProfile): void {
  registerBundledFeeds({ [`/assets/accounts/${address.toLowerCase()}/account.json`]: accountJson(address, profile) });
}

/** At startup: every profile edited in this wallet is registered, laid over the bundle's. */
export async function registerLocalProfiles(): Promise<void> {
  const all = await readAll().catch(() => ({}) as Record<string, PublishedProfile>);
  for (const [address, profile] of Object.entries(all)) register(address, profile);
}

/** Keep a profile on this device and make every reader see it now. */
export async function saveLocalProfile(address: string, profile: PublishedProfile): Promise<void> {
  const all = await readAll();
  all[address.toLowerCase()] = profile;
  await chrome.storage.local.set({ [KEY]: all });
  register(address, profile);
  // the engine's record cache takes the new record; a change is announced and whatever shows the record reads it again
  const record = await loadAccountRecord(address, { forceRefresh: true }).catch(() => undefined);
  engineTrace('profiles: saved on device, record cache read', { address, name: profile.name, symbol: profile.symbol, recordName: (record as { name?: string } | undefined)?.name });
}

/** The account's avatar as the image cache holds it: the one way every screen reads one. */
export function readAvatar(address: string): Promise<string | undefined> {
  return getCachedAccountIconDataUrl(getAccountAvatarURL(address), '').catch(() => undefined);
}

/** Keep the picked avatar in the image cache (the put tells whatever shows it). */
export async function saveLocalAvatar(address: string, file: Blob): Promise<void> {
  await getCachedAccountIconDataUrl.put(getAccountAvatarURL(address), await blobToDataUrl(file));
}

/**
 * 2026-11-04 (owner clarification: the server, Local or Prod, is the required server for every app, not a merit app): the server's copy of an account's profile and avatar refreshes this device's copy. What differs is saved (profile) or put (avatar), so every reader, which only reads
 * the device's copy, sees it; a server that does not answer changes nothing and nothing is emptied. Returns true when the profile text changed.
 */
export async function syncFromServer(address: string, serverUrl: string): Promise<boolean> {
  if (!serverUrl) return false;
  let changed = false;
  try {
    const response = await fetch(`${serverUrl}/api/spCoin/accounts/${encodeURIComponent(address)}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const data = ((await response.json()) as { data?: Record<string, unknown> }).data ?? {};
      const pick = (field: string): string | undefined => (typeof data[field] === 'string' && (data[field] as string).trim() ? (data[field] as string).trim() : undefined);
      const profile: PublishedProfile = { name: pick('name'), symbol: pick('symbol'), website: pick('website'), description: pick('description'), email: pick('email') };
      if (Object.values(profile).some(Boolean) && JSON.stringify((await readAll())[address.toLowerCase()]) !== JSON.stringify(profile)) {
        await saveLocalProfile(address, profile);
        changed = true;
      }
    }
  } catch {
    // the server does not answer: the device's copy stands
  }
  try {
    const path = getAccountAvatarURL(address);
    const response = await fetch(`${serverUrl}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const dataUrl = await blobToDataUrl(await response.blob());
      if ((await getCachedAccountIconDataUrl(path, '').catch(() => undefined)) !== dataUrl) await getCachedAccountIconDataUrl.put(path, dataUrl);
    }
  } catch {
    // same: nothing changes
  }
  return changed;
}
