// File: src/testSites.ts
//
// 2026-11-24 (owner: a "Test Sites" panel in the Config tab): the pure part, no React and no window: what the fields may hold, the link they build, and the window features for opening it. The section component (TestSitesSection.tsx) is only the form around these.
// Test code: it lives in the test project and never in a release (README).
export const TEST_SITE_PROTOCOLS = ['https', 'http'];
/** The wallet types a test site may be asked to show (the iframe harness's type picker). '' = not asked. */
export const TEST_SITE_TYPES = ['WEB', 'WEB_APP', 'EXT', 'ANDROID', 'IPHONE'];
/** The defaults the owner asked for: https, localhost, port 3101, height as tall as the screen. */
export const DEFAULT_TEST_SITE = { protocol: 'https', host: 'localhost', port: '3101', width: '460', height: 'max', type: '', compare: false, log: false };
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
/** The window.open features: a popup of this size ('max' height = the screen's available height). */
export function testSiteWindowFeatures(form, screenAvailHeight) {
    const height = form.height.trim().toLowerCase() === 'max' ? Math.max(MIN_SIZE, Math.floor(screenAvailHeight)) : Number(form.height);
    return `popup,width=${Number(form.width)},height=${height},left=0,top=0`;
}
