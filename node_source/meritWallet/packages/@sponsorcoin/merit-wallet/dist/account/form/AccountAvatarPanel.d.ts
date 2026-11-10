import React from 'react';
import type { ReactNode } from 'react';
interface Props {
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
    /** Optional sizing trace sink (the web app's debug trace); no tracing when omitted. */
    trace?: {
        enabled(): boolean;
        append(label: string, payload: unknown): void;
    };
}
export default function AccountAvatarPanel({ trace, panelMarginClass, avatarPanelBorderClass, avatarHeading, logoPreviewSrc, connected, isEditMode, inputLocked, previewButtonLabel, loadingInputMessage, isLoading, acceptedInput, logoFileInputRef, onFileChange, showImage, showButton, headingContent, selectedRowContent, minPreviewSize, maxPreviewSize, uploadControlTextClassName, previewSizeBuffer, previewHeightBuffer, previewControlGapBuffer, sectionBottomBuffer, lockSectionHeight, overflowMinPreviewSize, traceSizingLabel, fillParentHeight, sizingBoundarySelector, resizeSignal, }: Props): React.JSX.Element;
export {};
