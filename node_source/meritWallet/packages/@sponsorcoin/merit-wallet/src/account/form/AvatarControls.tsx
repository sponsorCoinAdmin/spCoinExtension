// File: src/account/form/AvatarControls.tsx
//
// 2026-11-09 (owner: "the button row exists twice, can we merge this?"): the controls of an avatar / logo, written once: the hidden file input and the Select Preview Image button, which is (a) alone, full width (the avatar panel of the Edit / Create
// Account pages), (b) split in one rounded box with a toggle beside it (the detail screens: "Account Meta", "Token Meta", "Network Meta"), (c) the toggle alone (the read-only screens), or (d) the "Wallet Connection Required" notice when the
// wallet is not connected. The detail screens' image block (account/DetailImageBlock.tsx) and the avatar panel (AccountAvatarPanel.tsx) both draw it.
// The element that is measured so the picture gives way to the controls is the control itself (controlRef): the split box, the single button or the notice.
'use client';

import React, { useState } from 'react';
import { avatarPanelClass } from '@sponsorcoin/spcoin-common/styles';
import DisconnectedControl from './DisconnectedControl';

export interface AvatarControlsProps {
  connected: boolean;
  isEditMode: boolean;
  inputLocked: boolean;
  previewButtonLabel: string;
  loadingInputMessage: string;
  isLoading: boolean;
  logoFileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  acceptedInput: string;
  /** The class of the words inside a button. */
  textClass: string;
  /** Draw the buttons at all (the avatar panel can hide them). */
  showButton?: boolean;
  /** A READ-ONLY screen: no upload button, the toggle alone. */
  hideUpload?: boolean;
  /** The second button ("Account Meta"): a toggle; omitted = the upload button alone. */
  toggleLabel?: string;
  toggleOn?: boolean;
  onToggle?: () => void;
  /** Receives the control element (the split box, the single button or the notice). */
  controlRef?: React.MutableRefObject<HTMLElement | null>;
}

export default function AvatarControls({
  connected,
  isEditMode,
  inputLocked,
  previewButtonLabel,
  loadingInputMessage,
  isLoading,
  logoFileInputRef,
  onFileChange,
  acceptedInput,
  textClass,
  showButton = true,
  hideUpload = false,
  toggleLabel,
  toggleOn = true,
  onToggle,
  controlRef,
}: AvatarControlsProps) {
  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const ref = (element: HTMLElement | null) => {
    if (controlRef) controlRef.current = element;
  };
  const upload = (className: string) => (
    <button
      type="button"
      ref={toggleLabel ? undefined : ref}
      aria-disabled={!connected}
      disabled={!connected}
      className={className}
      title={isLoading ? loadingInputMessage : previewButtonLabel}
      onClick={() => {
        if (!isEditMode || inputLocked) return;
        if (!logoFileInputRef.current) return;
        logoFileInputRef.current.value = '';
        logoFileInputRef.current.click();
      }}
      onMouseEnter={() => setIsUploadHovered(true)}
      onMouseLeave={() => setIsUploadHovered(false)}
    >
      <span className={textClass}>{previewButtonLabel}</span>
    </button>
  );
  return (
    <>
      <input ref={logoFileInputRef} id="logoFileUpload" type="file" accept={acceptedInput} className={avatarPanelClass.hidden} aria-label="Account logo file upload" title="Select account logo file" onChange={onFileChange} />
      {!showButton ? null : !connected ? (
        <div ref={ref} className={avatarPanelClass.buttonWrap}>
          <DisconnectedControl message="Wallet Connection Required" className={avatarPanelClass.buttonWrap} />
        </div>
      ) : toggleLabel ? (
        <div ref={ref} className={avatarPanelClass.buttonSplit}>
          {hideUpload ? null : upload(avatarPanelClass.splitUpload(isUploadHovered))}
          <button type="button" aria-pressed={toggleOn} className={avatarPanelClass.splitToggle(toggleOn)} title={toggleOn ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`} onClick={onToggle}>
            <span className={textClass}>{toggleLabel}</span>
          </button>
        </div>
      ) : (
        upload(avatarPanelClass.uploadButton({ isEditMode, isUploadHovered, inputLocked }))
      )}
    </>
  );
}
