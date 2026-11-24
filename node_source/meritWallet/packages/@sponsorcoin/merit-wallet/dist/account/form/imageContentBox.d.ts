export interface ImageContentBox {
    /** left, top, right, bottom of the visible pixels, each 0..1 of the picture's width / height */
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}
export declare function imageContentBox(img: HTMLImageElement): ImageContentBox | undefined;
