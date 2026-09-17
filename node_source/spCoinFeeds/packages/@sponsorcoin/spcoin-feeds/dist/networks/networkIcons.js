"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNetworkIconBlob = fetchNetworkIconBlob;
const fetchJson_1 = require("../shared/fetchJson");
/**
 * Real fetch for one network's logo (NetworkRecord.logoURL), prefixed with
 * config.baseUrl the same way every other fetcher in this package is.
 * Deliberately returns the raw Blob and nothing more — no persistence, no
 * data-URL conversion. A persistent cache (chrome.storage.local for the
 * extension, since its whole JS context — and any in-memory cache with it —
 * is torn down and rebuilt every time its side panel closes; a plain
 * in-memory MemoCache like this package's other fetchers use would cache
 * nothing real across that boundary) is a consumer concern, not this
 * package's — spcoin-feeds stays usable by the web app too, which has no
 * chrome.storage API at all.
 */
async function fetchNetworkIconBlob(logoURL, config) {
    var _a;
    const url = `${(_a = config === null || config === void 0 ? void 0 : config.baseUrl) !== null && _a !== void 0 ? _a : ''}${logoURL}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new fetchJson_1.FeedFetchError(`Request to ${url} failed with ${response.status}`, response.status, url);
    }
    return response.blob();
}
