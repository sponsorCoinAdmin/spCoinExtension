"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAccountAvatarBlob = fetchAccountAvatarBlob;
const fetchJson_1 = require("../shared/fetchJson");
/**
 * Real fetch for one account's avatar (AccountListRowData.avatarURL),
 * prefixed with config.baseUrl the same way every other fetcher in this
 * package is — mirrors networks/networkIcons.ts's fetchNetworkIconBlob
 * exactly (same reasoning: deliberately returns the raw Blob and nothing
 * more, no persistence/data-URL conversion, since that's a consumer
 * concern — chrome.storage.local for the extension, not this package's).
 */
async function fetchAccountAvatarBlob(avatarURL, config) {
    var _a;
    const url = `${(_a = config === null || config === void 0 ? void 0 : config.baseUrl) !== null && _a !== void 0 ? _a : ''}${avatarURL}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new fetchJson_1.FeedFetchError(`Request to ${url} failed with ${response.status}`, response.status, url);
    }
    return response.blob();
}
