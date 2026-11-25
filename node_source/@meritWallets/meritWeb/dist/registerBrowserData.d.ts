export type BrowserDataSnapshot = Record<string, unknown>;
/** The snapshot the page registered (for the readers that need the bundled ABIs and the deployment map), or undefined before registration. */
export declare function registeredBrowserData(): BrowserDataSnapshot | undefined;
export declare function registerBrowserData(data: BrowserDataSnapshot): void;
