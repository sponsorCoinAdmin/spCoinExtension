// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/useDraggablePopup.ts
//
// 2026-09-23 — promoted from lib/hooks/useDraggablePopup.ts. Pure mouse-tracking
// hook, zero web-only deps — safe for the extension too. Same reasoning as
// every other migration this session: the hook is portable, only the data it
// feeds (network options, auth sources) stays in the web app.
import { useCallback, useEffect, useRef, useState } from 'react';
/**
 * Drag-to-reposition for a centered modal/popup — grab the title bar,
 * release anywhere. Usage: apply `style={{ transform: translate(pos.x, pos.y) }}`
 * to the popup's positioned element and spread `onMouseDown={onHeaderMouseDown}`
 * onto its title bar. `resetPos()` re-centers on next open.
 */
export function useDraggablePopup() {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const posRef = useRef(pos);
    posRef.current = pos;
    const dragStateRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    useEffect(() => {
        const onMouseMove = (e) => {
            if (!dragStateRef.current)
                return;
            const next = {
                x: dragStateRef.current.startPosX + e.clientX - dragStateRef.current.startMouseX,
                y: dragStateRef.current.startPosY + e.clientY - dragStateRef.current.startMouseY,
            };
            posRef.current = next;
            setPos(next);
        };
        const onMouseUp = () => {
            dragStateRef.current = null;
            setIsDragging(false);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);
    const onHeaderMouseDown = useCallback((e) => {
        const target = e.target;
        if (target.closest('button, input, a, select, [role="button"]'))
            return;
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
        dragStateRef.current = {
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startPosX: posRef.current.x,
            startPosY: posRef.current.y,
        };
        setIsDragging(true);
    }, []);
    const resetPos = useCallback(() => {
        posRef.current = { x: 0, y: 0 };
        setPos({ x: 0, y: 0 });
    }, []);
    return { pos, isDragging, onHeaderMouseDown, resetPos };
}
