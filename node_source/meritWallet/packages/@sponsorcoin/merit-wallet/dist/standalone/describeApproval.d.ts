import type { ApprovalRequestInfo } from '../vault/approvals';
export declare function describeApproval(info: ApprovalRequestInfo, nativeSymbol: string): {
    title: string;
    message: string;
    accounts: {
        role: string;
        address: string;
    }[];
    amount: {
        label: string;
        value: string;
    } | undefined;
    chainId: number | undefined;
    contractAddress: string | undefined;
} | {
    title: string;
    message: string;
    accounts: {
        role: string;
        address: string;
    }[] | undefined;
    amount: undefined;
    chainId: number | undefined;
    contractAddress: undefined;
};
