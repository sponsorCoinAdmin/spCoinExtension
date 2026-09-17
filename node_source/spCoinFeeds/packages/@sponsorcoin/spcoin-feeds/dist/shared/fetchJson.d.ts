/**
 * Every feed fetcher goes through this instead of calling fetch() directly.
 * baseUrl defaults to '' (same-origin — the web app's own case); the
 * extension (or any other future consumer) passes an absolute origin, per
 * extensionPlan.md §2.5's "Route Handlers, called via plain fetch()... given
 * an absolute URL instead of a relative one" reasoning.
 */
export interface FetchJsonConfig {
    baseUrl?: string;
}
export declare class FeedFetchError extends Error {
    readonly status: number;
    readonly url: string;
    constructor(message: string, status: number, url: string);
}
export declare function fetchJson<T>(path: string, config?: FetchJsonConfig, init?: RequestInit): Promise<T>;
/** Same as fetchJson, but resolves to null instead of throwing on a 404. */
export declare function fetchJsonOrNull<T>(path: string, config?: FetchJsonConfig, init?: RequestInit): Promise<T | null>;
