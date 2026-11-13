// File: src/account/form/AvatarPicture.tsx
//
// 2026-11-09 (owner: "the button row exists twice, can we merge this?"): the picture box of an avatar / logo, written once. The detail screens' image block (account/DetailImageBlock.tsx) and the avatar panel (the web's Edit / Create
// Account pages, AccountAvatarPanel.tsx) both draw it: a box of the given size and class with the picture in it, or the standard Anonymous.png (2026-11-12, owner: not the words "No logo found on server") when there is none.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { avatarPanelClass } from '@sponsorcoin/spcoin-common/styles';
import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';
export default function AvatarPicture({ boxClass, boxStyle, hasImage, src, alt, onLoad }) {
    return (_jsx("div", { className: boxClass, style: boxStyle, children: hasImage ? _jsx("img", { src: src, onLoad: onLoad, alt: alt, className: avatarPanelClass.previewImage }) : _jsx("img", { src: ANONYMOUS_ACCOUNT_AVATAR_URL, alt: "No picture", className: avatarPanelClass.previewImage }) }));
}
