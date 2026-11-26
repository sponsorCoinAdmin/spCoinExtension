import React from 'react';
/** 2026-11-25 (owner): the screen the wallet drew at 83% is now 100%. The frame's zoom is the slider's percent times this factor, so 100% looks as 83% looked. A size saved under the old key (v1) is converted so the wallet looks the same. */
export declare const FRAME_BASE_FACTOR = 0.83;
export declare const FRAME_SCALE_MIN = 50;
export declare const FRAME_SCALE_MAX = 200;
export declare const META_SCALE_MIN = 50;
export declare const META_SCALE_MAX = 200;
export declare const TABLE_SCALE_MIN = 50;
export declare const TABLE_SCALE_MAX = 200;
/** The saved scale lives in the platform's own preference store (the wallet never touches the device itself). */
export declare function useWalletFrameScale(): {
    percent: number;
    setPercent(next: number): void;
};
export declare function frameScaleControl(scale: {
    percent: number;
    setPercent(next: number): void;
}): React.ReactNode;
/** The Data Table Size (the tables' own zoom; renamed from Table Data Size 2026-11-24, owner), kept in the platform's preference store; 100 = as designed. */
export declare function useTableDataScale(): {
    percent: number;
    setPercent(next: number): void;
};
export declare function tableScaleControl(scale: {
    percent: number;
    setPercent(next: number): void;
}): React.ReactNode;
/** 2026-11-24 (owner): the Meta Table Size (the detail screens' meta tables), kept in the platform's preference store; 100 = as designed. */
export declare function useMetaTableScale(): {
    percent: number;
    setPercent(next: number): void;
};
export declare function metaTableScaleControl(scale: {
    percent: number;
    setPercent(next: number): void;
}): React.ReactNode;
/**
 * 2026-11-24 (owner: pinch on a header bar changes the Display Size): when the wallet scales its OWN frame (the host gave no Display Size slider), it provides that scale to the header bars; when a host owns the scale (the browser page), the host's provider is left alone.
 */
export declare function OwnDisplayScale({ own, scale, children }: {
    own: boolean;
    scale: {
        percent: number;
        setPercent(next: number): void;
    };
    children: React.ReactNode;
}): React.ReactElement;
