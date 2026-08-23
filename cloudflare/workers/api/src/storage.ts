// Central storage policy. D1 owns relational/source-of-truth data, KV stores
// small non-sensitive configuration, and R2 stores binary objects only.

export const MAX_CONTENT_CONFIG_BYTES = 128 * 1024;

const storageSegment = (value: string, fallback: string, max = 96) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, max);
  return normalized || fallback;
};

export const safeFilename = (value: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]+/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/^[._ -]+/, "")
    .trim()
    .slice(0, 120);
  return normalized || "file";
};

export const projectObjectKey = (projectId: string, mediaId: string, filename: string) =>
  `projects/${storageSegment(projectId, "project")}/${storageSegment(mediaId, "media")}-${safeFilename(filename)}`;

export const leadObjectKey = (leadId: string, filename: string) =>
  `leads/${storageSegment(leadId, "lead")}/${safeFilename(filename)}`;

export const avatarObjectKey = (userId: string) =>
  `avatars/${storageSegment(userId, "user")}`;

export function contentConfigKey(rawKey: string): string | null {
  const key = rawKey.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._:-]{0,79}$/.test(key)) return null;
  return `content:v1:${key}`;
}

export const jsonByteLength = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;

export const inlineContentDisposition = (filename: string) => {
  const safe = safeFilename(filename).replace(/["\\]/g, "_");
  return `inline; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
};
