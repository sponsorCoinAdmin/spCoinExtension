import { type ReactNode } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { type ActiveListPanelParams } from '@sponsorcoin/spcoin-exchange-engine';
export interface TokenListOverlayProps {
    panelFlag: SP_COIN_DISPLAY;
    origin: string;
    parentPanel: SP_COIN_DISPLAY;
    contentVisible: boolean;
    params: ActiveListPanelParams | null;
    leftSlot?: ReactNode;
    activeListContent: ReactNode;
    onClose: () => void;
    zIndexClassName?: string;
    minHeightClassName?: string;
}
export default function TokenListOverlay({ panelFlag, origin, parentPanel, contentVisible, params, leftSlot, activeListContent, onClose, zIndexClassName, minHeightClassName, }: TokenListOverlayProps): import("react").JSX.Element;
