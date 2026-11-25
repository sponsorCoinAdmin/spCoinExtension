// File: src/reloadFromServer.ts
//
// 2026-11-20 (owner: "the refresh should force a reload from the server; can the browser cache be invalidated for this page when doing so?"): the header's refresh button reloads the wallet from the server, ignoring the browser's saved copy of the page.
// The page names the bundle that is current, so an old saved copy of it is how a phone keeps running old code after a deploy. Fetching the page with cache "reload" asks the server (no conditional request, no saved answer) and replaces the browser's saved copy; the reload
// that follows can then only be served the fresh page, which names the fresh bundle. Other files are named by content, so a new build means new names and nothing old is reused. The vault session survives a reload (the wallet comes back unlocked while its session key is valid).
export async function reloadFromServer(): Promise<void> {
  try {
    await fetch(window.location.href.split('#')[0], { cache: 'reload', credentials: 'same-origin' });
  } catch {
    /* offline or blocked: the reload below still asks the browser's own way */
  }
  window.location.reload();
}
