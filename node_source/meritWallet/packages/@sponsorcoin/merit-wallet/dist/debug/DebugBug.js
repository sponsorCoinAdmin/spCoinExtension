// File: src/debug/DebugBug.tsx
//
// 2026-11-14 (owner: "a universal bug display ... an actual bug icon to the left of the recycle in the header ... red like a red lady bug ... turned on and off with a control panel setting at the bottom or by hot key <ctrl><alt>b"):
// the ladybug button for the header, its dump panel, the Config check box and the one hook that wires the hotkey and the error capture. The text itself comes from debugStore.ts, the same in every app.
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { debugBugStyle } from '@sponsorcoin/spcoin-common/styles';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import DialogPortal from '../DialogPortal';
import { usePlatform } from '../platform/platform';
import { meritDebug } from './debugStore';
const ENABLED_KEY = 'merit.debug.enabled.v1';
export const DEBUG_HOTKEY = 'ctrl+alt+b';
export const useDebugEnabled = () => useSyncExternalStore(meritDebug.subscribe, meritDebug.isEnabled, meritDebug.isEnabled);
/** Mount once, in the wallet: reads the saved switch, listens for the hotkey, and sends the page's errors and device facts to the store. */
export function useDebugRuntime() {
    const platform = usePlatform();
    useEffect(() => {
        try {
            meritDebug.setEnabled(platform.storage.get(ENABLED_KEY) === 'true');
        }
        catch {
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
    return (_jsxs("svg", { width: s, height: s, viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("ellipse", { cx: "12", cy: "14", rx: "7.5", ry: "8", fill: debugBugStyle.red }), _jsx("circle", { cx: "12", cy: "5.5", r: "3.2", fill: debugBugStyle.dark }), _jsx("line", { x1: "12", y1: "7", x2: "12", y2: "22", stroke: debugBugStyle.dark, strokeWidth: "1.2" }), _jsx("circle", { cx: "8.5", cy: "12", r: "1.5", fill: debugBugStyle.dark }), _jsx("circle", { cx: "15.5", cy: "12", r: "1.5", fill: debugBugStyle.dark }), _jsx("circle", { cx: "9", cy: "17", r: "1.3", fill: debugBugStyle.dark }), _jsx("circle", { cx: "15", cy: "17", r: "1.3", fill: debugBugStyle.dark }), _jsx("line", { x1: "10", y1: "3", x2: "7.5", y2: "0.8", stroke: debugBugStyle.dark, strokeWidth: "1" }), _jsx("line", { x1: "14", y1: "3", x2: "16.5", y2: "0.8", stroke: debugBugStyle.dark, strokeWidth: "1" })] }));
}
/**
 * 2026-11-25 (owner: on a press the button's background and text colors swap, and go back on release): a dump-page button. It looks pressed while a mouse button, a finger or the Enter or Space key is held on it, and returns to its colors on release, when the pointer leaves it,
 * or when it loses focus.
 */
function DumpButton({ onClick, children }) {
    const [pressed, setPressed] = useState(false);
    const release = () => setPressed(false);
    return (_jsx("button", { type: "button", style: pressed ? debugBugStyle.buttonPressed : debugBugStyle.button, onClick: onClick, onPointerDown: () => setPressed(true), onPointerUp: release, onPointerLeave: release, onPointerCancel: release, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ')
            setPressed(true); }, onKeyUp: release, onBlur: release, children: children }));
}
function DebugPanel({ onClose }) {
    const platform = usePlatform();
    const [text, setText] = useState('Reading...');
    const [copied, setCopied] = useState(false);
    const refresh = useCallback(() => void meritDebug.buildDump().then(setText), []);
    // 2026-11-27 (owner: on the iPhone the dump could not be selected or copied): the dump refreshed every 2 seconds, replacing the text and wiping any selection; it now leaves the text alone for 20 seconds after the text is touched (Refresh still reads it again).
    const lastTouch = useRef(0);
    useEffect(() => {
        refresh();
        const timer = setInterval(() => {
            if (Date.now() - lastTouch.current > 20000)
                refresh();
        }, 2000);
        return () => clearInterval(timer);
    }, [refresh]);
    return (_jsx(DialogPortal, { children: _jsxs("div", { id: "MERIT_DEBUG_PANEL", style: debugBugStyle.overlay, children: [_jsxs("div", { style: debugBugStyle.bar, children: [_jsx("span", { style: debugBugStyle.title, children: "Debug dump" }), _jsx(DumpButton, { onClick: refresh, children: "Refresh" }), _jsx(DumpButton
                        // 2026-11-27: copies the dump on screen, inside the press (iOS Safari refuses a copy that waits for anything first, which is what building a new dump did)
                        , { 
                            // 2026-11-27: copies the dump on screen, inside the press (iOS Safari refuses a copy that waits for anything first, which is what building a new dump did)
                            onClick: () => {
                                platform.copyText(text).then(() => {
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }, () => setText((current) => `${current}\n[copy refused by this browser: select the text and copy by hand]`));
                            }, children: copied ? 'Copied' : 'Copy' }), _jsx(DumpButton, { onClick: () => { meritDebug.clear(); refresh(); }, children: "Clear" }), _jsx(DumpButton, { onClick: onClose, children: "Close" })] }), _jsx("pre", { style: { ...debugBugStyle.pre, WebkitUserSelect: 'text', WebkitTouchCallout: 'default' }, onTouchStart: () => { lastTouch.current = Date.now(); }, onPointerDown: () => { lastTouch.current = Date.now(); }, children: text })] }) }));
}
/** The header button: nothing when debug is off. */
export function DebugBugButton() {
    const enabled = useDebugEnabled();
    const [open, setOpen] = useState(false);
    if (!enabled)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", id: "MERIT_DEBUG_BUTTON", "aria-label": "Debug dump", title: "Debug dump (Ctrl+Alt+B turns this off)", style: debugBugStyle.iconButton, onClick: () => setOpen(true), children: _jsx(Ladybug, {}) }), open && _jsx(DebugPanel, { onClose: () => setOpen(false) })] }));
}
/** The Config page's check box. */
export function DebugConfigSection() {
    const platform = usePlatform();
    const enabled = useDebugEnabled();
    return (
    // 2026-11-27 (owner): a row in the Config list's own look (a card with the ladybug in the round icon, the name, and the check box at the end) that does not open
    _jsx("div", { style: debugBugStyle.sectionCard, children: _jsxs("label", { style: debugBugStyle.sectionLabel, children: [_jsx("span", { style: debugBugStyle.sectionIcon, "aria-hidden": "true", children: _jsx(Ladybug, {}) }), _jsx("span", { style: debugBugStyle.sectionName, children: "Debug (Ctrl+Alt+B)" }), _jsxs("span", { style: debugBugStyle.sectionCheckBox(enabled), children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: debugBugStyle.sectionCheckInk, strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round", style: debugBugStyle.sectionCheckMark, "aria-hidden": "true", children: enabled ? _jsx("polyline", { points: "4,12.5 9.5,18 20,6" }) : _jsx("path", { d: "M5 5L19 19M19 5L5 19" }) }), _jsx("input", { type: "checkbox", id: "MERIT_DEBUG_CHECK", title: "Show the red ladybug in the header", style: debugBugStyle.sectionCheckInput, checked: enabled, onChange: (event) => {
                                meritDebug.setEnabled(event.target.checked);
                                platform.storage.set(ENABLED_KEY, String(event.target.checked));
                            } })] })] }) }));
}
