export declare const DEBUG_HOTKEY = "ctrl+alt+b";
export declare const useDebugEnabled: () => boolean;
/** Mount once, in the wallet: reads the saved switch, listens for the hotkey, and sends the page's errors and device facts to the store. */
export declare function useDebugRuntime(): void;
/** The header button: nothing when debug is off. */
export declare function DebugBugButton(): import("react").JSX.Element | null;
/** The Config page's check box. */
export declare function DebugConfigSection(): import("react").JSX.Element;
