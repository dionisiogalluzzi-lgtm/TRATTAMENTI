import sharp from "sharp";
import { access } from "node:fs/promises";

const source = "public/agrigal-icon-192.png";
const icon512 = "public/agrigal-icon-512.png";
const maskable512 = "public/agrigal-icon-maskable-512.png";

await access(source);

await sharp(source)
  .resize(512, 512, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9, palette: true, quality: 100 })
  .toFile(icon512);

const inner = await sharp(source)
  .resize(390, 390, { fit: "contain", kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 16, g: 36, b: 25, alpha: 1 },
  },
})
  .composite([{ input: inner, left: 61, top: 61 }])
  .png({ compressionLevel: 9, palette: true, quality: 100 })
  .toFile(maskable512);

console.log("AGRIGAL PWA icons generated:", icon512, maskable512);
