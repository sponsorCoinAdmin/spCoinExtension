import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
interface Props {
    panelGateId?: SP_COIN_DISPLAY | null;
    label?: string;
    addrPrePostSize?: number;
    /** Accepted and ignored, so existing callers do not change. */
    collapseKey?: unknown;
}
export default function AgentSelectDropDownWithAvatar({ panelGateId, label, addrPrePostSize }: Props): React.JSX.Element;
export {};
