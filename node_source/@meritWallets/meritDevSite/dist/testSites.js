// File: src/testSites.ts
//
// 2026-11-24 (owner: a "Test Sites" panel in the Config tab): the pure part, no React and no window: what the fields may hold, the link they build, and the window features for opening it. The section component (TestSitesSection.tsx) is only the form around these.
// Test code: it lives in the test project and never in a release (README).
export const TEST_SITE_PROTOCOLS = ['http', 'https'];
/** The wallet types a test site may be asked to show (the iframe harness's type picker). '' = not asked. */
export const TEST_SITE_TYPES = ['WEB', 'WEB_APP', 'EXT', 'ANDROID', 'IPHONE'];
/** The defaults the owner asked for: https, localhost, port 3101, height as tall as the screen. */
export const DEFAULT_TEST_SITE = { protocol: 'http', host: 'localhost', port: '3101', width: '460', height: 'max', type: '', compare: false, log: false };
const MIN_SIZE = 200;
const MAX_SIZE = 4000;
/** The port box takes digits only. */
export function digitsOnly(text) {
    return text.replace(/\D/g, '');
}
const HOST_NAME = /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/;
const HOST_IPV6 = /^\[[0-9A-Fa-f:]+\]$/;
/** Why the fields do not make a link yet, or undefined when they do. */
export function testSiteProblem(form) {
    if (!TEST_SITE_PROTOCOLS.includes(form.protocol))
        return 'Pick https or http.';
    const host = form.host.trim();
    if (!host)
        return 'Type a host name.';
    if (!HOST_NAME.test(host) && !HOST_IPV6.test(host))
        return 'The host name may hold letters, digits, dots and dashes (or an IPv6 address in [brackets]).';
    if (!/^\d+$/.test(form.port))
        return 'Type a port number.';
    const port = Number(form.port);
    if (port < 1 || port > 65535)
        return 'The port must be from 1 to 65535.';
    if (!/^\d+$/.test(form.width) || Number(form.width) < MIN_SIZE || Number(form.width) > MAX_SIZE)
        return `The width must be from ${MIN_SIZE} to ${MAX_SIZE}.`;
    const height = form.height.trim().toLowerCase();
    if (height !== 'max' && (!/^\d+$/.test(height) || Number(height) < MIN_SIZE || Number(height) > MAX_SIZE))
        return `The height must be max, or from ${MIN_SIZE} to ${MAX_SIZE}.`;
    if (form.type !== '' && !TEST_SITE_TYPES.includes(form.type))
        return 'Pick one of the wallet types, or none.';
    return undefined;
}
/** The link the fields build, or undefined while they are not valid. */
export function buildTestSiteUrl(form) {
    if (testSiteProblem(form))
        return undefined;
    const query = [];
    if (form.type)
        query.push(`type=${form.type}`);
    if (form.compare)
        query.push('compare=1');
    if (form.log)
        query.push('log=1');
    return `${form.protocol}://${form.host.trim()}:${Number(form.port)}/${query.length ? `?${query.join('&')}` : ''}`;
}
/** Chrome's extra 17 units of viewport width on a popup (seen on Windows Chrome: asking for 300 gives a viewport of 317). */
export const POPUP_WIDTH_OFFSET = 17;
/**
 * The width to ask window.open for so the window opens at `target` SCREEN pixels, in ONE open (2026-11-26, owner: "do your best estimate and open once"):
 * target / scale - offset, where scale is what an earlier window measured, or this page's devicePixelRatio until one has (exact at 100% browser zoom, close otherwise).
 */
export function requestedWindowWidth(target, pixelRatio, calibration) {
    const scale = calibration && calibration.pixelsPerUnit > 0 ? calibration.pixelsPerUnit : pixelRatio > 0 ? pixelRatio : 1;
    const offset = calibration ? calibration.offset : POPUP_WIDTH_OFFSET;
    return Math.max(1, Math.round(target / scale - offset));
}
/** A calibration from the message a window sent (merit-window-calibration: the width asked for and the screen pixels it landed at), or undefined when it is not a sane one. */
export function calibrationFromMessage(data) {
    const d = data;
    if (!d || d.type !== 'merit-window-calibration')
        return undefined;
    const req = Number(d.requested);
    const phys = Number(d.physical);
    if (!(req > 0) || !(phys > 0))
        return undefined;
    const scale = phys / (req + POPUP_WIDTH_OFFSET);
    if (!(scale > 0.2 && scale < 20))
        return undefined;
    return { pixelsPerUnit: scale, offset: POPUP_WIDTH_OFFSET };
}
/**
 * The window.open features: a popup of this size ('max' height = the screen's available height).
 * 2026-11-26 (owner): the width is in SCREEN pixels (the unit Pixel Width shows), not the browser's display units; requestedWindowWidth turns it into the width window.open takes. The window is opened once and left alone.
 */
export function testSiteWindowFeatures(form, screenAvailHeight, pixelRatio = 1, calibration) {
    const height = form.height.trim().toLowerCase() === 'max' ? Math.max(MIN_SIZE, Math.floor(screenAvailHeight)) : Number(form.height);
    return `popup,width=${requestedWindowWidth(Number(form.width), pixelRatio, calibration)},height=${height},left=0,top=0`;
}
/** The link to open: the fields' link plus rq (the width asked of window.open) and oid (this window's number in the popup log), so the window can report where it landed. */
export function testSiteOpenUrl(form, requested, oid) {
    const url = buildTestSiteUrl(form);
    if (!url)
        return undefined;
    const query = [requested ? `rq=${requested}` : '', oid ? `oid=${oid}` : ''].filter(Boolean).join('&');
    return query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url;
}
export const POPUP_LOG_MAX = 30;
/** The window's own timeline, from the message it sent (merit-popup-log), or undefined. */
export function popupLogFromMessage(data) {
    const d = data;
    if (!d || d.type !== 'merit-popup-log' || typeof d.oid !== 'string' || !Array.isArray(d.frames))
        return undefined;
    return { oid: d.oid, frames: d.frames.filter((f) => typeof f === 'string').slice(0, 400) };
}
/** The log with a window's timeline added to its entry (by oid). */
export function mergePopupFrames(log, oid, frames) {
    return log.map((entry) => (entry.oid === oid ? { ...entry, frames } : entry));
}
/** The log as plain text, newest last: what each window was asked for, then what it did. */
export function formatPopupLog(log) {
    if (!log.length)
        return 'No windows opened yet.';
    return log
        .map((e) => {
        const head = `#${e.oid} ${e.openedAt}  asked ${e.target} screen px (window.open width ${e.requested}${e.calibrated ? ', calibrated' : ', first guess'}, ratio ${e.ratio.toFixed(3)})\n  ${e.features}\n  ${e.url}`;
        const body = e.frames ? e.frames.map((f) => '    ' + f).join('\n') : '    (the window has not reported yet)';
        return `${head}\n${body}`;
    })
        .join('\n\n');
}
