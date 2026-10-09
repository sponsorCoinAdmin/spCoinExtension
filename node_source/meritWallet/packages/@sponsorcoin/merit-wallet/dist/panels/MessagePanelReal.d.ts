import { type ReactNode } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { ErrorMessage, MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
export interface MessagePanelRealProps {
    panelId?: SP_COIN_DISPLAY;
    errorMessage: ErrorMessage | undefined;
    renderAccountRow: (entry: MessageAccountEntry, index: number) => ReactNode;
    renderTokenRow: (entry: MessageTokenEntry, index: number) => ReactNode;
}
export default function MessagePanelReal({ panelId, errorMessage, renderAccountRow, renderTokenRow, }: MessagePanelRealProps): import("react").JSX.Element | null;
