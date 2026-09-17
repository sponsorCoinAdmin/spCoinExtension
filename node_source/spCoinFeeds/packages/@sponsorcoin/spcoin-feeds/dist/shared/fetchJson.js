"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedFetchError = void 0;
exports.fetchJson = fetchJson;
exports.fetchJsonOrNull = fetchJsonOrNull;
class FeedFetchError extends Error {
    constructor(message, status, url) {
        super(message);
        this.status = status;
        this.url = url;
        this.name = 'FeedFetchError';
    }
}
exports.FeedFetchError = FeedFetchError;
function buildUrl(path, baseUrl) {
    const base = baseUrl !== null && baseUrl !== void 0 ? baseUrl : '';
    return `${base}${path}`;
}
async function fetchJson(path, config, init) {
    const url = buildUrl(path, config === null || config === void 0 ? void 0 : config.baseUrl);
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new FeedFetchError(`Request to ${url} failed with ${response.status}`, response.status, url);
    }
    return (await response.json());
}
/** Same as fetchJson, but resolves to null instead of throwing on a 404. */
async function fetchJsonOrNull(path, config, init) {
    const url = buildUrl(path, config === null || config === void 0 ? void 0 : config.baseUrl);
    const response = await fetch(url, init);
    if (response.status === 404)
        return null;
    if (!response.ok) {
        throw new FeedFetchError(`Request to ${url} failed with ${response.status}`, response.status, url);
    }
    return (await response.json());
}
