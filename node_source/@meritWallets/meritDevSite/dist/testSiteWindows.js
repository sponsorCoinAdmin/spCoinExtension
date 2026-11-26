// File: src/testSiteWindows.ts
//
// 2026-11-26 (owner: "make the spCoin logo open the panel with these exact specs"): opening a Test Sites window, the window log and the size calibration, kept in ONE place so the Config -> Test Sites section and the web app's spCoin logo open windows the same way, from the same saved settings.
import { DEFAULT_TEST_SITE, buildTestSiteUrl, calibrationFromMessage, formatPopupLog, mergePopupFrames, popupLogFromMessage, requestedWindowWidth, testSiteOpenUrl, testSiteProblem, testSiteWindowFeatures, POPUP_LOG_MAX } from './testSites';
const FORM_KEY = 'merit.testSites.v2';
const LOG_KEY = 'merit.popupLog.v1';
const CALIBRATION_KEY = 'merit.testSiteWindowCalibration.v4';
/** The last values used in the Test Sites form (this browser only); anything unreadable falls back to the defaults. */
export function readSavedTestSiteForm() {
    try {
        const raw = window.localStorage.getItem(FORM_KEY);
        if (!raw)
            return DEFAULT_TEST_SITE;
        return { ...DEFAULT_TEST_SITE, ...JSON.parse(raw) };
    }
    catch {
        return DEFAULT_TEST_SITE;
    }
}
export function saveTestSiteForm(form) {
    try {
        window.localStorage.setItem(FORM_KEY, JSON.stringify(form));
    }
    catch {
        /* storage unavailable: the values last for this page only */
    }
}
let popupLog;
let calibration;
let calibrationRead = false;
const opened = {};
const listeners = new Set();
function loadLog() {
    if (popupLog)
        return popupLog;
    try {
        const saved = window.localStorage.getItem(LOG_KEY);
        popupLog = saved ? JSON.parse(saved).slice(-POPUP_LOG_MAX) : [];
    }
    catch {
        popupLog = [];
    }
    return popupLog;
}
function setLog(next) {
    popupLog = next;
    try {
        window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
    }
    catch {
        /* kept for this page only */
    }
    listeners.forEach((listener) => listener());
}
function loadCalibration() {
    if (!calibrationRead) {
        calibrationRead = true;
        try {
            const saved = window.localStorage.getItem(CALIBRATION_KEY);
            if (saved)
                calibration = JSON.parse(saved);
        }
        catch {
            /* measured again */
        }
    }
    return calibration;
}
/** The window log (a new array each time it changes: for useSyncExternalStore). */
export function getPopupLog() {
    return typeof window === 'undefined' ? EMPTY : loadLog();
}
const EMPTY = [];
export function subscribePopupLog(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function clearPopupLog() {
    setLog([]);
}
export function popupLogText() {
    return formatPopupLog(getPopupLog());
}
/** Listens (once per page) for what a window we opened reports: where it landed (the size calibration) and its own timeline (the log). */
let installed = false;
export function installTestSiteListener() {
    if (installed || typeof window === 'undefined')
        return;
    installed = true;
    window.addEventListener('message', (event) => {
        const timeline = popupLogFromMessage(event.data);
        if (timeline) {
            setLog(mergePopupFrames(loadLog(), timeline.oid, timeline.frames));
            return;
        }
        const measured = calibrationFromMessage(event.data);
        if (!measured)
            return;
        calibration = measured;
        calibrationRead = true;
        try {
            window.localStorage.setItem(CALIBRATION_KEY, JSON.stringify(measured));
        }
        catch {
            /* kept for this page only */
        }
    });
}
/**
 * Opens the test site the form describes, once, at the best-estimated size, and records it in the log.
 * The window opened last for the same port is closed first and every window gets its own name (a window.open with the name of a window still open reuses that window and keeps its size).
 * Returns null when the fields are not valid or the browser blocked the window.
 */
export function openTestSiteWindow(form) {
    installTestSiteListener();
    const url = buildTestSiteUrl(form);
    if (!url || testSiteProblem(form))
        return null;
    const ratio = window.devicePixelRatio || 1;
    const known = loadCalibration();
    const requested = requestedWindowWidth(Number(form.width), ratio, known);
    const features = testSiteWindowFeatures(form, window.screen.availHeight, ratio, known);
    const oid = String(Date.now());
    const link = testSiteOpenUrl(form, requested, oid) ?? url;
    setLog([...loadLog(), { oid, openedAt: new Date().toLocaleTimeString(), url: link, target: Number(form.width), requested, ratio, features, calibrated: !!known }].slice(-POPUP_LOG_MAX));
    try {
        const previous = opened[form.port];
        if (previous && !previous.closed)
            previous.close();
    }
    catch {
        /* a window that cannot be closed is left alone */
    }
    const win = window.open(link, `merit-test-site-${form.port}-${oid}`, features);
    opened[form.port] = win;
    return win;
}
/** Opens the window the Config -> Test Sites section is set to (its saved values), for a button that is not in that section (the web app's spCoin logo). */
export function openSavedTestSiteWindow() {
    return openTestSiteWindow(readSavedTestSiteForm());
}
