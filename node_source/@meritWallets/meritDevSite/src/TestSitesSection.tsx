// File: src/TestSitesSection.tsx
//
// 2026-11-24 (owner: "a new panel in the config tab called Test Sites"): the Config tab's Test Sites section. Fields for the protocol, host name and port of a test site, the window size to open it in, and the options of the iframe test harness (the wallet type to show, compare with the plain wallet, the message log); below them the link they build,
// which opens in a window of that size when every field is valid. Test code (never part of a release); passed to the wallet as `configTestSitesContent`, the way TestAccountsSection is passed as `configTestAccountsContent`.
'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { configSectionStyle, testSitesStyle } from '@sponsorcoin/spcoin-common/styles';
import { WalletActionButton } from '@sponsorcoin/spcoin-panels';
import { TEST_SITE_PROTOCOLS, TEST_SITE_TYPES, buildTestSiteUrl, digitsOnly, formatPopupLog, testSiteProblem, type TestSiteForm, type TestSiteProtocol } from './testSites';
import { clearPopupLog, getPopupLog, installTestSiteListener, openTestSiteWindow, readSavedTestSiteForm, saveTestSiteForm, subscribePopupLog } from './testSiteWindows';

export default function TestSitesSection() {
  const [form, setForm] = useState<TestSiteForm>(readSavedTestSiteForm);
  useEffect(() => {
    saveTestSiteForm(form);
  }, [form]);
  const set = <K extends keyof TestSiteForm>(key: K, value: TestSiteForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const url = useMemo(() => buildTestSiteUrl(form), [form]);
  const problem = useMemo(() => testSiteProblem(form), [form]);

  // 2026-11-26 (owner): the window log, the size calibration and the opening of a window live in testSiteWindows.ts, shared with the web app's spCoin logo; this section shows the log and opens with its own fields
  const popupLog = useSyncExternalStore(subscribePopupLog, getPopupLog, getPopupLog);
  useEffect(() => {
    installTestSiteListener();
  }, []);
  const open = () => {
    openTestSiteWindow(form);
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
        <label style={testSitesStyle.label} htmlFor="testSiteWidth" title="Screen pixels, the same unit as Pixel Width in Config -> Display">Width (screen px)</label>
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
      <p style={configSectionStyle.note}>Popup log: every window opened here, what it was asked for, and what it did in its first seconds (also in the ladybug dump of that window).</p>
      <pre id="testSitePopupLog" style={{ ...testSitesStyle.url, whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto', margin: 0 }}>{formatPopupLog(popupLog)}</pre>
      <div style={configSectionStyle.buttonsCentered}>
        <WalletActionButton onClick={() => { try { void navigator.clipboard.writeText(formatPopupLog(popupLog)); } catch { /* no clipboard */ } }}>Copy log</WalletActionButton>
        <WalletActionButton onClick={() => clearPopupLog()}>Clear log</WalletActionButton>
      </div>
    </div>
  );
}
