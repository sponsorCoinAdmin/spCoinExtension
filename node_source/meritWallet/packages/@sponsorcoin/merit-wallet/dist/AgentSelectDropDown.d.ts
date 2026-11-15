import React from 'react';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export interface ConnectedAgentSelectDropDownProps {
    panelGateId?: SP_COIN_DISPLAY | null;
    label?: string;
    addrPrePostSize?: number;
    /** Host-specific avatar for a selected agent (the web app's opens the account panel on click). Default: the package's plain AccountAvatar. */
    renderAccountAvatar?: (account: spCoinAccount) => React.ReactNode;
}
export default function ConnectedAgentSelectDropDown({ panelGateId, label, addrPrePostSize, renderAccountAvatar, }: ConnectedAgentSelectDropDownProps): React.JSX.Element;
