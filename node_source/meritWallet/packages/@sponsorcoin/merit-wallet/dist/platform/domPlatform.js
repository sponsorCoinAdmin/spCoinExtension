// File: src/platform/domPlatform.ts
//
// 2026-10-15 -- the DOM implementation of the platform interface (./platform.ts): what every browser host (the web app, the Chrome extension, an Android or phone WebView) uses unless it injects its own. This folder is the ONE place in the component package that
// touches window, document, navigator and localStorage for the platform's jobs (test/platformBoundary.test.mjs allows them here and nowhere else).
import { IMAGE_CACHE_UPDATED_EVENT } from '@sponsorcoin/spcoin-feeds/shared';
import { ACCOUNT_REGISTRY_UPDATED_EVENT } from '@sponsorcoin/spcoin-exchange-engine';
export const domPlatform = {
    async copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
        }
        catch (error) {
            // 2026-11-11: the clipboard API refuses when the page is not focused or the press is too old (a copy that waited for the vault): the old way, a hidden field and a copy command, still works from a press
            const field = document.createElement('textarea');
            field.value = text;
            field.setAttribute('readonly', '');
            field.style.position = 'fixed';
            field.style.opacity = '0';
            document.body.appendChild(field);
            field.select();
            const ok = document.execCommand('copy');
            field.remove();
            if (!ok)
                throw error;
        }
    },
    async clearClipboard(text, replacement = '') {
        let holdsOther = false;
        try {
            const state = await navigator.permissions.query({ name: 'clipboard-read' });
            // only read it when that needs no question to the person; otherwise clear without looking
            if (state.state === 'granted')
                holdsOther = (await navigator.clipboard.readText()) !== text;
        }
        catch {
            /* not readable: clear anyway */
        }
        if (holdsOther)
            return;
        await navigator.clipboard.writeText(replacement);
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
