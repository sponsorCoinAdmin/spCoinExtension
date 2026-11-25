export type TestSiteProtocol = 'https' | 'http';
export declare const TEST_SITE_PROTOCOLS: readonly TestSiteProtocol[];
/** The wallet types a test site may be asked to show (the iframe harness's type picker). '' = not asked. */
export declare const TEST_SITE_TYPES: readonly ['WEB', 'WEB_APP', 'EXT', 'ANDROID', 'IPHONE'];
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
/** The window.open features: a popup of this size ('max' height = the screen's available height). */
export declare function testSiteWindowFeatures(form: TestSiteForm, screenAvailHeight: number): string;
