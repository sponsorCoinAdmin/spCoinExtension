import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export type StakingControllerPanelMode = 'SPONSOR' | 'STAKE' | 'REVOKE';
export interface StakingControllerPanelProps {
    panelId?: SP_COIN_DISPLAY;
    configPanelId?: SP_COIN_DISPLAY;
    parentPanelId?: SP_COIN_DISPLAY;
    sponsorMode?: StakingControllerPanelMode;
    /** Opaque slot: the recipient picker content (web app: RecipientTitle = AccountAvatar + next/Link; extension: own equivalent). */
    recipientContent?: React.ReactNode;
    /** Opaque slot: the cog icon (web app: next/image cog asset; extension: own). The package wraps it in a toggle <button>. */
    configCog?: React.ReactNode;
    /** Optional caller-supplied debug overlay (web app: <ToDo/>). Omitted by the extension. */
    debugToDo?: React.ReactNode;
}
export default function StakingControllerPanel({ panelId, configPanelId, parentPanelId, sponsorMode, recipientContent, configCog, debugToDo, }: StakingControllerPanelProps): React.JSX.Element | null;
