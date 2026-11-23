import React from 'react';
export declare const FRAME_SCALE_MIN = 80;
export declare const FRAME_SCALE_MAX = 200;
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
/** The Table Data Size (the tables' own zoom), kept in the platform's preference store; 100 = as designed. */
export declare function useTableDataScale(): {
    percent: number;
    setPercent(next: number): void;
};
export declare function tableScaleControl(scale: {
    percent: number;
    setPercent(next: number): void;
}): React.ReactNode;
