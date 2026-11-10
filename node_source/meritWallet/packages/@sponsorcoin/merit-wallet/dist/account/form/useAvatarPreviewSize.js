// File: src/account/form/useAvatarPreviewSize.ts
//
// 2026-11-09 (owner: one base, no duplicated sizing): the size of an avatar / logo preview, written once. It was inside AccountAvatarPanel; the detail screens' own image block (account/DetailImageBlock.tsx) and the avatar panel
// (the web's Edit / Create Account pages) both use it, so the rules for how large the image may be live in this one place:
//   - the room is the screen's (or the most a content-sized frame may grow to), never what the boxes around the image happen to measure now, so hiding the table does not shrink the image;
//   - the controls (the button row) keep their height; the image gives way;
//   - a box that follows the image's shape (aspect) is (width - left - right) / aspect + top + bottom high.
// The caller gives the elements it measures (the section the image sits in, the element whose width is the room across, the controls, an optional heading and selected row) and gets the preview's width back.
'use client';
import { useEffect, useRef, useState } from 'react';
export function useAvatarPreviewSize({ sectionRef, previewStageRef, controlsRef, headingRef, selectedRowRef }, { lockSectionHeight, maxPreviewSize, minPreviewSize, overflowMinPreviewSize, previewHeightBuffer, previewControlGapBuffer, previewSizeBuffer, sectionBottomBuffer, sizingBoundarySelector, traceSizingLabel, hasSelectedRow, resizeSignal, aspect, fitImageShape, imageBuffer, trace, }) {
    const [previewSize, setPreviewSize] = useState(560);
    const [sectionHeight, setSectionHeight] = useState(null);
    const lastSizingTraceRef = useRef('');
    const previewSizeRef = useRef(previewSize);
    useEffect(() => {
        previewSizeRef.current = previewSize;
    }, [previewSize]);
    useEffect(() => {
        const section = sectionRef.current;
        const stage = previewStageRef.current;
        const controls = controlsRef.current;
        if (!section || !stage || !controls || typeof ResizeObserver === 'undefined')
            return;
        let animationFrame = 0;
        const getSizingAncestors = () => {
            const ancestors = [];
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
            const frameMaxBottom = frame ? frame.rect.top + frame.maxHeight : 0;
            const clipBottom = Math.floor(Math.min(viewportBottom, ...sizingAncestors
                .filter((ancestor) => ancestor.clips)
                .map((ancestor) => (frame && sizingAncestors.indexOf(ancestor) <= frameIndex ? frameMaxBottom - (frame.rect.bottom - ancestor.rect.bottom) : ancestor.rect.bottom))));
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
            const availableSectionHeight = Math.floor(Math.max(0, boundary
                ? visibleBoundaryHeight - headingHeight - selectedRowHeight - sectionBottomBuffer
                : sizingBottom - sectionRect.top - sectionBottomBuffer));
            if (lockSectionHeight && availableSectionHeight > 0) {
                setSectionHeight((current) => current === availableSectionHeight ? current : availableSectionHeight);
            }
            const availableWidth = Math.min(rect.width, maxPreviewSize) - previewSizeBuffer;
            const availableHeight = (availableSectionHeight > 0 ? availableSectionHeight : sectionRect.height) -
                headingHeight -
                selectedRowHeight -
                controlsRect.height -
                (previewControlGapBuffer ?? (hasSelectedRow ? 0 : 16)) -
                previewHeightBuffer;
            const effectiveMinPreviewSize = typeof overflowMinPreviewSize === 'number' && availableHeight < minPreviewSize
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
            const elements = new Set([section, stage, controls]);
            const boundary = sizingBoundarySelector
                ? section.closest(sizingBoundarySelector)
                : null;
            if (boundary)
                elements.add(boundary);
            if (section.parentElement)
                elements.add(section.parentElement);
            if (headingRef.current)
                elements.add(headingRef.current);
            if (selectedRowRef.current)
                elements.add(selectedRowRef.current);
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
    return { previewSize, sectionHeight };
}
