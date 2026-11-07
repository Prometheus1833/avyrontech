import { inspectProjectMedia } from "./mediaPolicy";
/** Cloudflare FLUX.2 klein 4B: 26.05 neurons/output 512 tile. Reserve output tiles at the documented provider price,
 * rounded upward, not prompt token count. Unknown models
 * remain blocked until their transport and price are reviewed. */
export function verifiedImageReservation(
  model: string,
  width?: number,
  height?: number,
) {
  if (model !== "@cf/black-forest-labs/flux-2-klein-4b")
    throw new Error("image_pricing_unverified");
  if (
    !width ||
    !height ||
    width < 256 ||
    height < 256 ||
    width > 1920 ||
    height > 1920 ||
    width % 16 ||
    height % 16
  )
    throw new Error("invalid_image_dimensions");
  return Math.ceil(Math.ceil(width / 512) * Math.ceil(height / 512) * 26.05);
}
export function imageDimensions(format: string) {
  return format === "portrait"
    ? { width: 1088, height: 1920 }
    : format === "square"
      ? { width: 1920, height: 1920 }
      : { width: 1920, height: 1088 };
}
export function decodedGeneratedImage(output: unknown) {
  const result = output as { image?: unknown } | null;
  if (
    !result ||
    typeof result.image !== "string" ||
    result.image.length > 33_333_336 ||
    !/^[A-Za-z0-9+/=]+$/.test(result.image)
  )
    throw new Error("image_output_invalid");
  const decoded = atob(result.image),
    bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  if (!bytes.length || bytes.length > 25_000_000)
    throw new Error("image_output_limit");
  const type = [
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
  ].find(([mime, ext]) => inspectProjectMedia("generated." + ext, mime, bytes));
  if (!type) throw new Error("image_output_invalid");
  return {
    bytes,
    mime: type[0],
    extension: type[1],
    ...generatedImageDimensions(bytes, type[0]),
  };
}
function generatedImageDimensions(b: Uint8Array, mime: string) {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const valid = (width: number, height: number) => {
    if (!width || !height || width > 1920 || height > 1920)
      throw new Error("image_output_dimensions_invalid");
    return { width, height };
  };
  if (mime === "image/png") {
    if (
      b.length < 45 ||
      view.getUint32(8) !== 13 ||
      String.fromCharCode(...b.subarray(12, 16)) !== "IHDR"
    )
      throw new Error("image_output_invalid");
    let p = 8,
      hasData = false,
      hasEnd = false;
    while (p + 12 <= b.length) {
      const n = view.getUint32(p);
      if (p + n + 12 > b.length) throw new Error("image_output_invalid");
      const kind = String.fromCharCode(...b.subarray(p + 4, p + 8));
      if (kind === "IDAT" && n > 0) hasData = true;
      p += n + 12;
      if (kind === "IEND") {
        hasEnd = n === 0 && p === b.length;
        break;
      }
    }
    if (!hasData || !hasEnd) throw new Error("image_output_invalid");
    return valid(view.getUint32(16), view.getUint32(20));
  }
  if (mime === "image/jpeg") {
    if (b[b.length - 2] !== 255 || b[b.length - 1] !== 217)
      throw new Error("image_output_invalid");
    let p = 2;
    while (p + 9 < b.length) {
      if (b[p++] !== 255) throw new Error("image_output_invalid");
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const n = view.getUint16(p);
      if (n < 2 || p + n > b.length) throw new Error("image_output_invalid");
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      )
        return valid(view.getUint16(p + 5), view.getUint16(p + 3));
      p += n;
    }
    throw new Error("image_output_invalid");
  }
  if (b.length < 30 || view.getUint32(4, true) + 8 !== b.length)
    throw new Error("image_output_invalid");
  const kind = String.fromCharCode(...b.subarray(12, 16)),
    u24 = (p: number) => b[p] | (b[p + 1] << 8) | (b[p + 2] << 16);
  if (kind === "VP8X") return valid(1 + u24(24), 1 + u24(27));
  if (kind === "VP8 " && b[23] === 157 && b[24] === 1 && b[25] === 42)
    return valid(
      view.getUint16(26, true) & 0x3fff,
      view.getUint16(28, true) & 0x3fff,
    );
  if (kind === "VP8L" && b[20] === 47) {
    const bits = view.getUint32(21, true);
    return valid(1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff));
  }
  throw new Error("image_output_invalid");
}
