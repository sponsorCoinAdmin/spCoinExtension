import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { usePanelVisible, usePanelTree, getPanelTitle, } from '@sponsorcoin/spcoin-exchange-engine';
import FloatingSelectPopup from './FloatingSelectPopup';
export default function TokenListOverlay({ panelFlag, origin, parentPanel, contentVisible, params, leftSlot, activeListContent, onClose, zIndexClassName = 'z-[10000]', minHeightClassName = 'min-h-[300px]', }) {
    const parentVisible = usePanelVisible(parentPanel);
    const visible = parentVisible && contentVisible && params?.origin === origin;
    const { setPanelVisible } = usePanelTree();
    useEffect(() => {
        setPanelVisible(panelFlag, visible, 'TokenListOverlay:mirrorVisible');
    }, [visible, setPanelVisible, panelFlag]);
    const title = params?.title || (params ? getPanelTitle(params.feedType) : 'Select an Asset');
    return (_jsx(FloatingSelectPopup, { open: visible, title: title, onClose: onClose, leftSlot: leftSlot, zIndexClassName: zIndexClassName, minHeightClassName: minHeightClassName, children: _jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden pt-[3px]", children: activeListContent }) }));
}
