// File: src/platform/domPlatform.ts
//
// 2026-10-15 -- the DOM implementation of the platform interface (./platform.ts): what every browser host (the web app, the Chrome extension, an Android or phone WebView) uses unless it injects its own. This folder is the ONE place in the component package that
// touches window, document, navigator and localStorage for the platform's jobs (test/platformBoundary.test.mjs allows them here and nowhere else).
import { IMAGE_CACHE_UPDATED_EVENT } from '@sponsorcoin/spcoin-feeds/shared';
import { ACCOUNT_REGISTRY_UPDATED_EVENT } from '@sponsorcoin/spcoin-exchange-engine';
export const domPlatform = {
    async copyText(text) {
        await navigator.clipboard.writeText(text);
    },
    openUrl(url, options) {
        if (options?.sameTab)
            window.location.href = url;
        else
            window.open(url, '_blank', 'noopener,noreferrer');
    },
    saveFile(name, content, mimeType) {
        const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    storage: {
        get(key) {
            try {
                return localStorage.getItem(key);
            }
            catch {
                return null;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, value);
            }
            catch {
                /* storage may be unavailable: the preference lasts for this session only */
            }
        },
    },
    isHidden: () => typeof document !== 'undefined' && document.hidden,
    onVisibilityChange(listener) {
        if (typeof document === 'undefined')
            return () => undefined;
        document.addEventListener('visibilitychange', listener);
        return () => document.removeEventListener('visibilitychange', listener);
    },
    onForeground(listener) {
        if (typeof window === 'undefined')
            return () => undefined;
        window.addEventListener('focus', listener);
        return () => window.removeEventListener('focus', listener);
    },
    portalContainer: () => (typeof document === 'undefined' ? null : document.body),
    onImageCacheUpdated(listener) {
        if (typeof window === 'undefined')
            return () => undefined;
        window.addEventListener(IMAGE_CACHE_UPDATED_EVENT, listener);
        return () => window.removeEventListener(IMAGE_CACHE_UPDATED_EVENT, listener);
    },
    onAccountRecordUpdated(listener) {
        if (typeof window === 'undefined')
            return () => undefined;
        const handler = (event) => listener(String(event.detail?.address ?? ''));
        window.addEventListener(ACCOUNT_REGISTRY_UPDATED_EVENT, handler);
        return () => window.removeEventListener(ACCOUNT_REGISTRY_UPDATED_EVENT, handler);
    },
};
