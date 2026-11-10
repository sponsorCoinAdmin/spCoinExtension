// File: src/account/form/AvatarPicture.tsx
//
// 2026-11-09 (owner: "the button row exists twice, can we merge this?"): the picture box of an avatar / logo, written once. The detail screens' image block (account/DetailImageBlock.tsx) and the avatar panel (the web's Edit / Create
// Account pages, AccountAvatarPanel.tsx) both draw it: a box of the given size and class with the picture in it, or "No logo found on server" when there is none.
'use client';

import React from 'react';
import { avatarPanelClass } from '@sponsorcoin/spcoin-common/styles';

export interface AvatarPictureProps {
  boxClass: string;
  boxStyle: React.CSSProperties;
  /** Is there a picture to show? (the URL below may be an image-cache answer that is not there yet) */
  hasImage: boolean;
  src: string;
  alt: string;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
}

export default function AvatarPicture({ boxClass, boxStyle, hasImage, src, alt, onLoad }: AvatarPictureProps) {
  return (
    <div className={boxClass} style={boxStyle}>
      {hasImage ? <img src={src} onLoad={onLoad} alt={alt} className={avatarPanelClass.previewImage} /> : <span className={avatarPanelClass.noLogo}>No logo found on server</span>}
    </div>
  );
}
