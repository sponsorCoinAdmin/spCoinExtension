/** 2026-11-25 (owner): the screen the wallet drew at 83% is now 100%. The page zoom is the slider's percent times this factor, so 100% looks as 83% looked, 200% as 166% did. A size saved under the old key (v1, before this) is converted so it looks the same. */
export declare const DISPLAY_BASE_FACTOR = 0.83;
export declare const DISPLAY_PERCENT_MIN = 50;
export declare const DISPLAY_PERCENT_MAX = 200;
/** 2026-11-20 (owner): a phone starts at 150%. (The wallet's text was drawn at 9 to 11 px for a desktop panel, which a phone shows small.) */
export declare const PHONE_DEFAULT_PERCENT = 180;
/** The size a screen of this width starts at: 180% on a phone, 100% on a wider screen. */
export declare function defaultDisplayPercent(viewportWidth: number): number;
/** Scale the whole page (100 = the base size, DISPLAY_BASE_FACTOR of the size the wallet was drawn at). */
export declare function applyDisplayPercent(percent: number): void;
/** The size this browser uses (its saved choice, else the default for this screen), applied to the page; `setPercent` is the person's choice, `reset` returns to the default. */
export declare function useDisplayScale(): {
    percent: number;
    defaultPercent: number;
    setPercent(percent: number): void;
    reset(): void;
};
