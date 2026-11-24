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

import React, { useRef, useState } from 'react';
import { accountDetailClass, avatarPanelClass, avatarPreviewStyle, detailImagePanelStyle, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import AvatarControls from './form/AvatarControls';
import AvatarPicture from './form/AvatarPicture';
import { useAvatarPreviewSize } from './form/useAvatarPreviewSize';
import { imageContentBox, type ImageContentBox } from './form/imageContentBox';
import { useCachedImage, type CachedImageKind } from '../refresh/refreshReact';

/** What a screen decides about its picture; everything else (the limits, the boundary, the toggle's state) is the layout's. */
export interface DetailAvatarProps {
  logoPreviewSrc: string;
  previewAlt?: string;
  /** The class of the picture's box (default: the navy box); a network logo is drawn without a fill. */
  previewBoxClass?: string;
  connected: boolean;
  isEditMode: boolean;
  inputLocked: boolean;
  previewButtonLabel: string;
  loadingInputMessage: string;
  isLoading: boolean;
  logoFileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** A READ-ONLY screen (Token, Network): no upload button, the toggle alone in the same rounded button box. */
  hideUpload?: boolean;
  /** The second button of the row ("Account Meta"): a toggle; omitted = the upload button alone. */
  toggleLabel?: string;
  /** Which section of the wallet's image cache the picture comes from; omitted: the URL is shown as it is. */
  imageKind?: CachedImageKind;
  /** The picture's box takes the picture's own width-to-height proportion instead of a square. */
  fitImageShape?: boolean;
}

export interface DetailImageBlockProps extends DetailAvatarProps {
  id: string;
  /** The block is the last of the screen (the table is hidden): it carries the bottom padding that keeps the buttons whole. */
  last: boolean;
  /** Px kept clear between the box's edges and the picture. */
  imageBuffer: { t: number; b: number; r: number; l: number };
  toggleOn: boolean;
  onToggle: () => void;
  /** Room kept under the block (the active body is pulled up 10px at its edge). */
  sectionBottomBuffer: number;
  /** Anything that changes the room for the picture (it is measured again when this changes). */
  resizeSignal: unknown;
}

export default function DetailImageBlock({
  id,
  last,
  logoPreviewSrc,
  previewAlt = 'Logo preview',
  previewBoxClass,
  connected,
  isEditMode,
  inputLocked,
  previewButtonLabel,
  loadingInputMessage,
  isLoading,
  logoFileInputRef,
  onFileChange,
  hideUpload = false,
  toggleLabel,
  imageKind,
  fitImageShape = true,
  imageBuffer,
  toggleOn,
  onToggle,
  sectionBottomBuffer,
  resizeSignal,
}: DetailImageBlockProps) {
  const previewSrc = useCachedImage(logoPreviewSrc, imageKind);
  // the picture's width divided by its height, known once it has loaded (1 until then, and always 1 for a square box)
  const [imageAspect, setImageAspect] = useState(1);
  // 2026-11-24 (owner rule 1): the visible pixels of the picture, so the box is cut to them (2px above and below) instead of to the file's own empty margins
  const [crop, setCrop] = useState<ImageContentBox | undefined>(undefined);
  const aspect = fitImageShape ? (crop ? (imageAspect * (crop.x1 - crop.x0)) / (crop.y1 - crop.y0) : imageAspect) : 1;
  const blockRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLElement | null>(null);
  const noRef = useRef<HTMLElement | null>(null);
  const { previewSize } = useAvatarPreviewSize(
    // the block is both the section and the stage: its width is the room across, its top the room down
    { sectionRef: blockRef, previewStageRef: blockRef, controlsRef, headingRef: noRef, selectedRowRef: noRef },
    {
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
    },
  );
  return (
    <div id={id} ref={blockRef} className={last ? accountDetailClass.imageBlockLast : accountDetailClass.imageBlock}>
      {/* 2026-11-24 (owner): the white panel holds the picture AND its two buttons (Select Preview Image / Account Meta), the buttons below the picture */}
      <div className={detailImagePanelStyle.panelClass} style={detailImagePanelStyle.panel(previewSize)}>
      <AvatarPicture
        boxClass={previewBoxClass ?? avatarPanelClass.previewBox}
        boxStyle={{ ...avatarPreviewStyle(previewSize, imageBuffer, fitImageShape ? aspect : undefined), ...detailImagePanelStyle.picture }}
        hasImage={!!logoPreviewSrc}
        src={previewSrc}
        alt={previewAlt}
        onLoad={fitImageShape ? (event) => { const { naturalWidth, naturalHeight } = event.currentTarget; if (naturalWidth && naturalHeight) { setImageAspect(naturalWidth / naturalHeight); setCrop(imageContentBox(event.currentTarget)); } } : undefined}
        crop={fitImageShape ? crop : undefined}
        cropAspect={fitImageShape && crop ? aspect : undefined}
      />
      <div className={detailImagePanelStyle.controlsClass} style={detailImagePanelStyle.controls}>
      <AvatarControls
        connected={connected}
        isEditMode={isEditMode}
        inputLocked={inputLocked}
        previewButtonLabel={previewButtonLabel}
        loadingInputMessage={loadingInputMessage}
        isLoading={isLoading}
        logoFileInputRef={logoFileInputRef}
        onFileChange={onFileChange}
        acceptedInput="image/*"
        textClass={walletPartClass.uploadControlText}
        hideUpload={hideUpload}
        toggleLabel={toggleLabel}
        toggleOn={toggleOn}
        onToggle={onToggle}
        controlRef={controlsRef}
      />
      </div>
      </div>
    </div>
  );
}
