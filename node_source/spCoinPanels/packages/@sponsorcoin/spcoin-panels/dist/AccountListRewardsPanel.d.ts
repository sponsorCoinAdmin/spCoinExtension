import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AccountType, type spCoinAccount } from '@sponsorcoin/spcoin-common/context';
export type AccountListRewardsRole = 'sponsor' | 'recipient' | 'agent' | 'unknown';
export type AccountListRewardsCellSlot = React.FC<{
    account: spCoinAccount;
    addressText: string;
    roleLabel: string;
    onRowEnter: (name?: string | null) => void;
    onRowMove: React.MouseEventHandler;
    onRowLeave: () => void;
    onPick: (account: spCoinAccount) => void;
}>;
export interface AccountListRewardsPanelProps {
    accountList: spCoinAccount[];
    setAccountCallBack: (account?: spCoinAccount) => void;
    panelId?: SP_COIN_DISPLAY;
    chevronPanelId?: SP_COIN_DISPLAY;
    containerType?: SP_COIN_DISPLAY;
    addressSelectContent?: React.ReactNode;
    todoContent?: React.ReactNode;
    accountCellSlot?: AccountListRewardsCellSlot;
    onPickAccount?: (account: spCoinAccount, roleLabel: string) => void;
    onClaimRewards?: (type: AccountType, accountId: number, label?: string) => void;
    chevronOpenOverride?: boolean;
    onChevronToggle?: (open: boolean) => void;
}
export default function AccountListRewardsPanel({ accountList, setAccountCallBack, panelId, chevronPanelId, containerType, addressSelectContent, todoContent, accountCellSlot, onPickAccount, onClaimRewards, chevronOpenOverride, onChevronToggle, }: AccountListRewardsPanelProps): React.JSX.Element;
