// File: popupLog.ts
//
// 2026-11-26 (owner: "write to some log recording every popup"): a window opened by another page (window.opener: the Test Sites windows) records what it does in its first seconds, frame by frame: its size in CSS and screen pixels, the pixel ratio, the page zoom, whether the page is hidden, its outer size, and every resize event. It writes the lines to the debug log (the ladybug dump) and sends them to the opener, which keeps them with what it asked for (Config -> Test Sites -> Popup log).
import { meritDebug } from '@sponsorcoin/merit-wallet';

const RECORD_MS = 3500;

export function recordPopupTimeline(): void {
  if (typeof window === 'undefined' || !window.opener) return;
  try {
    const oid = new URLSearchParams(window.location.search).get('oid') ?? '';
    const frames: string[] = [];
    let last = '';
    const at = () => Math.round(performance.now());
    const state = (): string => {
      const ratio = window.devicePixelRatio || 1;
      return `inner=${window.innerWidth}x${window.innerHeight}css ratio=${ratio.toFixed(3)} screen=${Math.round(window.innerWidth * ratio)}px outer=${window.outerWidth}x${window.outerHeight} zoom=${document.documentElement.style.zoom || '-'} page=${document.documentElement.style.visibility || 'visible'} ${document.readyState}`;
    };
    const sample = () => {
      const now = state();
      if (now !== last) { frames.push(`${at()}ms ${now}`); last = now; }
    };
    const onResize = () => frames.push(`${at()}ms resize event`);
    window.addEventListener('resize', onResize);
    const t0 = performance.now();
    const finish = () => {
      window.removeEventListener('resize', onResize);
      sample();
      meritDebug.log('popup', `window timeline (${frames.length} changes in ${RECORD_MS}ms): ${oid ? 'oid ' + oid : 'no oid'}`);
      for (const line of frames) meritDebug.log('popup', line);
      try {
        window.opener?.postMessage({ type: 'merit-popup-log', oid, frames }, '*');
      } catch {
        /* no opener to tell */
      }
    };
    const tick = () => {
      sample();
      if (performance.now() - t0 < RECORD_MS) requestAnimationFrame(tick);
      else finish();
    };
    frames.push(`${at()}ms script started`);
    requestAnimationFrame(tick);
  } catch {
    /* recording is best effort */
  }
}
