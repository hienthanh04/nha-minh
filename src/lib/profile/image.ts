import sharp from "sharp";

export async function prepareAvatar(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 524288) throw new Error("Ảnh quá lớn. Hãy chọn lại ảnh.");
  // Decode and re-encode, rather than trusting a submitted MIME type. Metadata is stripped.
  const image = sharp(bytes, { limitInputPixels: 16777216 });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("Định dạng ảnh không hỗ trợ.");
  return image.rotate()
    .resize(512, 512, { fit: "cover", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}
