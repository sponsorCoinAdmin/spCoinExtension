import React from 'react';
export interface TransactionConfirmAccountEntry {
    role: string;
    address: string;
    symbol?: string;
    name?: string;
    logoURL?: string;
}
export interface TransactionConfirmTokenEntry {
    label: string;
    symbol?: string;
    name?: string;
    address?: string;
    logoURL?: string;
}
export interface TransactionConfirmPanelProps {
    /** e.g. "Approve Swap via Uniswap V3" — matches the real app's own title-bar convention. */
    title: string;
    message?: string;
    accounts?: TransactionConfirmAccountEntry[];
    tokens?: TransactionConfirmTokenEntry[];
    amount?: {
        label: string;
        value: string;
    };
    chainId?: number;
    contractAddress?: string;
    /** True once Approve has been clicked and the real write is in flight — disables both buttons, Approve reads "Signing…". */
    busy?: boolean;
    onApprove: () => void;
    onReject: () => void;
}
export default function TransactionConfirmPanel({ title, message, accounts, tokens, amount, chainId, contractAddress, busy, onApprove, onReject, }: TransactionConfirmPanelProps): React.JSX.Element;
