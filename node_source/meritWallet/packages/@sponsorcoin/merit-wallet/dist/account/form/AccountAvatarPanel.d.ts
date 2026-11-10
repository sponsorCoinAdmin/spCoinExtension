import React from 'react';
import type { ReactNode } from 'react';
import { type CachedImageKind } from '../../refresh/refreshReact';
export interface AccountAvatarPanelProps {
    panelMarginClass: string;
    avatarPanelBorderClass: string;
    avatarHeading: string;
    logoPreviewSrc: string;
    connected: boolean;
    isEditMode: boolean;
    inputLocked: boolean;
    previewButtonLabel: string;
    loadingInputMessage: string;
    isLoading: boolean;
    acceptedInput: string;
    logoFileInputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showImage?: boolean;
    showButton?: boolean;
    headingContent?: ReactNode;
    selectedRowContent?: ReactNode;
    minPreviewSize?: number;
    maxPreviewSize?: number;
    minControlWidth?: number;
    uploadControlTextClassName?: string;
    previewSizeBuffer?: number;
    previewHeightBuffer?: number;
    previewControlGapBuffer?: number;
    sectionBottomBuffer?: number;
    lockSectionHeight?: boolean;
    overflowMinPreviewSize?: number;
    traceSizingLabel?: string;
    fillParentHeight?: boolean;
    sizingBoundarySelector?: string;
    resizeSignal?: unknown;
    /** A second button beside the upload button ("Account Meta"): a toggle; omitted = the upload button alone. */
    toggleLabel?: string;
    toggleOn?: boolean;
    onToggle?: () => void;
    /** 2026-11-09 (owner): a READ-ONLY avatar (the Token and Network screens): no upload button, the toggle alone in the same rounded button box. */
    hideUpload?: boolean;
    /** The class of the box the image sits in (default: the navy box); a network logo is drawn without a fill. */
    previewBoxClass?: string;
    previewAlt?: string;
    /** Px kept clear between the image box's edges and the image (top, bottom, right, left); the box keeps its size, the image shrinks inside it. */
    imageBuffer?: {
        t?: number;
        b?: number;
        r?: number;
        l?: number;
    };
    /** Which section of the wallet's image cache the image comes from (a refresh reads it through that cache again); omitted: the URL is shown as it is. */
    imageKind?: CachedImageKind;
    /** 2026-11-09 (owner: the empty bands above and below a wide logo): the image's box takes the image's own width-to-height proportion instead of a square. Its width is sized as the square's side was (the room across, and the room down times the proportion). */
    fitImageShape?: boolean;
    /** Optional sizing trace sink (the web app's debug trace); no tracing when omitted. */
    trace?: {
        enabled(): boolean;
        append(label: string, payload: unknown): void;
    };
}
export default function AccountAvatarPanel({ trace, panelMarginClass, avatarPanelBorderClass, avatarHeading, logoPreviewSrc, connected, isEditMode, inputLocked, previewButtonLabel, loadingInputMessage, isLoading, acceptedInput, logoFileInputRef, onFileChange, showImage, showButton, headingContent, selectedRowContent, minPreviewSize, maxPreviewSize, uploadControlTextClassName, previewSizeBuffer, previewHeightBuffer, previewControlGapBuffer, sectionBottomBuffer, lockSectionHeight, overflowMinPreviewSize, traceSizingLabel, fillParentHeight, sizingBoundarySelector, resizeSignal, toggleLabel, toggleOn, onToggle, hideUpload, previewBoxClass, previewAlt, imageBuffer, imageKind, fitImageShape, }: AccountAvatarPanelProps): React.JSX.Element;
