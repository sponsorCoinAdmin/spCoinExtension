import React from 'react';
import type { ApprovalRequestInfo } from '../vault/approvals';
export interface TransactionApprovalScreenProps {
    info: ApprovalRequestInfo;
    nativeSymbol: string;
    /** The chain's endpoint, for the gas estimate. Without one no gas lines are drawn. */
    rpcUrl?: string;
    busy?: boolean;
    onApprove: (password?: string) => void;
    onReject: () => void;
}
export default function TransactionApprovalScreen({ info, nativeSymbol, rpcUrl, busy, onApprove, onReject }: TransactionApprovalScreenProps): React.JSX.Element;
