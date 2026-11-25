// File: src/walletUrl.ts
//
// 2026-11-25 (owner: build meritIFrame so a real host can use it): which wallet page the frame loads. A host sets the address once (an environment value at build time, for example https://sponsorcoin.org/); a TEST page may point at another local wallet
// with ?wallet=PORT (digits only, always http://localhost, so a link can never send the frame to another site). Pure: no imports.
/** A path inside the host's own files: no scheme, not //host (protocol-relative: another site), no backslash, no spaces. */
function isOwnPath(value) {
    if (value.startsWith('//') || value.includes('\\') || /\s/.test(value))
        return false;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value))
        return false;
    return !value.includes(':');
}
/** The wallet address to frame: `configured` (a full http or https address, or a path inside the host's own files), unless the page's query asks for a local port. A configured value that is not a valid http(s) address falls back to `fallback`. */
export function resolveWalletUrl(configured, fallback, search) {
    const port = new URLSearchParams(search).get('wallet') ?? '';
    if (/^\d{2,5}$/.test(port) && Number(port) >= 1 && Number(port) <= 65535)
        return `http://localhost:${Number(port)}/`;
    const value = (configured ?? '').trim();
    if (!value)
        return fallback;
    // a path inside the host's own files (a wallet page bundled with the host): ./wallet/index.html or /wallet/index.html. Never a scheme, never //host (another site), never a backslash (the address parser treats it as a slash)
    if (isOwnPath(value))
        return value;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : fallback;
    }
    catch {
        return fallback;
    }
}
/** The parent page origins a wallet page accepts, from a comma-separated list (for example a build-time value). Anything that is not an http(s) origin is dropped. */
export function parseAllowedParents(list, fallback) {
    const out = (list ?? '').split(',').map((s) => s.trim()).filter(Boolean).flatMap((s) => {
        try {
            const u = new URL(s);
            return u.protocol === 'http:' || u.protocol === 'https:' ? [u.origin] : [];
        }
        catch {
            return [];
        }
    });
    return out.length ? out : fallback;
}
