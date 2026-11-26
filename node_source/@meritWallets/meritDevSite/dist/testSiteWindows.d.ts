import { type PopupLogEntry, type TestSiteForm } from './testSites';
/** The last values used in the Test Sites form (this browser only); anything unreadable falls back to the defaults. */
export declare function readSavedTestSiteForm(): TestSiteForm;
export declare function saveTestSiteForm(form: TestSiteForm): void;
/** The window log (a new array each time it changes: for useSyncExternalStore). */
export declare function getPopupLog(): PopupLogEntry[];
export declare function subscribePopupLog(listener: () => void): () => void;
export declare function clearPopupLog(): void;
export declare function popupLogText(): string;
export declare function installTestSiteListener(): void;
/**
 * Opens the test site the form describes, once, at the best-estimated size, and records it in the log.
 * The window opened last for the same port is closed first and every window gets its own name (a window.open with the name of a window still open reuses that window and keeps its size).
 * Returns null when the fields are not valid or the browser blocked the window.
 */
export declare function openTestSiteWindow(form: TestSiteForm): Window | null;
/** Opens the window the Config -> Test Sites section is set to (its saved values), for a button that is not in that section (the web app's spCoin logo). */
export declare function openSavedTestSiteWindow(): Window | null;
