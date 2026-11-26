import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import MeritWalletBrowser from './MeritWalletBrowser';
import { MeritWalletType, domPlatform } from '@sponsorcoin/merit-wallet';
import { resolveWalletType } from './walletType';
import { disableBrowserZoom } from './disableBrowserZoom';
import { resizeWindowToPixelWidth, readWindowPixelsPerUnit } from '@sponsorcoin/spcoin-panels';
import { mountPiecesFromInjectables } from './injectables';
export function mountMeritWeb({ element, core, snapshot, injectables, walletType, platform, onClose, configTestAccountsContent, configTestSitesContent }) {
    // 2026-11-25 (owner): no browser pinch zoom; the wallet's own pinch (Display Size, Meta Table Size) still works
    disableBrowserZoom();
    // 2026-11-26 (owner): a test-site window opened with ?pw=<screen pixels> (Config -> Test Sites) sizes itself to exactly that viewport width, the unit Pixel Width shows.
    // The page stays hidden until it has settled, and the opener is told what its request produced (rq = the width it asked for) so the next window opens at the right size and needs no resize.
    try {
        const params = new URLSearchParams(window.location.search);
        const pw = Number(params.get('pw'));
        if (window.opener && pw > 0) {
            const root = document.documentElement;
            const openedAt = Math.round(window.innerWidth * (window.devicePixelRatio || 1));
            const requested = Number(params.get('rq'));
            root.style.visibility = 'hidden';
            const reveal = () => { root.style.visibility = ''; };
            const failsafe = window.setTimeout(reveal, 2500);
            void resizeWindowToPixelWidth(pw).then(() => {
                window.clearTimeout(failsafe);
                reveal();
                const pixelsPerUnit = readWindowPixelsPerUnit();
                if (pixelsPerUnit && requested > 0) {
                    try {
                        window.opener.postMessage({ type: 'merit-window-calibration', pixelsPerUnit, requested, physical: openedAt }, '*');
                    }
                    catch {
                        /* no opener to tell */
                    }
                }
            });
        }
    }
    catch {
        /* no window to size */
    }
    const injected = mountPiecesFromInjectables(injectables);
    const type = MeritWalletType[resolveWalletType(walletType ?? injected.walletType)];
    const platformOptions = injected.platform || platform ? { ...injected.platform, ...platform } : undefined;
    const merged = platformOptions ? { ...domPlatform, ...platformOptions } : undefined;
    const close = onClose ?? injected.onClose;
    // the wallet fills its window, side to side and top to bottom, with square corners: the holding container is the one that rounds them
    createRoot(element).render(_jsx("div", { style: { height: '100%' }, children: _jsx(MeritWalletBrowser, { core: core, walletType: type, platform: merged, docked: true, fullWidth: true, data: snapshot, configTestAccountsContent: configTestAccountsContent, configTestSitesContent: configTestSitesContent, onClose: close ?? (() => undefined) }) }));
}
