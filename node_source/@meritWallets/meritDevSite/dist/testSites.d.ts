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
/** What an earlier window reported about how its size maps to screen pixels: P = pixelsPerUnit x (requested + offset). Kept by the opener (Config -> Test Sites). */
export interface WindowCalibration {
    pixelsPerUnit: number;
    offset: number;
}
/** The width to ask window.open for so the window opens at `target` SCREEN pixels: exact when calibrated, a first guess (target / pixel ratio) until then. */
export declare function requestedWindowWidth(target: number, pixelRatio: number, calibration?: WindowCalibration): number;
/** A calibration from the message a window sent (merit-window-calibration), or undefined when it is not a sane one. */
export declare function calibrationFromMessage(data: unknown): WindowCalibration | undefined;
/**
 * The window.open features: a popup of this size ('max' height = the screen's available height).
 * 2026-11-26 (owner): the width is in SCREEN pixels (the unit Pixel Width shows), not the browser's display units. The width asked of window.open comes from requestedWindowWidth; the new window then corrects itself to the exact width (the pw link parameter, testSiteOpenUrl).
 */
export declare function testSiteWindowFeatures(form: TestSiteForm, screenAvailHeight: number, pixelRatio?: number, calibration?: WindowCalibration): string;
/** The link to open: the fields' link plus pw=<screen pixels> (and rq = the width asked of window.open), which the wallet page reads to size its own window exactly. */
export declare function testSiteOpenUrl(form: TestSiteForm, requested?: number): string | undefined;
