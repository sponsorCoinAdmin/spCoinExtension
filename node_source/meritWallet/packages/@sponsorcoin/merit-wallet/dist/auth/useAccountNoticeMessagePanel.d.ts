import { type MessageAccountEntry } from '@sponsorcoin/spcoin-common/context';
import { type NoticeAccountProfile } from './accountNoticeStore';
/** The rows of a notice: one per account, the name, symbol and icon from the host's profiles when it has them. */
export declare function noticeAccountRows(addresses: string[], describe?: (address: string) => NoticeAccountProfile | undefined): MessageAccountEntry[];
export declare function useAccountNoticeMessagePanel(describe?: (address: string) => NoticeAccountProfile | undefined): void;
