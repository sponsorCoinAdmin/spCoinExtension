import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import MeritWalletBrowser from './MeritWalletBrowser';
import { MeritWalletType, domPlatform } from '@sponsorcoin/merit-wallet';
import { resolveWalletType } from './walletType';
import { mountPiecesFromInjectables } from './injectables';
export function mountMeritWeb({ element, core, snapshot, injectables, walletType, platform, onClose, configTestAccountsContent, configTestSitesContent }) {
    const injected = mountPiecesFromInjectables(injectables);
    const type = MeritWalletType[resolveWalletType(walletType ?? injected.walletType)];
    const platformOptions = injected.platform || platform ? { ...injected.platform, ...platform } : undefined;
    const merged = platformOptions ? { ...domPlatform, ...platformOptions } : undefined;
    const close = onClose ?? injected.onClose;
    // the wallet fills its window, side to side and top to bottom, with square corners: the holding container is the one that rounds them
    createRoot(element).render(_jsx("div", { style: { height: '100%' }, children: _jsx(MeritWalletBrowser, { core: core, walletType: type, platform: merged, docked: true, fullWidth: true, data: snapshot, configTestAccountsContent: configTestAccountsContent, configTestSitesContent: configTestSitesContent, onClose: close ?? (() => undefined) }) }));
}
