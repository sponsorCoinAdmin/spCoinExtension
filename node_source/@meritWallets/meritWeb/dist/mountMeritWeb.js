import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import MeritWalletBrowser from './MeritWalletBrowser';
import { MeritWalletType, domPlatform } from '@sponsorcoin/merit-wallet';
import { resolveWalletType } from './walletType';
import { disableBrowserZoom } from './disableBrowserZoom';
import { recordPopupTimeline } from './popupLog';
import { mountPiecesFromInjectables } from './injectables';
export function mountMeritWeb({ element, core, snapshot, injectables, walletType, platform, onClose, configTestAccountsContent, configTestSitesContent }) {
    // 2026-11-25 (owner): no browser pinch zoom; the wallet's own pinch (Display Size, Meta Table Size) still works
    disableBrowserZoom();
    // 2026-11-26 (owner): a window opened by another page records what it does in its first seconds (see popupLog.ts)
    recordPopupTimeline();
    // 2026-11-26 (owner: "just do your best estimate and open once, stop the flashing"): a window opened from Config -> Test Sites is NOT resized, hidden or measured. It only tells the opener where it landed (rq = the width the opener asked window.open for), so the opener's estimate for the next window gets better.
    try {
        const requested = Number(new URLSearchParams(window.location.search).get('rq'));
        if (window.opener && requested > 0) {
            const openedAt = Math.round(window.innerWidth * (window.devicePixelRatio || 1));
            window.setTimeout(() => {
                try {
                    window.opener?.postMessage({ type: 'merit-window-calibration', requested, physical: openedAt }, '*');
                }
                catch {
                    /* no opener to tell */
                }
            }, 400);
        }
    }
    catch {
        /* nothing to report */
    }
    const injected = mountPiecesFromInjectables(injectables);
    const type = MeritWalletType[resolveWalletType(walletType ?? injected.walletType)];
    const platformOptions = injected.platform || platform ? { ...injected.platform, ...platform } : undefined;
    const merged = platformOptions ? { ...domPlatform, ...platformOptions } : undefined;
    const close = onClose ?? injected.onClose;
    // the wallet fills its window, side to side and top to bottom, with square corners: the holding container is the one that rounds them
    createRoot(element).render(_jsx("div", { style: { height: '100%' }, children: _jsx(MeritWalletBrowser, { core: core, walletType: type, platform: merged, docked: true, fullWidth: true, data: snapshot, configTestAccountsContent: configTestAccountsContent, configTestSitesContent: configTestSitesContent, onClose: close ?? (() => undefined) }) }));
}
