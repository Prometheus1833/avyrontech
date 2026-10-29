const EXTENSIONS: Record<string, readonly string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt"],
};

export const inspectProjectMedia = (filename: string, contentType: string, bytes: Uint8Array): boolean => {
  const extension = filename.toLowerCase().split(".").pop() || "";
  if (!EXTENSIONS[contentType]?.includes(extension) || !bytes.byteLength) return false;
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (contentType === "image/png") return starts([137, 80, 78, 71, 13, 10, 26, 10]);
  if (contentType === "image/jpeg") return starts([255, 216, 255]);
  if (contentType === "image/gif") return starts([71, 73, 70, 56, 55, 97]) || starts([71, 73, 70, 56, 57, 97]);
  if (contentType === "image/webp") return starts([82, 73, 70, 70]) && startsAt(bytes, 8, [87, 69, 66, 80]);
  if (contentType === "application/pdf") return starts([37, 80, 68, 70, 45]);
  if (bytes.includes(0)) return false;
  try { new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes); return true; } catch { return false; }
};

const startsAt = (bytes: Uint8Array, offset: number, signature: number[]) =>
  signature.every((value, index) => bytes[offset + index] === value);

/** Validate the advertised type and filename before forwarding a public lead attachment. */
export const inspectContactAttachment = (filename: string, contentType: string, bytes: Uint8Array): boolean => {
  const extension = filename.toLowerCase().split(".").pop() || "";
  const mime = contentType.toLowerCase();
  if (["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain"].includes(mime)) {
    return inspectProjectMedia(filename, mime, bytes);
  }
  if (mime === "image/jpg") return ["jpg", "jpeg"].includes(extension) && inspectProjectMedia(filename, "image/jpeg", bytes);
  if (mime === "text/csv") {
    if (extension !== "csv" || bytes.includes(0)) return false;
    try { new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes); return true; } catch { return false; }
  }
  const boxType = new TextDecoder().decode(bytes.subarray(8, 12));
  if (mime === "image/heic") return ["heic", "heif"].includes(extension) && startsAt(bytes, 4, [102, 116, 121, 112]) && ["heic", "heix", "hevc", "mif1"].includes(boxType);
  if (mime === "image/avif") return extension === "avif" && startsAt(bytes, 4, [102, 116, 121, 112]) && ["avif", "avis"].includes(boxType);
  const ole = startsAt(bytes, 0, [208, 207, 17, 224, 161, 177, 26, 225]);
  if (mime === "application/msword") return extension === "doc" && ole;
  if (mime === "application/vnd.ms-excel") return extension === "xls" && ole;
  const officeExtensions: Record<string, string> = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  };
  const expected = officeExtensions[mime];
  return Boolean(expected && extension === expected && startsAt(bytes, 0, [80, 75, 3, 4]));
};

export const projectMediaDisposition = (filename: string, contentType: string): string => {
  const safe = filename.replace(/["\\]/g, "_");
  const disposition = contentType.startsWith("image/") && contentType !== "image/svg+xml" ? "inline" : "attachment";
  return `${disposition}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
};
