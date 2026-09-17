import { type FetchJsonConfig } from '../shared/fetchJson';
/**
 * Real fetch for one account's avatar (AccountListRowData.avatarURL),
 * prefixed with config.baseUrl the same way every other fetcher in this
 * package is — mirrors networks/networkIcons.ts's fetchNetworkIconBlob
 * exactly (same reasoning: deliberately returns the raw Blob and nothing
 * more, no persistence/data-URL conversion, since that's a consumer
 * concern — chrome.storage.local for the extension, not this package's).
 */
export declare function fetchAccountAvatarBlob(avatarURL: string, config?: FetchJsonConfig): Promise<Blob>;
