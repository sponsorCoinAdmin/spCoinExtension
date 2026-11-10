// File: src/account/form/AccountAvatarPanel.tsx
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor's avatar preview and upload control, moved from the web app's CreateAccountAvatarPanel so both hosts show one editor.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { avatarPanelClass, avatarPreviewStyle, lockedSectionStyle } from '@sponsorcoin/spcoin-common/styles';
import { useRef } from 'react';
import AvatarControls from './AvatarControls';
import AvatarPicture from './AvatarPicture';
import { useAvatarPreviewSize } from './useAvatarPreviewSize';
export default function AccountAvatarPanel({ trace, panelMarginClass, avatarPanelBorderClass, avatarHeading, logoPreviewSrc, connected, isEditMode, inputLocked, previewButtonLabel, loadingInputMessage, isLoading, acceptedInput, logoFileInputRef, onFileChange, showImage = true, showButton = true, headingContent, selectedRowContent, minPreviewSize = 180, maxPreviewSize = 560, uploadControlTextClassName, previewSizeBuffer = 50, previewHeightBuffer = 24, previewControlGapBuffer, sectionBottomBuffer = 15, lockSectionHeight = true, overflowMinPreviewSize, traceSizingLabel, fillParentHeight = true, sizingBoundarySelector, resizeSignal, }) {
    const sectionRef = useRef(null);
    const previewStageRef = useRef(null);
    const controlsRef = useRef(null);
    const headingRef = useRef(null);
    const selectedRowRef = useRef(null);
    const uploadControlTextClass = uploadControlTextClassName ?? 'px-6 text-center text-[120%] font-bold';
    const hasSelectedRow = Boolean(selectedRowContent);
    // the size of the preview is the shared rule (useAvatarPreviewSize.ts), the same one the detail screens' image block uses
    const { previewSize, sectionHeight } = useAvatarPreviewSize({ sectionRef, previewStageRef, controlsRef, headingRef, selectedRowRef }, {
        lockSectionHeight,
        maxPreviewSize,
        minPreviewSize,
        overflowMinPreviewSize,
        previewHeightBuffer,
        previewControlGapBuffer,
        previewSizeBuffer,
        sectionBottomBuffer,
        sizingBoundarySelector,
        traceSizingLabel,
        hasSelectedRow,
        resizeSignal,
        aspect: 1,
        fitImageShape: false,
        trace,
    });
    return (_jsxs("section", { ref: sectionRef, className: avatarPanelClass.section(panelMarginClass, avatarPanelBorderClass, fillParentHeight, hasSelectedRow), style: lockSectionHeight && sectionHeight ? lockedSectionStyle(sectionHeight) : undefined, children: [headingContent ? (_jsx("div", { ref: headingRef, className: avatarPanelClass.headingContent, children: headingContent })) : (avatarHeading ? (_jsx("h2", { ref: headingRef, className: avatarPanelClass.heading, children: avatarHeading })) : null), _jsxs("div", { className: avatarPanelClass.column(fillParentHeight), children: [selectedRowContent ? _jsx("div", { ref: selectedRowRef, className: avatarPanelClass.selectedRow, children: selectedRowContent }) : null, _jsx("div", { ref: previewStageRef, className: avatarPanelClass.stage, children: showImage ? (_jsx(AvatarPicture, { boxClass: avatarPanelClass.previewBox, boxStyle: avatarPreviewStyle(previewSize), hasImage: !!logoPreviewSrc, src: logoPreviewSrc, alt: "Account logo preview" })) : null }), _jsx("div", { ref: controlsRef, className: avatarPanelClass.controls, children: _jsx(AvatarControls, { connected: connected, isEditMode: isEditMode, inputLocked: inputLocked, previewButtonLabel: previewButtonLabel, loadingInputMessage: loadingInputMessage, isLoading: isLoading, logoFileInputRef: logoFileInputRef, onFileChange: onFileChange, acceptedInput: acceptedInput, textClass: uploadControlTextClass, showButton: showButton }) })] })] }));
}
