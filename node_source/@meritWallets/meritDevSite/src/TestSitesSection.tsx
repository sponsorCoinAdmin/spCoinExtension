// File: src/TestSitesSection.tsx
//
// 2026-11-24 (owner: "a new panel in the config tab called Test Sites"): the Config tab's Test Sites section. Fields for the protocol, host name and port of a test site, the window size to open it in, and the options of the iframe test harness (the wallet type to show, compare with the plain wallet, the message log); below them the link they build,
// which opens in a window of that size when every field is valid. Test code (never part of a release); passed to the wallet as `configTestSitesContent`, the way TestAccountsSection is passed as `configTestAccountsContent`.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { configSectionStyle, testSitesStyle } from '@sponsorcoin/spcoin-common/styles';
import { WalletActionButton } from '@sponsorcoin/spcoin-panels';
import { DEFAULT_TEST_SITE, TEST_SITE_PROTOCOLS, TEST_SITE_TYPES, buildTestSiteUrl, testSiteOpenUrl, calibrationFromMessage, requestedWindowWidth, popupLogFromMessage, mergePopupFrames, formatPopupLog, POPUP_LOG_MAX, digitsOnly, testSiteProblem, testSiteWindowFeatures, type TestSiteForm, type TestSiteProtocol, type WindowCalibration, type PopupLogEntry } from './testSites';

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

  // 2026-11-26 (owner): a window that has sized itself tells us how its size maps to screen pixels; the next one opens at the right width and needs no resize
  // 2026-11-26 (owner: "write to some log recording every popup"): every window opened here is logged with what was asked for, and the window adds its own timeline when it reports back
  const [popupLog, setPopupLog] = useState<PopupLogEntry[]>(() => {
    try {
      const saved = window.localStorage.getItem('merit.popupLog.v1');
      return saved ? (JSON.parse(saved) as PopupLogEntry[]).slice(-POPUP_LOG_MAX) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('merit.popupLog.v1', JSON.stringify(popupLog));
    } catch {
      /* kept for this page only */
    }
  }, [popupLog]);
  const calibrationRef = useRef<WindowCalibration | undefined>(undefined);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('merit.testSiteWindowCalibration.v4');
      if (saved) calibrationRef.current = JSON.parse(saved) as WindowCalibration;
    } catch {
      /* measured again */
    }
    const onMessage = (event: MessageEvent) => {
      const timeline = popupLogFromMessage(event.data);
      if (timeline) {
        setPopupLog((log) => mergePopupFrames(log, timeline.oid, timeline.frames));
        return;
      }
      const calibration = calibrationFromMessage(event.data);
      if (!calibration) return;
      calibrationRef.current = calibration;
      try {
        window.localStorage.setItem('merit.testSiteWindowCalibration.v4', JSON.stringify(calibration));
      } catch {
        /* kept for this page only */
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const open = () => {
    if (!url) return;
    const ratio = window.devicePixelRatio || 1;
        const requested = requestedWindowWidth(Number(form.width), ratio, calibrationRef.current);
        const features = testSiteWindowFeatures(form, window.screen.availHeight, ratio, calibrationRef.current);
        const oid = String(Date.now());
        const link = testSiteOpenUrl(form, requested, oid) ?? url;
        setPopupLog((log) => [...log, { oid, openedAt: new Date().toLocaleTimeString(), url: link, target: Number(form.width), requested, ratio, features, calibrated: !!calibrationRef.current }].slice(-POPUP_LOG_MAX));
        window.open(link, `merit-test-site-${form.port}`, features);
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
        <WalletActionButton onClick={() => setPopupLog([])}>Clear log</WalletActionButton>
      </div>
    </div>
  );
}
