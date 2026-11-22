import React from 'react';
export declare const FRAME_SCALE_MIN = 80;
export declare const FRAME_SCALE_MAX = 200;
/** The saved scale lives in the platform's own preference store (the wallet never touches the device itself). */
export declare function useWalletFrameScale(): {
    percent: number;
    setPercent(next: number): void;
};
export declare function frameScaleControl(scale: {
    percent: number;
    setPercent(next: number): void;
}): React.ReactNode;
