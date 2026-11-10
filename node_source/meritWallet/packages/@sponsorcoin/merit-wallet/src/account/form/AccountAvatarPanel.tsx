// File: src/account/form/AccountAvatarPanel.tsx
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor's avatar preview and upload control, moved from the web app's CreateAccountAvatarPanel so both hosts show one editor.
'use client';

import { avatarPanelClass, avatarPreviewStyle, lockedSectionStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useRef } from 'react';
import type { ReactNode } from 'react';
import AvatarControls from './AvatarControls';
import AvatarPicture from './AvatarPicture';
import { useAvatarPreviewSize } from './useAvatarPreviewSize';

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
  trace?: { enabled(): boolean; append(label: string, payload: unknown): void };
}

export default function AccountAvatarPanel({
  trace,
  panelMarginClass,
  avatarPanelBorderClass,
  avatarHeading,
  logoPreviewSrc,
  connected,
  isEditMode,
  inputLocked,
  previewButtonLabel,
  loadingInputMessage,
  isLoading,
  acceptedInput,
  logoFileInputRef,
  onFileChange,
  showImage = true,
  showButton = true,
  headingContent,
  selectedRowContent,
  minPreviewSize = 180,
  maxPreviewSize = 560,
  uploadControlTextClassName,
  previewSizeBuffer = 50,
  previewHeightBuffer = 24,
  previewControlGapBuffer,
  sectionBottomBuffer = 15,
  lockSectionHeight = true,
  overflowMinPreviewSize,
  traceSizingLabel,
  fillParentHeight = true,
  sizingBoundarySelector,
  resizeSignal,
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLDivElement | null>(null);
  const selectedRowRef = useRef<HTMLDivElement | null>(null);
  const uploadControlTextClass =
    uploadControlTextClassName ?? 'px-6 text-center text-[120%] font-bold';
  const hasSelectedRow = Boolean(selectedRowContent);

  // the size of the preview is the shared rule (useAvatarPreviewSize.ts), the same one the detail screens' image block uses
  const { previewSize, sectionHeight } = useAvatarPreviewSize(
    { sectionRef, previewStageRef, controlsRef, headingRef, selectedRowRef },
    {
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
    },
  );

  return (
    <section
      ref={sectionRef}
      className={avatarPanelClass.section(panelMarginClass, avatarPanelBorderClass, fillParentHeight, hasSelectedRow)}
      style={lockSectionHeight && sectionHeight ? lockedSectionStyle(sectionHeight) : undefined}
    >
{headingContent ? (
        <div ref={headingRef} className={avatarPanelClass.headingContent}>{headingContent}</div>
      ) : (
        avatarHeading ? (
          <h2 ref={headingRef as React.RefObject<HTMLHeadingElement>} className={avatarPanelClass.heading}>
            {avatarHeading}
          </h2>
        ) : null
      )}
      <div className={avatarPanelClass.column(fillParentHeight)}>
        {selectedRowContent ? <div ref={selectedRowRef} className={avatarPanelClass.selectedRow}>{selectedRowContent}</div> : null}
        <div ref={previewStageRef} className={avatarPanelClass.stage}>
          {showImage ? (
            <AvatarPicture boxClass={avatarPanelClass.previewBox} boxStyle={avatarPreviewStyle(previewSize)} hasImage={!!logoPreviewSrc} src={logoPreviewSrc} alt="Account logo preview" />
          ) : null}
        </div>
        <div ref={controlsRef} className={avatarPanelClass.controls}>
          <AvatarControls
            connected={connected}
            isEditMode={isEditMode}
            inputLocked={inputLocked}
            previewButtonLabel={previewButtonLabel}
            loadingInputMessage={loadingInputMessage}
            isLoading={isLoading}
            logoFileInputRef={logoFileInputRef}
            onFileChange={onFileChange}
            acceptedInput={acceptedInput}
            textClass={uploadControlTextClass}
            showButton={showButton}
          />
        </div>
      </div>
    </section>
  );
}
