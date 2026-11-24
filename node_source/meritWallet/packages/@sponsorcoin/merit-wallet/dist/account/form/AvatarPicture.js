// File: src/account/form/AvatarPicture.tsx
//
// 2026-11-09 (owner: "the button row exists twice, can we merge this?"): the picture box of an avatar / logo, written once. The detail screens' image block (account/DetailImageBlock.tsx) and the avatar panel (the web's Edit / Create
// Account pages, AccountAvatarPanel.tsx) both draw it: a box of the given size and class with the picture in it, or the standard Anonymous.png (2026-11-12, owner: not the words "No logo found on server") when there is none.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { avatarPanelClass, avatarPictureCropStyle } from '@sponsorcoin/spcoin-common/styles';
import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';
export default function AvatarPicture({ boxClass, boxStyle, hasImage, src, alt, onLoad, crop, cropAspect }) {
    return (_jsx("div", { className: boxClass, style: cropAspect ? avatarPictureCropStyle.box(boxStyle) : boxStyle, children: (() => {
            const shownSrc = hasImage ? src : ANONYMOUS_ACCOUNT_AVATAR_URL;
            const shownAlt = hasImage ? alt : 'No picture';
            // 2026-11-24 (owner): the standard Anonymous picture is trimmed to its pixels exactly like a chosen one, so every logo box looks the same
            const shown = crop ?? (cropAspect ? { x0: 0, y0: 0, x1: 1, y1: 1 } : undefined);
            return shown
                ? _jsx("div", { style: avatarPictureCropStyle.viewport(cropAspect), children: _jsx("img", { src: shownSrc, onLoad: onLoad, alt: shownAlt, style: avatarPictureCropStyle.image(shown) }) })
                : _jsx("img", { src: shownSrc, onLoad: onLoad, alt: shownAlt, className: avatarPanelClass.previewImage });
        })() }));
}
