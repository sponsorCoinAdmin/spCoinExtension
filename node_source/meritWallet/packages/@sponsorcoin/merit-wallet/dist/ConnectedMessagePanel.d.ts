import React from 'react';
import type { MessageAccountEntry, MessageTokenEntry } from '@sponsorcoin/spcoin-common/context';
export interface ConnectedMessagePanelProps {
    renderAccountRow?: (entry: MessageAccountEntry, index: number) => React.ReactNode;
    renderTokenRow?: (entry: MessageTokenEntry, index: number) => React.ReactNode;
}
export default function ConnectedMessagePanel({ renderAccountRow, renderTokenRow }: ConnectedMessagePanelProps): React.JSX.Element;
