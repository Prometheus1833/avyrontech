/** URLs persisted for browser navigation must never contain executable schemes. */
export const normalizeExternalLink = (value: string): string | null => {
  if (value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
};
