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
/** The width to ask window.open for so the window opens at `target` SCREEN pixels: exact when calibrated, a first guess (target / pixel ratio) until then. */
export function requestedWindowWidth(target, pixelRatio, calibration) {
    if (calibration && calibration.pixelsPerUnit > 0)
        return Math.max(1, Math.round(target / calibration.pixelsPerUnit - calibration.offset));
    return Math.max(1, Math.round(target / (pixelRatio > 0 ? pixelRatio : 1)));
}
/** A calibration from the message a window sent (merit-window-calibration), or undefined when it is not a sane one. */
export function calibrationFromMessage(data) {
    const d = data;
    if (!d || d.type !== 'merit-window-calibration')
        return undefined;
    const ppu = Number(d.pixelsPerUnit);
    const req = Number(d.requested);
    const phys = Number(d.physical);
    if (!(ppu > 0.2 && ppu < 20) || !(req > 0) || !(phys > 0))
        return undefined;
    return { pixelsPerUnit: ppu, offset: phys / ppu - req };
}
/**
 * The window.open features: a popup of this size ('max' height = the screen's available height).
 * 2026-11-26 (owner): the width is in SCREEN pixels (the unit Pixel Width shows), not the browser's display units. The width asked of window.open comes from requestedWindowWidth; the new window then corrects itself to the exact width (the pw link parameter, testSiteOpenUrl).
 */
export function testSiteWindowFeatures(form, screenAvailHeight, pixelRatio = 1, calibration) {
    const height = form.height.trim().toLowerCase() === 'max' ? Math.max(MIN_SIZE, Math.floor(screenAvailHeight)) : Number(form.height);
    return `popup,width=${requestedWindowWidth(Number(form.width), pixelRatio, calibration)},height=${height},left=0,top=0`;
}
/** The link to open: the fields' link plus pw=<screen pixels> (and rq = the width asked of window.open), which the wallet page reads to size its own window exactly. */
export function testSiteOpenUrl(form, requested) {
    const url = buildTestSiteUrl(form);
    return url ? `${url}${url.includes('?') ? '&' : '?'}pw=${Number(form.width)}${requested ? `&rq=${requested}` : ''}` : undefined;
}
