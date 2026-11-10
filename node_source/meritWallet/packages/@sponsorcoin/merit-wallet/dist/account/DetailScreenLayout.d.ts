import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { type AccountAvatarPanelProps } from './form/AccountAvatarPanel';
/** What a screen decides about its avatar; everything else (sizes, buffers, the sizing boundary, the toggle's state) is the layout's. */
export type DetailAvatarProps = Pick<AccountAvatarPanelProps, 'logoPreviewSrc' | 'previewAlt' | 'previewBoxClass' | 'connected' | 'isEditMode' | 'inputLocked' | 'previewButtonLabel' | 'loadingInputMessage' | 'isLoading' | 'logoFileInputRef' | 'onFileChange' | 'hideUpload' | 'toggleLabel' | 'imageKind' | 'fitImageShape'>;
/** 2026-11-09 (owner): the space (px) kept clear around the image inside its box when a screen does not set its own: 20 above, 5 below, 20 left and right. */
export declare const DEFAULT_IMAGE_BUFFER: {
    readonly t: 20;
    readonly b: 5;
    readonly l: 20;
    readonly r: 20;
};
export interface DetailScreenLayoutProps {
    /** The panel's own flags (ACCOUNT_LOGO / ACCOUNT_META_DATA, TOKEN_LOGO / TOKEN_META_DATA, ...). */
    logoFlag: SP_COIN_DISPLAY;
    metaFlag: SP_COIN_DISPLAY;
    /** The element ids of the two blocks (the panel tree and the tests find them by id). */
    logoId: string;
    metaId: string;
    avatar: DetailAvatarProps;
    /** The meta block's content; told whether the logo block is showing above it. */
    meta: (state: {
        logoVisible: boolean;
    }) => React.ReactNode;
    /** The id of the screen's outer box. */
    screenId?: string;
    /** Draw the screen as a <form> that submits here (the editable account screen); omitted: a plain box. */
    onSubmit?: React.FormEventHandler<HTMLFormElement>;
    /** The body of the ACTIVE account is pulled to the panel's edge; the other roles' is not. */
    activeBody?: boolean;
    /** Anything that changes the room for the image (it is measured again when this changes), besides the two header flags the layout watches itself. */
    resizeKey?: string;
    /** The words the panel-tree trace shows for the toggle. */
    toggleTrace: string;
    /** Optional px kept clear between the image box's edges and the image: top, bottom, right, left. A screen that sets none gets DEFAULT_IMAGE_BUFFER (top 20, bottom 5, left 20, right 20); one that sets some gets the default for the rest. */
    tBuffer?: number;
    bBuffer?: number;
    rBuffer?: number;
    lBuffer?: number;
}
export default function DetailScreenLayout({ logoFlag, metaFlag, logoId, metaId, avatar, meta, screenId, onSubmit, activeBody, resizeKey, toggleTrace, tBuffer, bBuffer, rBuffer, lBuffer }: DetailScreenLayoutProps): React.JSX.Element;
