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

export class FeedFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'FeedFetchError';
  }
}

function buildUrl(path: string, baseUrl: string | undefined): string {
  const base = baseUrl ?? '';
  return `${base}${path}`;
}

export async function fetchJson<T>(
  path: string,
  config?: FetchJsonConfig,
  init?: RequestInit,
): Promise<T> {
  const url = buildUrl(path, config?.baseUrl);
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new FeedFetchError(`Request to ${url} failed with ${response.status}`, response.status, url);
  }
  return (await response.json()) as T;
}

/** Same as fetchJson, but resolves to null instead of throwing on a 404. */
export async function fetchJsonOrNull<T>(
  path: string,
  config?: FetchJsonConfig,
  init?: RequestInit,
): Promise<T | null> {
  const url = buildUrl(path, config?.baseUrl);
  const response = await fetch(url, init);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new FeedFetchError(`Request to ${url} failed with ${response.status}`, response.status, url);
  }
  return (await response.json()) as T;
}
