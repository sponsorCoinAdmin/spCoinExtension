// File: src/debug/DebugBug.tsx
//
// 2026-11-14 (owner: "a universal bug display ... an actual bug icon to the left of the recycle in the header ... red like a red lady bug ... turned on and off with a control panel setting at the bottom or by hot key <ctrl><alt>b"):
// the ladybug button for the header, its dump panel, the Config check box and the one hook that wires the hotkey and the error capture. The text itself comes from debugStore.ts, the same in every app.
'use client';

import { debugBugStyle } from '@sponsorcoin/spcoin-common/styles';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import DialogPortal from '../DialogPortal';
import { usePlatform } from '../platform/platform';
import { meritDebug } from './debugStore';

const ENABLED_KEY = 'merit.debug.enabled.v1';
export const DEBUG_HOTKEY = 'ctrl+alt+b';

export const useDebugEnabled = (): boolean => useSyncExternalStore(meritDebug.subscribe, meritDebug.isEnabled, meritDebug.isEnabled);

/** Mount once, in the wallet: reads the saved switch, listens for the hotkey, and sends the page's errors and device facts to the store. */
export function useDebugRuntime(): void {
  const platform = usePlatform();
  useEffect(() => {
    try {
      meritDebug.setEnabled(platform.storage.get(ENABLED_KEY) === 'true');
    } catch {
      /* storage unavailable: off */
    }
    const offKey = platform.onHotkey?.(DEBUG_HOTKEY, () => {
      const next = !meritDebug.isEnabled();
      meritDebug.setEnabled(next);
      platform.storage.set(ENABLED_KEY, String(next));
    });
    const offError = platform.onDeviceError?.((kind, text) => meritDebug.error(kind, text));
    meritDebug.setSection('device', () => platform.deviceInfo?.() ?? {});
    return () => {
      offKey?.();
      offError?.();
    };
  }, [platform]);
}

/** The red ladybug. */
function Ladybug() {
  const s = debugBugStyle.size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="14" rx="7.5" ry="8" fill={debugBugStyle.red} />
      <circle cx="12" cy="5.5" r="3.2" fill={debugBugStyle.dark} />
      <line x1="12" y1="7" x2="12" y2="22" stroke={debugBugStyle.dark} strokeWidth="1.2" />
      <circle cx="8.5" cy="12" r="1.5" fill={debugBugStyle.dark} />
      <circle cx="15.5" cy="12" r="1.5" fill={debugBugStyle.dark} />
      <circle cx="9" cy="17" r="1.3" fill={debugBugStyle.dark} />
      <circle cx="15" cy="17" r="1.3" fill={debugBugStyle.dark} />
      <line x1="10" y1="3" x2="7.5" y2="0.8" stroke={debugBugStyle.dark} strokeWidth="1" />
      <line x1="14" y1="3" x2="16.5" y2="0.8" stroke={debugBugStyle.dark} strokeWidth="1" />
    </svg>
  );
}

function DebugPanel({ onClose }: { onClose(): void }) {
  const platform = usePlatform();
  const [text, setText] = useState('Reading...');
  const [copied, setCopied] = useState(false);
  const refresh = useCallback(() => void meritDebug.buildDump().then(setText), []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [refresh]);
  return (
    <DialogPortal>
      <div id="MERIT_DEBUG_PANEL" style={debugBugStyle.overlay}>
        <div style={debugBugStyle.bar}>
          <span style={debugBugStyle.title}>Debug dump</span>
          <button type="button" style={debugBugStyle.button} onClick={refresh}>Refresh</button>
          <button
            type="button"
            style={debugBugStyle.button}
            onClick={() =>
              void meritDebug.buildDump().then((dump) =>
                platform.copyText(dump).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }),
              )
            }
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" style={debugBugStyle.button} onClick={() => { meritDebug.clear(); refresh(); }}>Clear</button>
          <button type="button" style={debugBugStyle.button} onClick={onClose}>Close</button>
        </div>
        <pre style={debugBugStyle.pre}>{text}</pre>
      </div>
    </DialogPortal>
  );
}

/** The header button: nothing when debug is off. */
export function DebugBugButton() {
  const enabled = useDebugEnabled();
  const [open, setOpen] = useState(false);
  if (!enabled) return null;
  return (
    <>
      <button type="button" id="MERIT_DEBUG_BUTTON" aria-label="Debug dump" title="Debug dump (Ctrl+Alt+B turns this off)" style={debugBugStyle.iconButton} onClick={() => setOpen(true)}>
        <Ladybug />
      </button>
      {open && <DebugPanel onClose={() => setOpen(false)} />}
    </>
  );
}

/** The Config page's check box. */
export function DebugConfigSection() {
  const platform = usePlatform();
  const enabled = useDebugEnabled();
  return (
    <div>
      <label style={debugBugStyle.checkRow}>
        <input
          type="checkbox"
          id="MERIT_DEBUG_CHECK"
          checked={enabled}
          onChange={(event) => {
            meritDebug.setEnabled(event.target.checked);
            platform.storage.set(ENABLED_KEY, String(event.target.checked));
          }}
        />
        Debug (red ladybug in the header, Ctrl+Alt+B)
      </label>
      <p style={debugBugStyle.hint}>Shows one text dump of this wallet (chain, account, clock, rewards, errors) to copy and compare between apps. It holds no passwords or keys.</p>
    </div>
  );
}
