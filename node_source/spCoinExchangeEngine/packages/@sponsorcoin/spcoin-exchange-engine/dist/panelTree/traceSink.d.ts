export type PanelTreeTraceFn = (message: string, data?: Record<string, unknown>) => void;
/** Wire a real trace sink (e.g. the web app's appendDebugTrace) in once,
 *  at app boot. Omit entirely for a consumer with no debug-trace UI. */
export declare function setPanelTreeTraceSink(fn: PanelTreeTraceFn): void;
/** Internal — every panel-tree file traces through this instead of
 *  calling a concrete logger directly. */
export declare function panelTreeTrace(message: string, data?: Record<string, unknown>): void;
