// File: src/platform/domPlatform.ts
//
// 2026-10-15 -- the DOM implementation of the platform interface (./platform.ts): what every browser host (the web app, the Chrome extension, an Android or phone WebView) uses unless it injects its own. This folder is the ONE place in the component package that
// touches window, document, navigator and localStorage for the platform's jobs (test/platformBoundary.test.mjs allows them here and nowhere else).
import { IMAGE_CACHE_UPDATED_EVENT } from '@sponsorcoin/spcoin-feeds/shared';
import { ACCOUNT_REGISTRY_UPDATED_EVENT } from '@sponsorcoin/spcoin-exchange-engine';
import type { MeritPlatform } from './platform';

export const domPlatform: MeritPlatform = {
  async copyText(text) {
    // 2026-11-27 (owner: Copy did nothing on the iPhone): iOS Safari only copies inside the press itself, and the clipboard API there needs a moment that has passed once anything is awaited. So the old way (a field, a selection, a copy command), which is synchronous, goes FIRST; the clipboard API is the second try.
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '0';
    field.style.left = '0';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    field.remove();
    if (ok) return;
    await navigator.clipboard.writeText(text);
  },
  async clearClipboard(text, replacement = '') {
    let holdsOther = false;
    try {
      const state = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
      // only read it when that needs no question to the person; otherwise clear without looking
      if (state.state === 'granted') holdsOther = (await navigator.clipboard.readText()) !== text;
    } catch {
      /* not readable: clear anyway */
    }
    if (holdsOther) return;
    await navigator.clipboard.writeText(replacement);
  },
  openUrl(url, options) {
    if (options?.sameTab) window.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
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
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage may be unavailable: the preference lasts for this session only */
      }
    },
  },
  isHidden: () => typeof document !== 'undefined' && document.hidden,
  onVisibilityChange(listener) {
    if (typeof document === 'undefined') return () => undefined;
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  },
  onForeground(listener) {
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener('focus', listener);
    return () => window.removeEventListener('focus', listener);
  },
  portalContainer: () => (typeof document === 'undefined' ? null : document.body),
  onImageCacheUpdated(listener) {
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener(IMAGE_CACHE_UPDATED_EVENT, listener);
    return () => window.removeEventListener(IMAGE_CACHE_UPDATED_EVENT, listener);
  },
  onAccountRecordUpdated(listener) {
    if (typeof window === 'undefined') return () => undefined;
    const handler = (event: Event) => listener(String((event as CustomEvent<{ address?: string }>).detail?.address ?? ''));
    window.addEventListener(ACCOUNT_REGISTRY_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ACCOUNT_REGISTRY_UPDATED_EVENT, handler);
  },
  onHotkey(chord, listener) {
    if (typeof window === 'undefined') return () => undefined;
    const parts = chord.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const wants = { ctrl: parts.includes('ctrl'), alt: parts.includes('alt'), shift: parts.includes('shift') };
    const handler = (event: KeyboardEvent) => {
      // event.code, not event.key: with Ctrl+Alt (AltGr on some layouts) the character typed is not the letter
      const pressed = event.code === `Key${key.toUpperCase()}` || event.key?.toLowerCase() === key;
      if (pressed && event.ctrlKey === wants.ctrl && event.altKey === wants.alt && event.shiftKey === wants.shift) {
        event.preventDefault();
        listener();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  },
  onDeviceError(listener) {
    if (typeof window === 'undefined') return () => undefined;
    const text = (value: unknown): string => {
      if (value instanceof Error) return `${value.name}: ${value.message} ${(value.stack ?? '').split(String.fromCharCode(10)).slice(1, 7).join(' | ')}`;
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value) ?? String(value);
      } catch {
        return String(value);
      }
    };
    const onError = (event: ErrorEvent) => listener('error', event.error ? text(event.error) : `${event.message} (${event.filename}:${event.lineno})`);
    const onRejection = (event: PromiseRejectionEvent) => listener('rejection', text(event.reason));
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    const original = console.error;
    console.error = (...args: unknown[]) => {
      listener('console.error', args.map(text).join(' ').slice(0, 1500));
      original.apply(console, args as never);
    };
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      if (console.error !== original) console.error = original;
    };
  },
  deviceInfo(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    return {
      // the offset only EXPLAINS a difference between two dumps; no reward figure reads it
      utcOffsetMinutes: String(-new Date().getTimezoneOffset()),
      userAgent: navigator.userAgent,
      window: `${window.innerWidth}x${window.innerHeight}`,
      page: window.location.origin + window.location.pathname,
    };
  },
};
