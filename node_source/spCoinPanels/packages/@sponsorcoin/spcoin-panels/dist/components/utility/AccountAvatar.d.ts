import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import type { spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export type AccountComponentMode = typeof SP_COIN_DISPLAY.ACTIVE_ACCOUNT | typeof SP_COIN_DISPLAY.SPONSOR_ACCOUNT | typeof SP_COIN_DISPLAY.RECIPIENT_ACCOUNT | typeof SP_COIN_DISPLAY.AGENT_ACCOUNT;
export interface AccountAvatarProps {
    account?: spCoinAccount;
    mode?: AccountComponentMode;
    logoURL?: string;
    symbol?: string;
    name?: string;
    address?: string;
    className?: string;
    title?: string;
    roleLabel?: string;
    onClick?: (e: React.MouseEvent) => void;
}
export declare function getAccountRoleLabel(mode: AccountComponentMode | undefined): string;
export default function AccountAvatar({ account, mode, logoURL, symbol, name, address, className, title, roleLabel, onClick, }: AccountAvatarProps): React.JSX.Element;
