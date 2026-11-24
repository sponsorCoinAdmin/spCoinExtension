import React from 'react';
import type { ImageContentBox } from './imageContentBox';
export interface AvatarPictureProps {
    boxClass: string;
    boxStyle: React.CSSProperties;
    /** Is there a picture to show? (the URL below may be an image-cache answer that is not there yet) */
    hasImage: boolean;
    src: string;
    alt: string;
    onLoad?: React.ReactEventHandler<HTMLImageElement>;
    /** Show only this part of the picture (its visible pixels), filling the box. */
    crop?: ImageContentBox;
    /** width / height of the cropped part: the box takes this shape at whatever width it has, so the picture is never stretched. */
    cropAspect?: number;
}
export default function AvatarPicture({ boxClass, boxStyle, hasImage, src, alt, onLoad, crop, cropAspect }: AvatarPictureProps): React.JSX.Element;
