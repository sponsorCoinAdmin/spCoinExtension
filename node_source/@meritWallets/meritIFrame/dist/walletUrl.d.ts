/** The wallet address to frame: `configured` (a full http or https address, or a path inside the host's own files), unless the page's query asks for a local port. A configured value that is not a valid http(s) address falls back to `fallback`. */
export declare function resolveWalletUrl(configured: string | undefined, fallback: string, search: string): string;
/** The parent page origins a wallet page accepts, from a comma-separated list (for example a build-time value). Anything that is not an http(s) origin is dropped. */
export declare function parseAllowedParents(list: string | undefined, fallback: string[]): string[];
