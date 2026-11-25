export declare const DISPLAY_PERCENT_MIN = 80;
export declare const DISPLAY_PERCENT_MAX = 200;
/** 2026-11-20 (owner): a phone starts at 150%. (The wallet's text was drawn at 9 to 11 px for a desktop panel, which a phone shows small.) */
export declare const PHONE_DEFAULT_PERCENT = 150;
/** The size a screen of this width starts at: 150% on a phone, 100% on a wider screen. */
export declare function defaultDisplayPercent(viewportWidth: number): number;
/** Scale the whole page (100 = as designed). */
export declare function applyDisplayPercent(percent: number): void;
/** The size this browser uses (its saved choice, else the default for this screen), applied to the page; `setPercent` is the person's choice, `reset` returns to the default. */
export declare function useDisplayScale(): {
    percent: number;
    defaultPercent: number;
    setPercent(percent: number): void;
    reset(): void;
};
