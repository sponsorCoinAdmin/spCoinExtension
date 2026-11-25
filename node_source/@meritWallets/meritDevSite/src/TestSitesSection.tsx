// File: src/TestSitesSection.tsx
//
// 2026-11-24 (owner: "a new panel in the config tab called Test Sites"): the Config tab's Test Sites section. Fields for the protocol, host name and port of a test site, the window size to open it in, and the options of the iframe test harness (the wallet type to show, compare with the plain wallet, the message log); below them the link they build,
// which opens in a window of that size when every field is valid. Test code (never part of a release); passed to the wallet as `configTestSitesContent`, the way TestAccountsSection is passed as `configTestAccountsContent`.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { configSectionStyle, testSitesStyle } from '@sponsorcoin/spcoin-common/styles';
import { WalletActionButton } from '@sponsorcoin/spcoin-panels';
import { DEFAULT_TEST_SITE, TEST_SITE_PROTOCOLS, TEST_SITE_TYPES, buildTestSiteUrl, digitsOnly, testSiteProblem, testSiteWindowFeatures, type TestSiteForm, type TestSiteProtocol } from './testSites';

const KEY = 'merit.testSites.v2';

/** The last values used (this browser only); anything unreadable falls back to the defaults. */
function readSaved(): TestSiteForm {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_TEST_SITE;
    const saved = JSON.parse(raw) as Partial<TestSiteForm>;
    return { ...DEFAULT_TEST_SITE, ...saved };
  } catch {
    return DEFAULT_TEST_SITE;
  }
}

export default function TestSitesSection() {
  const [form, setForm] = useState<TestSiteForm>(readSaved);
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(form));
    } catch {
      /* storage unavailable: the values last for this page only */
    }
  }, [form]);
  const set = <K extends keyof TestSiteForm>(key: K, value: TestSiteForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const url = useMemo(() => buildTestSiteUrl(form), [form]);
  const problem = useMemo(() => testSiteProblem(form), [form]);

  const open = () => {
    if (!url) return;
    window.open(url, `merit-test-site-${form.port}`, testSiteWindowFeatures(form, window.screen.availHeight));
  };

  return (
    <div id="TEST_SITES_SECTION" style={configSectionStyle.column(2)}>
      <p style={configSectionStyle.note}>Open a test site (the clean iframe wallet, the test harness, the dev wallet, or any other port) in its own window.</p>

      <div style={testSitesStyle.row}>
        <label style={testSitesStyle.label} htmlFor="testSiteProtocol">Protocol</label>
        <select id="testSiteProtocol" style={testSitesStyle.field} value={form.protocol} onChange={(e) => set('protocol', e.target.value as TestSiteProtocol)}>
          {TEST_SITE_PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={testSitesStyle.row}>
        <label style={testSitesStyle.label} htmlFor="testSiteHost">Host</label>
        <input id="testSiteHost" style={testSitesStyle.field} type="text" value={form.host} spellCheck={false} autoCapitalize="off" onChange={(e) => set('host', e.target.value)} />
      </div>
      <div style={testSitesStyle.row}>
        <label style={testSitesStyle.label} htmlFor="testSitePort">Port</label>
        <input id="testSitePort" style={testSitesStyle.field} type="text" inputMode="numeric" value={form.port} onChange={(e) => set('port', digitsOnly(e.target.value).slice(0, 5))} />
      </div>

      <div style={testSitesStyle.row}>
        <label style={testSitesStyle.label} htmlFor="testSiteWidth">Width</label>
        <input id="testSiteWidth" style={testSitesStyle.field} type="text" inputMode="numeric" value={form.width} onChange={(e) => set('width', digitsOnly(e.target.value).slice(0, 4))} />
      </div>
      <div style={testSitesStyle.row}>
        <label style={testSitesStyle.label} htmlFor="testSiteHeight">Height</label>
        <input id="testSiteHeight" style={testSitesStyle.field} type="text" value={form.height} maxLength={4} spellCheck={false} onChange={(e) => set('height', e.target.value)} title="max = the screen's full height" />
      </div>

      <div style={testSitesStyle.row}>
        <label style={testSitesStyle.label} htmlFor="testSiteType">Wallet type</label>
        <select id="testSiteType" style={testSitesStyle.field} value={form.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">(not set)</option>
          {TEST_SITE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>
      <label style={testSitesStyle.check}>
        <input id="testSiteCompare" type="checkbox" checked={form.compare} onChange={(e) => set('compare', e.target.checked)} /> compare with the plain wallet
      </label>
      <label style={testSitesStyle.check}>
        <input id="testSiteLog" type="checkbox" checked={form.log} onChange={(e) => set('log', e.target.checked)} /> message log
      </label>

      <div id="testSiteUrl" style={url ? testSitesStyle.url : testSitesStyle.urlInvalid}>{url ?? '—'}</div>
      {problem ? <p id="testSiteProblem" style={configSectionStyle.bad}>{problem}</p> : null}
      <div style={configSectionStyle.buttonsCentered}>
        <WalletActionButton disabled={!url} onClick={open}>Open</WalletActionButton>
      </div>
    </div>
  );
}
