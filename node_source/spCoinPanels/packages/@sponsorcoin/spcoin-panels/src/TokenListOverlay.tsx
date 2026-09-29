import { useEffect, type ReactNode } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import {
  usePanelVisible,
  usePanelTree,
  type ActiveListPanelParams,
  getPanelTitle,
} from '@sponsorcoin/spcoin-exchange-engine';
import FloatingSelectPopup from './FloatingSelectPopup';

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

export default function TokenListOverlay({
  panelFlag,
  origin,
  parentPanel,
  contentVisible,
  params,
  leftSlot,
  activeListContent,
  onClose,
  zIndexClassName = 'z-[10000]',
  minHeightClassName = 'min-h-[300px]',
}: TokenListOverlayProps) {
  const parentVisible = usePanelVisible(parentPanel);
  const visible = parentVisible && contentVisible && params?.origin === origin;

  const { setPanelVisible } = usePanelTree();
  useEffect(() => {
    setPanelVisible(panelFlag, visible, 'TokenListOverlay:mirrorVisible');
  }, [visible, setPanelVisible, panelFlag]);

  const title = params?.title || (params ? getPanelTitle(params.feedType) : 'Select an Asset');

  return (
    <FloatingSelectPopup
      open={visible}
      title={title}
      onClose={onClose}
      leftSlot={leftSlot}
      zIndexClassName={zIndexClassName}
      minHeightClassName={minHeightClassName}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[3px]">
        {activeListContent}
      </div>
    </FloatingSelectPopup>
  );
}
