// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/DetailImageBlock.tsx
//
// 2026-11-09 (owner: "the image is nested in three panels; remove as many unnecessary wrappers as possible"): the logo block of the detail screens, with nothing around the picture that does not have to be there:
//   <div id=ACCOUNT_LOGO>            the block: a column, the one element the sizing measures, carries the bottom padding when it is the last block
//     <div picture box>              the picture's box: its size, its buffers, its fill
//       <img>
//     <button row>                   the rounded button row (Select Preview Image | Account Meta), measured so the picture gives way to it
// It replaces the section / column / stage / controls / button-wrap boxes the avatar panel put between the block and the picture (AccountAvatarPanel is still the editor of the Edit / Create Account pages). The size of the picture is
// the shared rule in form/useAvatarPreviewSize.ts: as large as the screen allows, the buttons keep their height, the PANEL scrolls (2026-11-09, owner: no scrolling table). The picture is read through the wallet's image cache (refresh/refreshReact.tsx useCachedImage).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { accountDetailClass, avatarPanelClass, avatarPreviewStyle, detailImagePanelStyle, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import AvatarControls from './form/AvatarControls';
import AvatarPicture from './form/AvatarPicture';
import { useAvatarPreviewSize } from './form/useAvatarPreviewSize';
import { imageContentBox } from './form/imageContentBox';
import { useCachedImage } from '../refresh/refreshReact';
export default function DetailImageBlock({ id, last, logoPreviewSrc, previewAlt = 'Logo preview', previewBoxClass, connected, isEditMode, inputLocked, previewButtonLabel, loadingInputMessage, isLoading, logoFileInputRef, onFileChange, hideUpload = false, toggleLabel, imageKind, fitImageShape = true, imageBuffer, toggleOn, onToggle, sectionBottomBuffer, resizeSignal, }) {
    const previewSrc = useCachedImage(logoPreviewSrc, imageKind);
    // the picture's width divided by its height, known once it has loaded (1 until then, and always 1 for a square box)
    const [imageAspect, setImageAspect] = useState(1);
    // 2026-11-24 (owner rule 1): the visible pixels of the picture, so the box is cut to them (2px above and below) instead of to the file's own empty margins
    const [crop, setCrop] = useState(undefined);
    const aspect = fitImageShape ? (crop ? (imageAspect * (crop.x1 - crop.x0)) / (crop.y1 - crop.y0) : imageAspect) : 1;
    const blockRef = useRef(null);
    const controlsRef = useRef(null);
    const noRef = useRef(null);
    const { previewSize } = useAvatarPreviewSize(
    // the block is both the section and the stage: its width is the room across, its top the room down
    { sectionRef: blockRef, previewStageRef: blockRef, controlsRef, headingRef: noRef, selectedRowRef: noRef }, {
        lockSectionHeight: false,
        maxPreviewSize: 420,
        minPreviewSize: 180,
        overflowMinPreviewSize: 96,
        previewHeightBuffer: 8,
        previewControlGapBuffer: 0,
        previewSizeBuffer: 0,
        sectionBottomBuffer,
        sizingBoundarySelector: '#ACTIVE_ACCOUNT_BODY',
        hasSelectedRow: false,
        resizeSignal,
        aspect,
        fitImageShape,
        imageBuffer,
    });
    return (_jsx("div", { id: id, ref: blockRef, className: last ? accountDetailClass.imageBlockLast : accountDetailClass.imageBlock, children: _jsxs("div", { className: detailImagePanelStyle.panelClass, style: detailImagePanelStyle.panel(previewSize), children: [_jsx(AvatarPicture, { boxClass: previewBoxClass ?? avatarPanelClass.previewBox, boxStyle: { ...avatarPreviewStyle(previewSize, imageBuffer, fitImageShape ? aspect : undefined), ...detailImagePanelStyle.picture }, hasImage: !!logoPreviewSrc, src: previewSrc, alt: previewAlt, onLoad: fitImageShape ? (event) => { const { naturalWidth, naturalHeight } = event.currentTarget; if (naturalWidth && naturalHeight) {
                        setImageAspect(naturalWidth / naturalHeight);
                        setCrop(imageContentBox(event.currentTarget));
                    } } : undefined, crop: fitImageShape ? crop : undefined, cropAspect: fitImageShape && crop ? aspect : undefined }), _jsx("div", { className: detailImagePanelStyle.controlsClass, style: detailImagePanelStyle.controls, children: _jsx(AvatarControls, { connected: connected, isEditMode: isEditMode, inputLocked: inputLocked, previewButtonLabel: previewButtonLabel, loadingInputMessage: loadingInputMessage, isLoading: isLoading, logoFileInputRef: logoFileInputRef, onFileChange: onFileChange, acceptedInput: "image/*", textClass: walletPartClass.uploadControlText, hideUpload: hideUpload, toggleLabel: toggleLabel, toggleOn: toggleOn, onToggle: onToggle, controlRef: controlsRef }) })] }) }));
}
