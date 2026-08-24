import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_CONTENT_CONFIG_BYTES,
  avatarObjectKey,
  contentConfigKey,
  inlineContentDisposition,
  jsonByteLength,
  leadObjectKey,
  projectObjectKey,
  safeFilename,
} from "../../cloudflare/workers/api/src/storage";

const readJsonc = (file: string) => JSON.parse(
  readFileSync(resolve(process.cwd(), file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1"),
);

describe("Cloudflare storage keys", () => {
  it("keeps object keys inside their ownership prefix", () => {
    expect(projectObjectKey("../Proiect Ș", "media/id", "../Oferta finală.pdf"))
      .toBe("projects/Proiect-S/media-id-Oferta finala.pdf");
    expect(leadObjectKey("lead/42", "\r\ncontract.pdf"))
      .toBe("leads/lead-42/contract.pdf");
    expect(avatarObjectKey("user/42")).toBe("avatars/user-42");
  });

  it("normalises unsafe filenames and response headers", () => {
    expect(safeFilename("../../\"poza\r\n.jpg")).toBe("poza_.jpg");
    expect(inlineContentDisposition("\"poza\r\n.jpg"))
      .toBe("inline; filename=\"poza_.jpg\"; filename*=UTF-8''poza_.jpg");
  });

  it("versions and validates KV configuration keys", () => {
    expect(contentConfigKey(" SEO.Home ")).toBe("content:v1:seo.home");
    expect(contentConfigKey("../escape")).toBeNull();
    expect(contentConfigKey("x".repeat(81))).toBeNull();
  });

  it("measures the encoded JSON size rather than character count", () => {
    expect(jsonByteLength({ value: "ș" })).toBeGreaterThan(JSON.stringify({ value: "ș" }).length);
    expect(jsonByteLength({ value: "x".repeat(MAX_CONTENT_CONFIG_BYTES) }))
      .toBeGreaterThan(MAX_CONTENT_CONFIG_BYTES);
  });
});

describe("Cloudflare environment isolation", () => {
  const config = readJsonc("wrangler.jsonc");
  const scripts = readJsonc("package.json").scripts as Record<string, string>;
  const productionDb = config.d1_databases[0];
  const preview = config.env.preview;

  it("binds preview to dedicated D1, KV and R2 resources", () => {
    expect(preview.d1_databases[0].database_name).toBe("avyron-db-preview");
    expect(preview.d1_databases[0].database_id).not.toBe(productionDb.database_id);
    expect(preview.kv_namespaces[0].id).not.toBe(config.kv_namespaces[0].id);
    expect(preview.r2_buckets.map((item: { bucket_name: string }) => item.bucket_name))
      .toEqual(["avyron-files-preview", "avyron-media-preview"]);
    expect(preview.ratelimits[0].namespace_id).not.toBe(config.ratelimits[0].namespace_id);
  });

  it("requires branch version uploads to select preview explicitly", () => {
    expect(scripts["deploy:api:preview"]).toContain("versions upload");
    expect(scripts["deploy:api:preview"]).toContain("--env preview");
    expect(preview.vars.APP_ENV).toBe("preview");
    expect(config.vars.APP_ENV).toBe("production");
  });

  it("lets the integrated Worker own canonical URLs and hard 404 responses", () => {
    expect(config.assets.run_worker_first).toBe(true);
    expect(config.assets.html_handling).toBe("drop-trailing-slash");
    expect(config.assets.not_found_handling).toBe("none");
  });
});
