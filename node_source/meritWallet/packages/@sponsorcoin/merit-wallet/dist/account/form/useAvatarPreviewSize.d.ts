import { type RefObject } from 'react';
export interface AvatarSizingElements {
    sectionRef: RefObject<HTMLElement | null>;
    previewStageRef: RefObject<HTMLElement | null>;
    controlsRef: RefObject<HTMLElement | null>;
    headingRef: RefObject<HTMLElement | null>;
    selectedRowRef: RefObject<HTMLElement | null>;
}
export interface AvatarSizingOptions {
    lockSectionHeight: boolean;
    maxPreviewSize: number;
    minPreviewSize: number;
    overflowMinPreviewSize?: number;
    previewHeightBuffer: number;
    previewControlGapBuffer?: number;
    previewSizeBuffer: number;
    sectionBottomBuffer: number;
    sizingBoundarySelector?: string;
    traceSizingLabel?: string;
    hasSelectedRow: boolean;
    resizeSignal?: unknown;
    /** The image's width divided by its height when the box follows the image's shape (fitImageShape), else 1. */
    aspect: number;
    fitImageShape: boolean;
    imageBuffer?: {
        t?: number;
        b?: number;
        r?: number;
        l?: number;
    };
    trace?: {
        enabled(): boolean;
        append(label: string, payload: unknown): void;
    };
}
export declare function useAvatarPreviewSize({ sectionRef, previewStageRef, controlsRef, headingRef, selectedRowRef }: AvatarSizingElements, { lockSectionHeight, maxPreviewSize, minPreviewSize, overflowMinPreviewSize, previewHeightBuffer, previewControlGapBuffer, previewSizeBuffer, sectionBottomBuffer, sizingBoundarySelector, traceSizingLabel, hasSelectedRow, resizeSignal, aspect, fitImageShape, imageBuffer, trace, }: AvatarSizingOptions): {
    previewSize: number;
    sectionHeight: number | null;
};
