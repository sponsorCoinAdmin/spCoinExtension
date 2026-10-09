import React from 'react';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export interface SendAddressHeaderBarProps {
    account?: spCoinAccount;
    /** Defaults to the generic 'Active Account' — see this file's own header
     *  comment for why the real app's contextual Deposit/Trading/Rewards
     *  label isn't reproduced here. */
    accountType?: string;
    showTitle?: boolean;
    /** Opaque slot for the real app's RoleTableComponent — omitted renders
     *  nothing, same as every other optional slot in this package. */
    roleTableSlot?: React.ReactNode;
}
export default function SendAddressHeaderBar({ account, accountType, showTitle, roleTableSlot, }: SendAddressHeaderBarProps): React.JSX.Element | null;
