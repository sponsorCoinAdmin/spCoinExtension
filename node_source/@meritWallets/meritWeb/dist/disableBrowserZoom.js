// File: node_source/@meritWallets/meritWeb/src/disableBrowserZoom.ts
//
// 2026-11-25 (owner): the browser's own pinch-to-zoom is OFF for the wallet. The only pinch the wallet answers is its own (a two-finger pinch on a header bar changes the Display Size, on the meta table the Meta Table Size): those are handled by the wallet's own touch code, not by the browser's page zoom.
//   - touch-action: pan-x pan-y on the page  -> the browser never starts a pinch zoom (or double-tap zoom); one-finger scrolling still works
//   - gesturestart / gesturechange (Safari)  -> prevented, Safari ignores touch-action for page pinch
//   - ctrl + wheel (a laptop trackpad pinch) -> prevented
// Called once by mountMeritWeb, which every wallet host (browser, extension, device packages) mounts through.
let installed = false;
export function disableBrowserZoom(doc = document) {
    if (installed || typeof doc === 'undefined')
        return;
    installed = true;
    try {
        const style = doc.createElement('style');
        style.setAttribute('data-merit-no-browser-zoom', '');
        style.textContent = 'html, body { touch-action: pan-x pan-y; }';
        doc.head.appendChild(style);
        // the hosting page may have no viewport tag at all (the extension's wallet.html): one is added
        let viewport = doc.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = doc.createElement('meta');
            viewport.setAttribute('name', 'viewport');
            doc.head.appendChild(viewport);
        }
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        const stop = (event) => event.preventDefault();
        doc.addEventListener('gesturestart', stop, { passive: false });
        doc.addEventListener('gesturechange', stop, { passive: false });
        doc.addEventListener('wheel', (event) => { if (event.ctrlKey)
            event.preventDefault(); }, { passive: false });
    }
    catch {
        // a host without a document (tests) has nothing to disable
    }
}
