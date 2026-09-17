import { FeedFetchError, type FetchJsonConfig } from '../shared/fetchJson';

/**
 * Real fetch for one token's logo (TokenRecord.logoURL), prefixed with
 * config.baseUrl the same way every other fetcher in this package is —
 * mirrors networks/networkIcons.ts's fetchNetworkIconBlob and accounts/
 * accountIcons.ts's fetchAccountAvatarBlob exactly (same reasoning:
 * deliberately returns the raw Blob and nothing more, no persistence/
 * data-URL conversion, since that's a consumer concern).
 */
export async function fetchTokenIconBlob(logoURL: string, config?: FetchJsonConfig): Promise<Blob> {
  const url = `${config?.baseUrl ?? ''}${logoURL}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new FeedFetchError(`Request to ${url} failed with ${response.status}`, response.status, url);
  }
  return response.blob();
}
