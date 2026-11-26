/** 2026-11-25 (owner): the screen the wallet drew at 83% is now 100%. The page zoom is the slider's percent times this factor, so 100% looks as 83% looked, 200% as 166% did. A size saved under the old key (v1, before this) is converted so it looks the same. */
export declare const DISPLAY_BASE_FACTOR = 0.83;
export declare const DISPLAY_PERCENT_MIN = 50;
export declare const DISPLAY_PERCENT_MAX = 200;
/** 2026-11-26 (owner: it did not work on the phone): every device starts at 100%. The window width fits the elements to the screen (merit-wallet browserZoomCompensation), a phone included, so no device needs a larger starting size of its own. (Until 2026-11-25 a phone started at 150%, later 180%.) */
export declare function defaultDisplayPercent(): number;
/** Scale the whole page (100 = the base size, DISPLAY_BASE_FACTOR of the size the wallet was drawn at). */
export declare function applyDisplayPercent(percent: number): void;
/** The size this browser uses (its saved choice, else the default for this screen), applied to the page; `setPercent` is the person's choice, `reset` returns to the default. */
export declare function useDisplayScale(): {
    percent: number;
    defaultPercent: number;
    setPercent(percent: number): void;
    reset(): void;
};
