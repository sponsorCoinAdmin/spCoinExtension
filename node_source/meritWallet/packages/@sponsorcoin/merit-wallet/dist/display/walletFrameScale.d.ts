import React from 'react';
export declare const FRAME_SCALE_MIN = 80;
export declare const FRAME_SCALE_MAX = 200;
export declare const META_SCALE_MIN = 80;
export declare const META_SCALE_MAX = 200;
export declare const TABLE_SCALE_MIN = 60;
export declare const TABLE_SCALE_MAX = 120;
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
