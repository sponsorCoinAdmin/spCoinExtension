// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/logoImage.ts
//
// 2026-10-09 -- turn a picked image into the avatar the hosted app stores: a 400 x 400 transparent PNG with the picture contained (never cropped or stretched), at
// most 500 KB. The same result as the web app's lib/utils/images/imageUploadProcessor.ts (processImageUpload) for the formats a browser can decode itself; if the
// PNG is over the size limit it is redrawn smaller until it fits. Browser only (canvas); the size rules come from profileForm.ts.
import { LOGO_MAX_INPUT_BYTES, LOGO_MAX_OUTPUT_BYTES, LOGO_TARGET_PX } from './profileForm';
const MAX_DECODED_PIXELS = 40 * 1000 * 1000;
async function decode(file) {
    try {
        return await createImageBitmap(file);
    }
    catch {
        throw new Error('That image format cannot be read here. Use a PNG, JPEG, WebP or GIF.');
    }
}
function draw(source, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Canvas context unavailable');
    const scale = Math.min(size / source.width, size / source.height);
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height);
    return canvas;
}
function toBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to encode the image'))), 'image/png'));
}
export async function processLogoFile(file) {
    if (!file.type.startsWith('image/'))
        throw new Error('Choose an image file.');
    if (file.size > LOGO_MAX_INPUT_BYTES)
        throw new Error('That image is too large (25 MB at most).');
    const source = await decode(file);
    if (source.width * source.height > MAX_DECODED_PIXELS)
        throw new Error('That image has too many pixels.');
    for (const size of [LOGO_TARGET_PX, 300, 200, 128]) {
        const blob = await toBlob(draw(source, size));
        if (blob.size <= LOGO_MAX_OUTPUT_BYTES)
            return blob;
    }
    throw new Error('That image cannot be made small enough (500 KB at most).');
}
