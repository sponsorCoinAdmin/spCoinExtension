// File: src/account/form/AccountAvatarPanel.tsx
//
// 2026-10-09 (docs/nodeSourceMigrationPlan.txt row 18) -- the account editor's avatar preview and upload control, moved from the web app's CreateAccountAvatarPanel so both hosts show one editor.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import DisconnectedControl from './DisconnectedControl';
export default function AccountAvatarPanel({ trace, panelMarginClass, avatarPanelBorderClass, avatarHeading, logoPreviewSrc, connected, isEditMode, inputLocked, previewButtonLabel, loadingInputMessage, isLoading, acceptedInput, logoFileInputRef, onFileChange, showImage = true, showButton = true, headingContent, selectedRowContent, minPreviewSize = 180, maxPreviewSize = 560, uploadControlTextClassName, previewSizeBuffer = 50, previewHeightBuffer = 24, previewControlGapBuffer, sectionBottomBuffer = 15, lockSectionHeight = true, overflowMinPreviewSize, traceSizingLabel, fillParentHeight = true, sizingBoundarySelector, resizeSignal, }) {
    const [isUploadHovered, setIsUploadHovered] = useState(false);
    const [previewSize, setPreviewSize] = useState(560);
    const [sectionHeight, setSectionHeight] = useState(null);
    const sectionRef = useRef(null);
    const previewStageRef = useRef(null);
    const controlsRef = useRef(null);
    const headingRef = useRef(null);
    const selectedRowRef = useRef(null);
    const lastSizingTraceRef = useRef('');
    const previewSizeRef = useRef(previewSize);
    const uploadControlClass = 'mx-auto w-full';
    const uploadControlTextClass = uploadControlTextClassName ?? 'px-6 text-center text-[120%] font-bold';
    const hasSelectedRow = Boolean(selectedRowContent);
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
        const transitionTimers = [];
        const getSizingAncestors = () => {
            const ancestors = [];
            let current = section.parentElement;
            while (current && current !== document.body && ancestors.length < 12) {
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
            const clipBottom = Math.floor(Math.min(viewportBottom, ...sizingAncestors
                .filter((ancestor) => ancestor.clips)
                .map((ancestor) => ancestor.rect.bottom)));
            const rect = stage.getBoundingClientRect();
            const controlsRect = controls.getBoundingClientRect();
            const headingHeight = headingRef.current?.getBoundingClientRect().height ?? 0;
            const selectedRowHeight = selectedRowRef.current?.getBoundingClientRect().height ?? 0;
            const measuredBoundaryBottom = boundaryRect?.bottom ?? parentRect?.bottom ?? sectionRect.bottom;
            const sizingBottom = Math.min(measuredBoundaryBottom, clipBottom);
            // Cap boundary height to the visible clipped region to prevent a resize loop
            // where lockSectionHeight expands the section → boundary grows → repeat.
            const visibleBoundaryHeight = boundary && boundaryRect
                ? Math.min(boundary.clientHeight, sizingBottom - boundaryRect.top)
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
            const boundedSize = Math.min(availableWidth, availableHeight, maxPreviewSize);
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
        const scheduleTransitionUpdates = () => {
            scheduleUpdate();
            transitionTimers.push(window.setTimeout(scheduleUpdate, 60));
            transitionTimers.push(window.setTimeout(scheduleUpdate, 140));
            transitionTimers.push(window.setTimeout(scheduleUpdate, 260));
            transitionTimers.push(window.setTimeout(scheduleUpdate, 420));
        };
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
            transitionTimers.forEach((timer) => window.clearTimeout(timer));
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
    ]);
    return (_jsxs("section", { ref: sectionRef, className: `${panelMarginClass} ${avatarPanelBorderClass} order-1 flex ${fillParentHeight ? 'h-full' : 'h-auto'} w-full flex-col items-center justify-start pr-0 ${hasSelectedRow ? 'pt-0' : 'pt-4'} pb-0 pl-0`, style: lockSectionHeight && sectionHeight ? { height: `${sectionHeight}px`, minHeight: `${sectionHeight}px` } : undefined, children: [headingContent ? (_jsx("div", { ref: headingRef, className: "mb-0 w-full max-w-[56rem] px-6 pt-0 md:px-8", children: headingContent })) : (avatarHeading ? (_jsx("h2", { ref: headingRef, className: "mb-4 w-full max-w-[56rem] text-center text-lg font-semibold text-[#5981F3]", children: avatarHeading })) : null), _jsxs("div", { className: `flex ${fillParentHeight ? 'h-full' : 'h-auto'} w-full max-w-[56rem] flex-col items-center gap-0`, children: [selectedRowContent ? _jsx("div", { ref: selectedRowRef, className: "w-full", children: selectedRowContent }) : null, _jsx("div", { ref: previewStageRef, className: "flex min-h-0 w-full shrink-0 justify-center overflow-hidden", children: showImage ? (_jsx("div", { className: "mx-auto flex shrink-0 items-center justify-center overflow-hidden bg-[#0D1324] p-0", style: {
                                width: `${previewSize}px`,
                                height: `${previewSize}px`,
                                maxWidth: '100%',
                                maxHeight: '100%',
                            }, children: logoPreviewSrc ? (_jsx("img", { src: logoPreviewSrc, alt: "Account logo preview", className: "h-full w-full object-contain" })) : (_jsx("span", { className: "text-sm text-slate-300", children: "No logo found on server" })) })) : null }), _jsxs("div", { ref: controlsRef, className: "-mt-px w-full shrink-0", children: [_jsx("input", { ref: logoFileInputRef, id: "logoFileUpload", type: "file", accept: acceptedInput, className: "hidden", "aria-label": "Account logo file upload", title: "Select account logo file", onChange: onFileChange }), showButton ? (_jsx("div", { className: "w-full", children: !connected ? (_jsx(DisconnectedControl, { message: "Wallet Connection Required", className: uploadControlClass })) : (_jsx("button", { type: "button", "aria-disabled": !connected, disabled: !connected, className: `w-full rounded-b border border-white py-2 text-black transition-colors ${!isEditMode
                                        ? isUploadHovered
                                            ? 'bg-red-500 text-black'
                                            : 'bg-[#E5B94F] text-black'
                                        : inputLocked
                                            ? 'bg-red-500 text-black cursor-not-allowed'
                                            : isUploadHovered
                                                ? 'bg-green-500 text-black'
                                                : 'bg-[#E5B94F] text-black'}`, title: isLoading ? loadingInputMessage : previewButtonLabel, onClick: () => {
                                        if (!isEditMode || inputLocked)
                                            return;
                                        if (!logoFileInputRef.current)
                                            return;
                                        logoFileInputRef.current.value = '';
                                        logoFileInputRef.current.click();
                                    }, onMouseEnter: () => setIsUploadHovered(true), onMouseLeave: () => setIsUploadHovered(false), children: _jsx("span", { className: uploadControlTextClass, children: previewButtonLabel }) })) })) : null] })] })] }));
}
