// File: src/TestSitesSection.tsx
//
// 2026-11-24 (owner: "a new panel in the config tab called Test Sites"): the Config tab's Test Sites section. Fields for the protocol, host name and port of a test site, the window size to open it in, and the options of the iframe test harness (the wallet type to show, compare with the plain wallet, the message log); below them the link they build,
// which opens in a window of that size when every field is valid. Test code (never part of a release); passed to the wallet as `configTestSitesContent`, the way TestAccountsSection is passed as `configTestAccountsContent`.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { configSectionStyle, testSitesStyle } from '@sponsorcoin/spcoin-common/styles';
import { WalletActionButton } from '@sponsorcoin/spcoin-panels';
import { DEFAULT_TEST_SITE, TEST_SITE_PROTOCOLS, TEST_SITE_TYPES, buildTestSiteUrl, testSiteOpenUrl, calibrationFromMessage, requestedWindowWidth, popupLogFromMessage, mergePopupFrames, formatPopupLog, POPUP_LOG_MAX, digitsOnly, testSiteProblem, testSiteWindowFeatures } from './testSites';
const KEY = 'merit.testSites.v2';
/** The last values used (this browser only); anything unreadable falls back to the defaults. */
function readSaved() {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw)
            return DEFAULT_TEST_SITE;
        const saved = JSON.parse(raw);
        return { ...DEFAULT_TEST_SITE, ...saved };
    }
    catch {
        return DEFAULT_TEST_SITE;
    }
}
export default function TestSitesSection() {
    const [form, setForm] = useState(readSaved);
    useEffect(() => {
        try {
            window.localStorage.setItem(KEY, JSON.stringify(form));
        }
        catch {
            /* storage unavailable: the values last for this page only */
        }
    }, [form]);
    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const url = useMemo(() => buildTestSiteUrl(form), [form]);
    const problem = useMemo(() => testSiteProblem(form), [form]);
    // 2026-11-26 (owner): a window that has sized itself tells us how its size maps to screen pixels; the next one opens at the right width and needs no resize
    // 2026-11-26 (owner: "write to some log recording every popup"): every window opened here is logged with what was asked for, and the window adds its own timeline when it reports back
    const [popupLog, setPopupLog] = useState(() => {
        try {
            const saved = window.localStorage.getItem('merit.popupLog.v1');
            return saved ? JSON.parse(saved).slice(-POPUP_LOG_MAX) : [];
        }
        catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            window.localStorage.setItem('merit.popupLog.v1', JSON.stringify(popupLog));
        }
        catch {
            /* kept for this page only */
        }
    }, [popupLog]);
    const calibrationRef = useRef(undefined);
    useEffect(() => {
        try {
            const saved = window.localStorage.getItem('merit.testSiteWindowCalibration.v4');
            if (saved)
                calibrationRef.current = JSON.parse(saved);
        }
        catch {
            /* measured again */
        }
        const onMessage = (event) => {
            const timeline = popupLogFromMessage(event.data);
            if (timeline) {
                setPopupLog((log) => mergePopupFrames(log, timeline.oid, timeline.frames));
                return;
            }
            const calibration = calibrationFromMessage(event.data);
            if (!calibration)
                return;
            calibrationRef.current = calibration;
            try {
                window.localStorage.setItem('merit.testSiteWindowCalibration.v4', JSON.stringify(calibration));
            }
            catch {
                /* kept for this page only */
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);
    const open = () => {
        if (!url)
            return;
        const ratio = window.devicePixelRatio || 1;
        const requested = requestedWindowWidth(Number(form.width), ratio, calibrationRef.current);
        const features = testSiteWindowFeatures(form, window.screen.availHeight, ratio, calibrationRef.current);
        const oid = String(Date.now());
        const link = testSiteOpenUrl(form, requested, oid) ?? url;
        setPopupLog((log) => [...log, { oid, openedAt: new Date().toLocaleTimeString(), url: link, target: Number(form.width), requested, ratio, features, calibrated: !!calibrationRef.current }].slice(-POPUP_LOG_MAX));
        window.open(link, `merit-test-site-${form.port}`, features);
    };
    return (_jsxs("div", { id: "TEST_SITES_SECTION", style: configSectionStyle.column(2), children: [_jsx("p", { style: configSectionStyle.note, children: "Open a test site (the clean iframe wallet, the test harness, the dev wallet, or any other port) in its own window." }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteProtocol", children: "Protocol" }), _jsx("select", { id: "testSiteProtocol", style: testSitesStyle.field, value: form.protocol, onChange: (e) => set('protocol', e.target.value), children: TEST_SITE_PROTOCOLS.map((p) => _jsx("option", { value: p, children: p }, p)) })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteHost", children: "Host" }), _jsx("input", { id: "testSiteHost", style: testSitesStyle.field, type: "text", value: form.host, spellCheck: false, autoCapitalize: "off", onChange: (e) => set('host', e.target.value) })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSitePort", children: "Port" }), _jsx("input", { id: "testSitePort", style: testSitesStyle.field, type: "text", inputMode: "numeric", value: form.port, onChange: (e) => set('port', digitsOnly(e.target.value).slice(0, 5)) })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteWidth", title: "Screen pixels, the same unit as Pixel Width in Config -> Display", children: "Width (screen px)" }), _jsx("input", { id: "testSiteWidth", style: testSitesStyle.field, type: "text", inputMode: "numeric", value: form.width, onChange: (e) => set('width', digitsOnly(e.target.value).slice(0, 4)) })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteHeight", children: "Height" }), _jsx("input", { id: "testSiteHeight", style: testSitesStyle.field, type: "text", value: form.height, maxLength: 4, spellCheck: false, onChange: (e) => set('height', e.target.value), title: "max = the screen's full height" })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteType", children: "Wallet type" }), _jsxs("select", { id: "testSiteType", style: testSitesStyle.field, value: form.type, onChange: (e) => set('type', e.target.value), children: [_jsx("option", { value: "", children: "(not set)" }), TEST_SITE_TYPES.map((t) => _jsx("option", { value: t, children: t.replace('_', ' ') }, t))] })] }), _jsxs("label", { style: testSitesStyle.check, children: [_jsx("input", { id: "testSiteCompare", type: "checkbox", checked: form.compare, onChange: (e) => set('compare', e.target.checked) }), " compare with the plain wallet"] }), _jsxs("label", { style: testSitesStyle.check, children: [_jsx("input", { id: "testSiteLog", type: "checkbox", checked: form.log, onChange: (e) => set('log', e.target.checked) }), " message log"] }), _jsx("div", { id: "testSiteUrl", style: url ? testSitesStyle.url : testSitesStyle.urlInvalid, children: url ?? '—' }), problem ? _jsx("p", { id: "testSiteProblem", style: configSectionStyle.bad, children: problem }) : null, _jsx("div", { style: configSectionStyle.buttonsCentered, children: _jsx(WalletActionButton, { disabled: !url, onClick: open, children: "Open" }) }), _jsx("p", { style: configSectionStyle.note, children: "Popup log: every window opened here, what it was asked for, and what it did in its first seconds (also in the ladybug dump of that window)." }), _jsx("pre", { id: "testSitePopupLog", style: { ...testSitesStyle.url, whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto', margin: 0 }, children: formatPopupLog(popupLog) }), _jsxs("div", { style: configSectionStyle.buttonsCentered, children: [_jsx(WalletActionButton, { onClick: () => { try {
                            void navigator.clipboard.writeText(formatPopupLog(popupLog));
                        }
                        catch { /* no clipboard */ } }, children: "Copy log" }), _jsx(WalletActionButton, { onClick: () => setPopupLog([]), children: "Clear log" })] })] }));
}
