import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';
export const DEFAULT_ACCOUNT_LOGO_URL = ANONYMOUS_ACCOUNT_AVATAR_URL; // single source: spcoin-feeds
export const LOGO_TARGET_WIDTH_PX = 400;
export const LOGO_TARGET_HEIGHT_PX = 400;
export const LOGO_MAX_OUTPUT_BYTES = 500 * 1024;
export const LOGO_MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const EMPTY_FORM_DATA = {
    name: '',
    symbol: '',
    email: '',
    website: '',
    description: '',
    recipientNetwork: [],
};
export const FORM_FIELDS = [
    'name',
    'symbol',
    'email',
    'website',
    'description',
];
export const FORM_ERROR_FOCUS_ORDER = [
    'name',
    'symbol',
    'email',
    'website',
    'description',
];
export const FIELD_MAX_LENGTHS = {
    name: 50,
    symbol: 10,
    email: 256,
    website: 256,
    description: 1024,
};
export const FIELD_TITLES = {
    publicKey: 'Required Account on a connected Metamask Account.',
    name: 'Account Name, Do Not use a personal name',
    symbol: 'Account Symbol',
    email: 'Account Email',
    website: 'Accounts Website',
    description: 'Account Description',
};
export const FIELD_PLACEHOLDERS = {
    publicKey: 'Required Account on a connected Metamask Account.',
    name: 'Account Name Title, Example: "Save the World"',
    symbol: 'Account Symbol, For Example "WORLD"',
    email: 'Account Email, do not use a personal Email',
    website: 'Accounts Website URL',
    description: 'Account Description',
};
export function normalizeAddress(value) {
    return `0x${String(value).replace(/^0[xX]/, '').toLowerCase()}`;
}
export function ensureAbsoluteAssetURL(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed)
        return DEFAULT_ACCOUNT_LOGO_URL;
    if (trimmed.startsWith('/'))
        return trimmed;
    if (trimmed.startsWith('assets/'))
        return `/${trimmed}`;
    return trimmed;
}
// withCacheBust lives in the engine (the account list uses it too); re-exported for the form.
export { withCacheBust } from '@sponsorcoin/spcoin-exchange-engine';
export function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function isValidWebsite(value) {
    if (!value)
        return true;
    if (value.startsWith('/assets/') || value.startsWith('assets/'))
        return true;
    try {
        const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
            ? value
            : `https://${value}`;
        const url = new URL(candidate);
        const hostname = String(url.hostname || '').toLowerCase();
        const hasDot = hostname.includes('.');
        return /^https?:$/i.test(url.protocol) && hasDot;
    }
    catch {
        return false;
    }
}
export function toPreviewHref(field, rawValue) {
    const value = String(rawValue ?? '').trim();
    if (!value)
        return null;
    if (field === 'email') {
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return emailOk ? `mailto:${value}` : null;
    }
    if (field === 'website') {
        if (value.startsWith('/assets/'))
            return value;
        if (value.startsWith('assets/'))
            return `/${value}`;
        try {
            const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
                ? value
                : `https://${value}`;
            const url = new URL(candidate);
            const hostname = String(url.hostname || '').toLowerCase();
            const hasDot = hostname.includes('.');
            if (!/^https?:$/i.test(url.protocol) || !hasDot)
                return null;
            return candidate;
        }
        catch {
            return null;
        }
    }
    return null;
}
export function getAbsoluteFieldError(field, rawValue) {
    const raw = String(rawValue ?? '');
    if (field === 'name' && raw.length > 50)
        return 'Name too large';
    if (field === 'symbol' && raw.length > 10)
        return 'Symbol too large';
    return null;
}
export function getFieldTooLargeMessage(field) {
    if (field === 'name')
        return 'Name too large';
    if (field === 'symbol')
        return 'Symbol too large';
    if (field === 'email')
        return 'Email too large';
    if (field === 'website')
        return 'Website too large';
    if (field === 'description')
        return 'Description too large';
    return null;
}
export function shouldBlockAdditionalInput(field, currentRawValue, nextRawValue) {
    const maxLen = FIELD_MAX_LENGTHS[field];
    if (!maxLen)
        return false;
    const currentLen = String(currentRawValue ?? '').length;
    const nextLen = String(nextRawValue ?? '').length;
    if (currentLen > maxLen)
        return nextLen >= currentLen;
    return nextLen > maxLen;
}
let textMeasureCtx = null;
export function shouldOpenLinkFromInputClick(input, value, event) {
    const raw = String(value ?? '');
    if (!raw)
        return false;
    const style = window.getComputedStyle(input);
    const paddingLeft = parseFloat(style.paddingLeft || '0') || 0;
    const paddingRight = parseFloat(style.paddingRight || '0') || 0;
    const font = style.font || `${style.fontSize} ${style.fontFamily}`;
    textMeasureCtx ?? (textMeasureCtx = document.createElement('canvas').getContext('2d'));
    const ctx = textMeasureCtx;
    if (!ctx)
        return false;
    ctx.font = font;
    const measured = ctx.measureText(raw).width;
    const textWidth = Math.min(measured, Math.max(0, input.clientWidth - paddingLeft - paddingRight));
    const rect = input.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    return clickX >= paddingLeft && clickX <= paddingLeft + textWidth;
}
export function trimForm(data) {
    return {
        name: data.name.trim(),
        symbol: data.symbol.trim(),
        email: data.email.trim(),
        website: data.website.trim(),
        description: data.description.trim(),
        recipientNetwork: Array.from(new Set((Array.isArray(data.recipientNetwork) ? data.recipientNetwork : [])
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value)))),
    };
}
