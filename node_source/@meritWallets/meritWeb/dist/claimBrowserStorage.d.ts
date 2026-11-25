/** Run once before anything reads localStorage. Safe to call again: it does nothing after the first time. Returns the names it removed (for the debug log). */
export declare function claimBrowserStorage(): string[];
