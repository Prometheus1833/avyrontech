import type { Env } from "./types";
import { bytesHash } from "./malware";
/** Reuses only the already authorized, isolated backup bucket. Never provisions
 * storage, enables billing, or treats the primary bucket as its own backup. */
export async function backupSkillFile(
  env: Env,
  key: string,
  bytes: Uint8Array,
  checksum: string,
  mime: string,
) {
  if (
    env.DOCUMENT_STORAGE_PRIVACY_VERIFIED !== "true" ||
    env.DOCUMENT_BACKUP_ISOLATION_VERIFIED !== "true" ||
    !env.DOCUMENT_BACKUPS
  )
    return null;
  const backupKey = `skills/v1/${key}`;
  try {
    const previous = await env.DOCUMENT_BACKUPS.head(backupKey);
    if (previous)
      return previous.customMetadata?.sha256 === checksum ? backupKey : null;
    const object = await env.DOCUMENT_BACKUPS.put(backupKey, bytes, {
      httpMetadata: { contentType: mime },
      customMetadata: { sha256: checksum },
    });
    return object ? backupKey : null;
  } catch {
    console.error(
      JSON.stringify({
        event: "skill_backup_failed",
        code: "storage_unavailable",
      }),
    );
    return null;
  }
}
export async function recoveredSkillFile(
  env: Env,
  key: string | null,
  checksum: string,
  size: number,
) {
  if (
    !key ||
    env.DOCUMENT_BACKUP_ISOLATION_VERIFIED !== "true" ||
    !env.DOCUMENT_BACKUPS
  )
    return null;
  const object = await env.DOCUMENT_BACKUPS.get(key);
  if (!object) return null;
  if (object.size !== size || object.size > 25_000_000) {
    await object.body.cancel();
    return null;
  }
  const bytes = new Uint8Array(await object.arrayBuffer());
  return (await bytesHash(bytes)) === checksum ? bytes : null;
}
