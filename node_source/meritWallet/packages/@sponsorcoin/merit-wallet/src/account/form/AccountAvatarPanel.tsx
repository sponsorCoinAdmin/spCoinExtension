// File: src/account/form/AccountAvatarPanel.tsx
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor's avatar preview and upload control, moved from the web app's CreateAccountAvatarPanel so both hosts show one editor.
'use client';

import { avatarPanelClass, avatarPreviewStyle, lockedSectionStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import DisconnectedControl from './DisconnectedControl';
import { useCachedImage, type CachedImageKind } from '../../refresh/refreshReact';

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
  imageBuffer?: { t?: number; b?: number; r?: number; l?: number };
  /** Which section of the wallet's image cache the image comes from (a refresh reads it through that cache again); omitted: the URL is shown as it is. */
  imageKind?: CachedImageKind;
  /** 2026-11-09 (owner: the empty bands above and below a wide logo): the image's box takes the image's own width-to-height proportion instead of a square. Its width is sized as the square's side was (the room across, and the room down times the proportion). */
  fitImageShape?: boolean;
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
  toggleLabel,
  toggleOn = true,
  onToggle,
  hideUpload = false,
  previewBoxClass,
  previewAlt = 'Account logo preview',
  imageBuffer,
  imageKind,
  fitImageShape = false,
}: AccountAvatarPanelProps) {
  // the image is read through the wallet's image cache, and is a node of the refresh tree: Refresh fetches it again into that cache (refresh/refreshReact.tsx)
  const previewSrc = useCachedImage(logoPreviewSrc, imageKind);
  const [isUploadHovered, setIsUploadHovered] = useState(false);
  const [previewSize, setPreviewSize] = useState(560);
  // the image's width divided by its height, known once it has loaded (1 until then, and always 1 for a square box)
  const [imageAspect, setImageAspect] = useState(1);
  const aspect = fitImageShape ? imageAspect : 1;
  const [sectionHeight, setSectionHeight] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLDivElement | null>(null);
  const selectedRowRef = useRef<HTMLDivElement | null>(null);
  const lastSizingTraceRef = useRef('');
  const previewSizeRef = useRef(previewSize);
  const uploadControlClass = 'mx-auto w-full';
  const uploadControlTextClass =
    uploadControlTextClassName ?? 'px-6 text-center text-[120%] font-bold';
  const hasSelectedRow = Boolean(selectedRowContent);

  useEffect(() => {
    previewSizeRef.current = previewSize;
  }, [previewSize]);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = previewStageRef.current;
    const controls = controlsRef.current;
    if (!section || !stage || !controls || typeof ResizeObserver === 'undefined') return;

    let animationFrame = 0;

    const getSizingAncestors = () => {
      const ancestors: {
        tag: string;
        id: string;
        dataPanel: string;
        className: string;
        overflowY: string;
        rect: { top: number; bottom: number; height: number };
        clientHeight: number;
        scrollHeight: number;
        /** The ancestor's own max-height in px (a box that grows with its content up to this), or null when it has none. */
        maxHeight: number | null;
        clips: boolean;
      }[] = [];
      let current = section.parentElement;

      while (current && current !== document.body && ancestors.length < 24) {
        const styles = window.getComputedStyle(current);
        const rect = current.getBoundingClientRect();
        const overflowY = styles.overflowY;
        const overflow = styles.overflow;
        const clips = ['auto', 'scroll', 'hidden', 'clip'].includes(overflowY) ||
          ['auto', 'scroll', 'hidden', 'clip'].includes(overflow);

        ancestors.push({
          tag: current.tagName.toLowerCase(),
          id: current.id,
          dataPanel: current.getAttribute('data-panel') ?? '',
          className: String(current.getAttribute('class') ?? '').slice(0, 120),
          overflowY,
          rect: {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            height: Math.round(rect.height),
          },
          clientHeight: current.clientHeight,
          scrollHeight: current.scrollHeight,
          maxHeight: Number.isFinite(parseFloat(styles.maxHeight)) ? parseFloat(styles.maxHeight) : null,
          clips,
        });

        current = current.parentElement;
      }

      return ancestors;
    };

    const updatePreviewSize = () => {
      const sectionRect = section.getBoundingClientRect();
      const parentRect = section.parentElement?.getBoundingClientRect();
      const boundary = sizingBoundarySelector
        ? section.closest(sizingBoundarySelector)
        : null;
      const boundaryRect = boundary?.getBoundingClientRect();
      const sizingAncestors = getSizingAncestors();
      const viewportBottom = window.innerHeight;
      // 2026-11-09 (owner: hiding Account Meta shrank the image; it must always be as large as the screen allows): with the section height not locked, the boxes around the image size themselves to their
      // content, so their current bottoms shrink when the content does and would shrink the image again. The room is then the screen's, or the most such a box may grow to (its max-height).
      // The frame (the outermost ancestor with a max-height) is where the boxes inside stop growing; each clipping box inside it then ends the same distance above the frame's bottom (its padding, border) as it does now,
      // so its bottom when the frame is at its maximum is the frame's maximum bottom minus that distance. A clipping box OUTSIDE the frame (the page's own scroller) is sized by the page, not by the frame's content, so its bottom is used as it is.
      const frameIndex = lockSectionHeight ? -1 : sizingAncestors.map((ancestor) => ancestor.maxHeight !== null).lastIndexOf(true);
      const contentSized = frameIndex >= 0;
      const frame = contentSized ? sizingAncestors[frameIndex] : undefined;
      const frameMaxBottom = frame ? frame.rect.top + (frame.maxHeight as number) : 0;
      const clipBottom = Math.floor(
        Math.min(
          viewportBottom,
          ...sizingAncestors
            .filter((ancestor) => ancestor.clips)
            .map((ancestor) => (frame && sizingAncestors.indexOf(ancestor) <= frameIndex ? frameMaxBottom - (frame.rect.bottom - ancestor.rect.bottom) : ancestor.rect.bottom)),
        ),
      );
      const rect = stage.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      const headingHeight = headingRef.current?.getBoundingClientRect().height ?? 0;
      const selectedRowHeight = selectedRowRef.current?.getBoundingClientRect().height ?? 0;
      const measuredBoundaryBottom = boundaryRect?.bottom ?? parentRect?.bottom ?? sectionRect.bottom;
      const sizingBottom = contentSized ? clipBottom : Math.min(measuredBoundaryBottom, clipBottom);
      // Cap boundary height to the visible clipped region to prevent a resize loop
      // where lockSectionHeight expands the section → boundary grows → repeat.
      const visibleBoundaryHeight = boundary && boundaryRect
        ? contentSized ? sizingBottom - boundaryRect.top : Math.min(boundary.clientHeight, sizingBottom - boundaryRect.top)
        : 0;
      const availableSectionHeight = Math.floor(
        Math.max(
          0,
          boundary
            ? visibleBoundaryHeight - headingHeight - selectedRowHeight - sectionBottomBuffer
            : sizingBottom - sectionRect.top - sectionBottomBuffer,
        ),
      );
      if (lockSectionHeight && availableSectionHeight > 0) {
        setSectionHeight((current) =>
          current === availableSectionHeight ? current : availableSectionHeight,
        );
      }
      const availableWidth = Math.min(rect.width, maxPreviewSize) - previewSizeBuffer;
      const availableHeight =
        (availableSectionHeight > 0 ? availableSectionHeight : sectionRect.height) -
        headingHeight -
        selectedRowHeight -
        controlsRect.height -
        (previewControlGapBuffer ?? (hasSelectedRow ? 0 : 16)) -
        previewHeightBuffer;
      const effectiveMinPreviewSize =
        typeof overflowMinPreviewSize === 'number' && availableHeight < minPreviewSize
          ? overflowMinPreviewSize
          : minPreviewSize;
      // a box that follows the image's shape is (width - left - right) / aspect + top + bottom high, so the width the height allows is (height - top - bottom) * aspect + left + right
      const fitWidthFromHeight = fitImageShape ? (availableHeight - (imageBuffer?.t ?? 0) - (imageBuffer?.b ?? 0)) * aspect + (imageBuffer?.l ?? 0) + (imageBuffer?.r ?? 0) : availableHeight;
      const boundedSize = Math.min(availableWidth, fitWidthFromHeight, maxPreviewSize);
      const nextSize = Math.floor(Math.max(effectiveMinPreviewSize, boundedSize));
      if (traceSizingLabel && trace?.enabled()) {
        const tracePayload = {
          section: {
            width: Math.round(sectionRect.width),
            height: Math.round(sectionRect.height),
            top: Math.round(sectionRect.top),
            bottom: Math.round(sectionRect.bottom),
          },
          parent: parentRect
            ? {
                width: Math.round(parentRect.width),
                height: Math.round(parentRect.height),
                bottom: Math.round(parentRect.bottom),
              }
            : null,
          boundary: boundaryRect
            ? {
                selector: sizingBoundarySelector,
                width: Math.round(boundaryRect.width),
                height: Math.round(boundaryRect.height),
                top: Math.round(boundaryRect.top),
                bottom: Math.round(boundaryRect.bottom),
              }
            : null,
          viewport: {
            innerHeight: window.innerHeight,
            clipBottom,
            measuredBoundaryBottom: Math.round(measuredBoundaryBottom),
            sizingBottom,
            sizingBottomSource: measuredBoundaryBottom <= clipBottom ? 'boundary' : 'clip',
          },
          ancestors: sizingAncestors,
          stage: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          measured: {
            headingHeight: Math.round(headingHeight),
            selectedRowHeight: Math.round(selectedRowHeight),
            controlsHeight: Math.round(controlsRect.height),
          },
          buffers: {
            previewSizeBuffer,
            previewHeightBuffer,
            previewControlGapBuffer: previewControlGapBuffer ?? (hasSelectedRow ? 0 : 16),
            sectionBottomBuffer,
          },
          available: {
            sectionHeight: Math.round(availableSectionHeight),
            width: Math.round(availableWidth),
            height: Math.round(availableHeight),
          },
          limits: {
            minPreviewSize,
            overflowMinPreviewSize,
            effectiveMinPreviewSize,
            maxPreviewSize,
          },
          result: {
            boundedSize: Math.round(boundedSize),
            nextSize,
            previousSize: previewSizeRef.current,
            lockSectionHeight,
          },
        };
        const traceKey = JSON.stringify(tracePayload);
        if (lastSizingTraceRef.current !== traceKey) {
          lastSizingTraceRef.current = traceKey;
          trace?.append(`${traceSizingLabel}:avatarSizing`, tracePayload);
        }
      }
      setPreviewSize((current) => (current === nextSize ? current : nextSize));
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updatePreviewSize);
    };

    // docs/meritMigration.txt row 37: re-measure when the layout says it changed (the ResizeObserver on the section, its ancestors and the stage, and transitionend), not on four guessed delays after it (60, 140, 260, 420 ms).
    const scheduleTransitionUpdates = scheduleUpdate;

    const getObservedLayoutElements = () => {
      const elements = new Set<Element>([section, stage, controls]);
      const boundary = sizingBoundarySelector
        ? section.closest(sizingBoundarySelector)
        : null;

      if (boundary) elements.add(boundary);
      if (section.parentElement) elements.add(section.parentElement);
      if (headingRef.current) elements.add(headingRef.current);
      if (selectedRowRef.current) elements.add(selectedRowRef.current);

      let current = section.parentElement;
      while (current && current !== document.body && elements.size < 24) {
        elements.add(current);
        current = current.parentElement;
      }

      return Array.from(elements);
    };

    const observedElements = getObservedLayoutElements();
    const observer = new ResizeObserver(scheduleTransitionUpdates);
    observedElements.forEach((element) => {
      observer.observe(element);
      element.addEventListener('transitionend', scheduleTransitionUpdates);
    });

    scheduleTransitionUpdates();
    window.addEventListener('resize', scheduleTransitionUpdates);
    window.visualViewport?.addEventListener('resize', scheduleTransitionUpdates);

    return () => {
      observer.disconnect();
      observedElements.forEach((element) => {
        element.removeEventListener('transitionend', scheduleTransitionUpdates);
      });
      window.removeEventListener('resize', scheduleTransitionUpdates);
      window.visualViewport?.removeEventListener('resize', scheduleTransitionUpdates);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [
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
    aspect,
    fitImageShape,
    imageBuffer?.t,
    imageBuffer?.b,
    imageBuffer?.l,
    imageBuffer?.r,
  ]);

  return (
    <section
      ref={sectionRef}
      className={avatarPanelClass.section(panelMarginClass, avatarPanelBorderClass, fillParentHeight, hasSelectedRow, fitImageShape)}
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
            <div
              className={previewBoxClass ?? avatarPanelClass.previewBox}
              style={avatarPreviewStyle(previewSize, imageBuffer, fitImageShape ? aspect : undefined)}
            >
              {logoPreviewSrc ? (
                <img
                  src={previewSrc}
                  onLoad={fitImageShape ? (event) => { const { naturalWidth, naturalHeight } = event.currentTarget; if (naturalWidth && naturalHeight) setImageAspect(naturalWidth / naturalHeight); } : undefined}
                  alt={previewAlt}
                  className={avatarPanelClass.previewImage}
                />
              ) : (
                <span className={avatarPanelClass.noLogo}>No logo found on server</span>
              )}
            </div>
          ) : null}
        </div>
        <div ref={controlsRef} className={avatarPanelClass.controls}>
          <input
            ref={logoFileInputRef}
            id="logoFileUpload"
            type="file"
            accept={acceptedInput}
            className={avatarPanelClass.hidden}
            aria-label="Account logo file upload"
            title="Select account logo file"
            onChange={onFileChange}
          />
          {showButton ? (
            <div className={avatarPanelClass.buttonWrap}>
              {!connected ? (
                <DisconnectedControl
                  message="Wallet Connection Required"
                  className={uploadControlClass}
                />
              ) : (
                <div className={toggleLabel ? avatarPanelClass.buttonSplit : undefined}>
                {hideUpload ? null : <button
                  type="button"
                  aria-disabled={!connected}
                  disabled={!connected}
                  className={toggleLabel ? avatarPanelClass.splitUpload(isUploadHovered) : avatarPanelClass.uploadButton({ isEditMode, isUploadHovered, inputLocked })}
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
                  <span className={uploadControlTextClass}>{previewButtonLabel}</span>
                </button>}
                {toggleLabel ? (
                  <button type="button" aria-pressed={toggleOn} className={avatarPanelClass.splitToggle(toggleOn)} title={toggleOn ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`} onClick={onToggle}>
                    <span className={uploadControlTextClass}>{toggleLabel}</span>
                  </button>
                ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
