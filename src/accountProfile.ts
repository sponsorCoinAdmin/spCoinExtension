// File: src/accountProfile.ts
//
// 2026-10-15 (docs/design/spcoinPackagesDesign.txt 8.5.6) -- the extension's PROFILE LOADER, the variant it injects into the engine provider (ExchangeProviderHost.loadAccountProfile): the name, symbol, website, description, email and avatar of an account,
// by its address, from the extension's own data (spcoin-feeds over its bundle). The provider calls it once for the active account whichever wallet holds it; this replaces the separate hydrator component the extension used to mount. The web app injects nothing:
// its default loader reads the hosted account files.
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { fetchAccountMetadata, getAccountAvatarURL } from '@sponsorcoin/spcoin-feeds/accounts';

export async function loadExtensionAccountProfile(address: string, baseUrl: string): Promise<Partial<spCoinAccount>> {
  const metadata = await fetchAccountMetadata(address, { baseUrl }).catch(() => null);
  const profile: Partial<spCoinAccount> = { logoURL: `${baseUrl}${getAccountAvatarURL(address)}` };
  // only what is known: an unknown field must not blank what the account already has
  if (metadata?.name) profile.name = metadata.name;
  if (metadata?.symbol) profile.symbol = metadata.symbol;
  if (metadata?.website) profile.website = metadata.website;
  if (metadata?.description) profile.description = metadata.description;
  if (metadata?.email) profile.email = metadata.email;
  return profile;
}
