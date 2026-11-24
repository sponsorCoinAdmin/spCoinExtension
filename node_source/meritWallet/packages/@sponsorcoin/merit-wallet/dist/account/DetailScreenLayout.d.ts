import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { type DetailAvatarProps } from './DetailImageBlock';
export type { DetailAvatarProps };
/** 2026-11-09 (owner): the space (px) kept clear around the image inside its box when a screen does not set its own: 20 above, 5 below, 20 left and right. */
/** 2026-11-24 (owner rule 1, changed from 2px to 0px; sides 20px to 2px): the box holds the picture edge to edge, top and bottom, with 2px at each side, on every detail screen. */
export declare const DEFAULT_IMAGE_BUFFER: {
    readonly t: 0;
    readonly b: 0;
    readonly l: 2;
    readonly r: 2;
};
export interface DetailScreenLayoutProps {
    /** The panel's own flags (ACCOUNT_LOGO / ACCOUNT_META_DATA, TOKEN_LOGO / TOKEN_META_DATA, ...). */
    logoFlag: SP_COIN_DISPLAY;
    metaFlag: SP_COIN_DISPLAY;
    /** The element ids of the two blocks (the panel tree and the tests find them by id). */
    logoId: string;
    metaId: string;
    avatar: DetailAvatarProps;
    /** 2026-11-09 (owner): the table, built by the screen and passed in. The base puts it in its table block (a flex column, shown when the meta flag is on); the table is a flex item of that block. */
    table: React.ReactNode;
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
    /** Optional px kept clear between the image box's edges and the image: top, bottom, right, left. A screen that sets none gets DEFAULT_IMAGE_BUFFER (top 0, bottom 0, left 2, right 2); one that sets some gets the default for the rest. */
    tBuffer?: number;
    bBuffer?: number;
    rBuffer?: number;
    lBuffer?: number;
}
export default function DetailScreenLayout({ logoFlag, metaFlag, logoId, metaId, avatar, table, screenId, onSubmit, activeBody, resizeKey, toggleTrace, tBuffer, bBuffer, rBuffer, lBuffer }: DetailScreenLayoutProps): React.JSX.Element;
