// File: src/TestSitesSection.tsx
//
// 2026-11-24 (owner: "a new panel in the config tab called Test Sites"): the Config tab's Test Sites section. Fields for the protocol, host name and port of a test site, the window size to open it in, and the options of the iframe test harness (the wallet type to show, compare with the plain wallet, the message log); below them the link they build,
// which opens in a window of that size when every field is valid. Test code (never part of a release); passed to the wallet as `configTestSitesContent`, the way TestAccountsSection is passed as `configTestAccountsContent`.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { configSectionStyle, testSitesStyle } from '@sponsorcoin/spcoin-common/styles';
import { WalletActionButton } from '@sponsorcoin/spcoin-panels';
import { DEFAULT_TEST_SITE, TEST_SITE_PROTOCOLS, TEST_SITE_TYPES, buildTestSiteUrl, digitsOnly, testSiteProblem, testSiteWindowFeatures } from './testSites';
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
    const open = () => {
        if (!url)
            return;
        window.open(url, `merit-test-site-${form.port}`, testSiteWindowFeatures(form, window.screen.availHeight));
    };
    return (_jsxs("div", { id: "TEST_SITES_SECTION", style: configSectionStyle.column(2), children: [_jsx("p", { style: configSectionStyle.note, children: "Open a test site (the clean iframe wallet, the test harness, the dev wallet, or any other port) in its own window." }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteProtocol", children: "Protocol" }), _jsx("select", { id: "testSiteProtocol", style: testSitesStyle.field, value: form.protocol, onChange: (e) => set('protocol', e.target.value), children: TEST_SITE_PROTOCOLS.map((p) => _jsx("option", { value: p, children: p }, p)) })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteHost", children: "Host" }), _jsx("input", { id: "testSiteHost", style: testSitesStyle.field, type: "text", value: form.host, spellCheck: false, autoCapitalize: "off", onChange: (e) => set('host', e.target.value) })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSitePort", children: "Port" }), _jsx("input", { id: "testSitePort", style: testSitesStyle.field, type: "text", inputMode: "numeric", value: form.port, onChange: (e) => set('port', digitsOnly(e.target.value).slice(0, 5)) })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteWidth", children: "Width" }), _jsx("input", { id: "testSiteWidth", style: testSitesStyle.field, type: "text", inputMode: "numeric", value: form.width, onChange: (e) => set('width', digitsOnly(e.target.value).slice(0, 4)) })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteHeight", children: "Height" }), _jsx("input", { id: "testSiteHeight", style: testSitesStyle.field, type: "text", value: form.height, maxLength: 4, spellCheck: false, onChange: (e) => set('height', e.target.value), title: "max = the screen's full height" })] }), _jsxs("div", { style: testSitesStyle.row, children: [_jsx("label", { style: testSitesStyle.label, htmlFor: "testSiteType", children: "Wallet type" }), _jsxs("select", { id: "testSiteType", style: testSitesStyle.field, value: form.type, onChange: (e) => set('type', e.target.value), children: [_jsx("option", { value: "", children: "(not set)" }), TEST_SITE_TYPES.map((t) => _jsx("option", { value: t, children: t.replace('_', ' ') }, t))] })] }), _jsxs("label", { style: testSitesStyle.check, children: [_jsx("input", { id: "testSiteCompare", type: "checkbox", checked: form.compare, onChange: (e) => set('compare', e.target.checked) }), " compare with the plain wallet"] }), _jsxs("label", { style: testSitesStyle.check, children: [_jsx("input", { id: "testSiteLog", type: "checkbox", checked: form.log, onChange: (e) => set('log', e.target.checked) }), " message log"] }), _jsx("div", { id: "testSiteUrl", style: url ? testSitesStyle.url : testSitesStyle.urlInvalid, children: url ?? '—' }), problem ? _jsx("p", { id: "testSiteProblem", style: configSectionStyle.bad, children: problem }) : null, _jsx("div", { style: configSectionStyle.buttonsCentered, children: _jsx(WalletActionButton, { disabled: !url, onClick: open, children: "Open" }) })] }));
}
