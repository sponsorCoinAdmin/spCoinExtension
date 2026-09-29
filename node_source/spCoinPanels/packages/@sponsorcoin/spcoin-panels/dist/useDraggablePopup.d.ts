/**
 * Drag-to-reposition for a centered modal/popup — grab the title bar,
 * release anywhere. Usage: apply `style={{ transform: translate(pos.x, pos.y) }}`
 * to the popup's positioned element and spread `onMouseDown={onHeaderMouseDown}`
 * onto its title bar. `resetPos()` re-centers on next open.
 */
export declare function useDraggablePopup(): {
    pos: {
        x: number;
        y: number;
    };
    isDragging: boolean;
    onHeaderMouseDown: (e: React.MouseEvent) => void;
    resetPos: () => void;
};
