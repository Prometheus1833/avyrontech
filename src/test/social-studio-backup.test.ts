import { describe, expect, it } from "vitest";
import {
  buildSocialBackupDocument,
  SOCIAL_BACKUP_SCHEMA_VERSION,
  socialBackupObjectKey,
} from "../../cloudflare/workers/api/src/socialStudioBackup";

describe("Social Studio backup", () => {
  it("creates deterministic private object keys", () => {
    expect(socialBackupObjectKey("aip_avyron_web", "asb_123", Date.UTC(2026, 9, 3)))
      .toBe("ai-projects/aip_avyron_web/social-studio/backups/2026-10-03/asb_123.json");
  });

  it("records schema, row counts and sensitive-data exclusions", () => {
    const document = buildSocialBackupDocument("aip_avyron_web", "configuration", Date.UTC(2026, 9, 3), {
      project: [{ id: "aip_avyron_web" }],
      channels: [{ provider: "instagram", connection_status: "disconnected" }],
      designProfiles: [{ version: 3 }],
    });
    expect(document.schemaVersion).toBe(SOCIAL_BACKUP_SCHEMA_VERSION);
    expect(document.rowCounts).toEqual({ project: 1, channels: 1, designProfiles: 1 });
    expect(document.exclusions).toEqual(expect.arrayContaining(["connector_secrets", "connection_ids", "private_messages"]));
    expect(JSON.stringify(document.data)).not.toContain("access_token");
  });
});
