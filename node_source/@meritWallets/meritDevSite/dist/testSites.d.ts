export type TestSiteProtocol = 'https' | 'http';
export declare const TEST_SITE_PROTOCOLS: readonly TestSiteProtocol[];
/** The wallet types a test site may be asked to show (the iframe harness's type picker). '' = not asked. */
export declare const TEST_SITE_TYPES: readonly ["WEB", "WEB_APP", "EXT", "ANDROID", "IPHONE"];
export interface TestSiteForm {
    protocol: TestSiteProtocol;
    host: string;
    port: string;
    /** Pixels. */
    width: string;
    /** Pixels, or 'max' for the screen's full available height. */
    height: string;
    /** One of TEST_SITE_TYPES, or '' to leave it out of the link. */
    type: string;
    /** The harness's "compare with the plain wallet" box. */
    compare: boolean;
    /** The harness's "message log" box. */
    log: boolean;
}
/** The defaults the owner asked for: https, localhost, port 3101, height as tall as the screen. */
export declare const DEFAULT_TEST_SITE: TestSiteForm;
/** The port box takes digits only. */
export declare function digitsOnly(text: string): string;
/** Why the fields do not make a link yet, or undefined when they do. */
export declare function testSiteProblem(form: TestSiteForm): string | undefined;
/** The link the fields build, or undefined while they are not valid. */
export declare function buildTestSiteUrl(form: TestSiteForm): string | undefined;
/**
 * What the opener has learned about how a window.open width maps to screen pixels: P = scale x (requested + offset).
 * Chrome shows a window of `requested` units with a viewport of requested + 17 units (the scrollbar), and a unit is `scale` screen pixels (the display scaling, e.g. 2.8). Both are an estimate until a window has landed; then `scale` is measured from where it landed.
 */
export interface WindowCalibration {
    pixelsPerUnit: number;
    offset: number;
}
/** Chrome's extra 17 units of viewport width on a popup (seen on Windows Chrome: asking for 300 gives a viewport of 317). */
export declare const POPUP_WIDTH_OFFSET = 17;
/**
 * The width to ask window.open for so the window opens at `target` SCREEN pixels, in ONE open (2026-11-26, owner: "do your best estimate and open once"):
 * target / scale - offset, where scale is what an earlier window measured, or this page's devicePixelRatio until one has (exact at 100% browser zoom, close otherwise).
 */
export declare function requestedWindowWidth(target: number, pixelRatio: number, calibration?: WindowCalibration): number;
/** A calibration from the message a window sent (merit-window-calibration: the width asked for and the screen pixels it landed at), or undefined when it is not a sane one. */
export declare function calibrationFromMessage(data: unknown): WindowCalibration | undefined;
/**
 * The window.open features: a popup of this size ('max' height = the screen's available height).
 * 2026-11-26 (owner): the width is in SCREEN pixels (the unit Pixel Width shows), not the browser's display units; requestedWindowWidth turns it into the width window.open takes. The window is opened once and left alone.
 */
export declare function testSiteWindowFeatures(form: TestSiteForm, screenAvailHeight: number, pixelRatio?: number, calibration?: WindowCalibration): string;
/** The link to open: the fields' link plus rq (the width asked of window.open) and oid (this window's number in the popup log), so the window can report where it landed. */
export declare function testSiteOpenUrl(form: TestSiteForm, requested?: number, oid?: string): string | undefined;
/** One window the Test Sites form opened: what was asked for, and (when the window reported back) what it did. */
export interface PopupLogEntry {
    oid: string;
    openedAt: string;
    url: string;
    /** screen pixels typed in the form */
    target: number;
    /** the width asked of window.open */
    requested: number;
    ratio: number;
    features: string;
    calibrated: boolean;
    frames?: string[];
}
export declare const POPUP_LOG_MAX = 30;
/** The window's own timeline, from the message it sent (merit-popup-log), or undefined. */
export declare function popupLogFromMessage(data: unknown): {
    oid: string;
    frames: string[];
} | undefined;
/** The log with a window's timeline added to its entry (by oid). */
export declare function mergePopupFrames(log: PopupLogEntry[], oid: string, frames: string[]): PopupLogEntry[];
/** The log as plain text, newest last: what each window was asked for, then what it did. */
export declare function formatPopupLog(log: PopupLogEntry[]): string;
