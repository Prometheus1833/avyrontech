/** Trusted maintenance handoff using the existing Cloudflare identity. Drafts only.
 * Default is dry-run. --apply explicitly persists an internal Codex package, not a publication.
 */
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  realpathSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, relative, extname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url)),
  project = "aip_avyron_web";
const hash = (s) => createHash("sha256").update(s).digest("hex");
const quote = (v) =>
  v == null
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : "'" + String(v).replaceAll("'", "''") + "'";
const cli = (args, json = false) =>
  execFileSync(
    process.execPath,
    [
      join(root, "node_modules/wrangler/bin/wrangler.js"),
      ...args,
      "--config",
      join(root, "wrangler.jsonc"),
      "--env=",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: json ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    },
  );
const query = (sql) =>
  JSON.parse(
    cli(
      ["d1", "execute", "avyron-db", "--remote", "--command", sql, "--json"],
      true,
    ),
  ).flatMap((r) => {
    if (!r.success) throw Error("D1 query failed");
    return r.results;
  });
export function validateInternalBundle(bundle, base) {
  if (
    !bundle ||
    typeof bundle !== "object" ||
    !bundle.draft ||
    !Array.isArray(bundle.assets)
  )
    throw Error("Expected an internal generated draft and asset manifest.");
  const d = bundle.draft;
  if (
    !/^[a-zA-Z0-9_:.-]{1,160}$/.test(d.sourceRef || "") ||
    !d.sourceRevision ||
    !d.title ||
    !d.caption ||
    !["post", "story", "carousel", "reel", "article"].includes(d.format) ||
    !Array.isArray(d.channels) ||
    !d.channels.length
  )
    throw Error("Invalid source/revision or editorial content.");
  if (bundle.origin !== "internal_generated")
    throw Error(
      "External files must use native upload and malware-scanning routes.",
    );
  const resolvedBase = realpathSync(base);
  const assets = bundle.assets.map((asset) => {
    const path = realpathSync(resolve(resolvedBase, asset.file));
    if (relative(resolvedBase, path).startsWith(".."))
      throw Error("Asset escapes its generated package.");
    const bytes = readFileSync(path),
      sha = hash(bytes),
      extension = extname(path).toLowerCase();
    const mime =
      extension === ".png" &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "image/png"
        : extension === ".webp" &&
            bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp"
          : null;
    if (!mime || sha !== asset.sha256)
      throw Error("Asset type or checksum mismatch.");
    return {
      ...asset,
      path,
      sha,
      mime,
      bytes: bytes.length,
      id: "asa_" + hash(project + ":" + sha).slice(0, 28),
      key: `social/editorial/${project}/${sha}${extension}`,
    };
  });
  return {
    draft: d,
    assets,
    bytes: assets.reduce((sum, a) => sum + a.bytes, 0),
  };
}
export async function importInternalBundle(
  file,
  { apply = false, uploadAssets = false, metadataOnly = false } = {},
) {
  if (statSync(file).size > 196608)
    throw Error("Metadata exceeds the native handoff size.");
  const bundle = JSON.parse(readFileSync(file, "utf8")),
    validated = validateInternalBundle(
      bundle,
      bundle.assetRoot || resolve(file, ".."),
    );
  if (!apply)
    return {
      dryRun: true,
      sourceRef: validated.draft.sourceRef,
      revision: validated.draft.sourceRevision,
      assets: validated.assets.length,
      bytes: validated.bytes,
    };
  const operator = query(
    `SELECT u.id FROM users u JOIN agent_operator_bindings b ON b.user_id=u.id WHERE b.project_id=${quote(project)} AND b.agent_slug='ai-prod-content' AND b.operator_role='social_manager' AND b.status='active' AND u.disabled_at IS NULL AND u.email_verified=1`,
  );
  if (operator.length !== 1)
    throw Error(
      "Expected exactly one existing, active native social operator.",
    );
  const actor = operator[0].id,
    d = validated.draft,
    inputHash = hash(JSON.stringify(bundle.draft)),
    contentId =
      "aic_codex_" +
      hash(project + ":" + d.sourceRef + ":" + d.sourceRevision).slice(0, 24);
  const existing = query(
    `SELECT id,status,updated_at FROM ai_content_items WHERE id=${quote(contentId)} AND project_id=${quote(project)}`,
  );
  if (existing.length) {
    const event = query(
      `SELECT metadata_json FROM ai_project_events WHERE target_id=${quote(contentId)} AND action IN('social_studio.codex.import','social_studio.codex.assets.synced') ORDER BY created_at DESC LIMIT 1`,
    );
    if (
      !event.length ||
      JSON.parse(event[0].metadata_json).inputHash !== inputHash
    )
      throw Error("Source revision already exists with different content.");
    const prior = JSON.parse(event[0].metadata_json);
    if (metadataOnly || prior.assetState === "stored")
      return { id: contentId, replayed: true };
    if (
      !uploadAssets ||
      !["draft", "pending_approval"].includes(existing[0].status)
    )
      throw Error(
        "Asset synchronization requires an editable draft and explicit --upload-assets.",
      );
  }
  const limit = query(
    `SELECT max_asset_bytes FROM ai_projects WHERE id=${quote(project)}`,
  )[0]?.max_asset_bytes;
  if (!limit || validated.assets.some((a) => a.bytes > limit))
    throw Error("Native project asset-size policy exceeded.");
  if (validated.assets.length && !uploadAssets && !metadataOnly)
    throw Error(
      "Use --upload-assets, or explicitly preserve a pending asset manifest with --metadata-only.",
    );
  const config = readFileSync(join(root, "wrangler.jsonc"), "utf8"),
    bucket = config.match(
      /"binding"\s*:\s*"FILES"\s*,\s*"bucket_name"\s*:\s*"([a-z0-9-]+)"/,
    )?.[1];
  if (!bucket) throw Error("Existing FILES bucket unavailable.");
  if (!metadataOnly)
    for (const asset of validated.assets)
      cli([
        "r2",
        "object",
        "put",
        bucket + "/" + asset.key,
        "--remote",
        "--file",
        asset.path,
        "--content-type",
        asset.mime,
        "--cache-control",
        "private, no-store",
      ]);
  const stamp = Date.now(),
    metadata = {
      ...d.provenance,
      variants: d.variants || [],
      sourceRef: d.sourceRef,
      sourceRevision: d.sourceRevision,
      inputHash,
      assetIds: metadataOnly ? [] : validated.assets.map((a) => a.id),
      origin: "internal_generated",
      assetState: metadataOnly ? "awaiting_r2_authorization" : "stored",
      pendingAssets: metadataOnly
        ? validated.assets.map((a) => ({
            id: a.id,
            sha256: a.sha,
            bytes: a.bytes,
            width: a.width,
            height: a.height,
          }))
        : [],
    };
  const columns = [
    "id",
    "project_id",
    "created_by",
    "generated_by_agent",
    "format",
    "objective",
    "channels_json",
    "title",
    "caption",
    "visual_direction",
    "cta",
    "hashtags_json",
    "status",
    "scheduled_at",
    "expires_at",
    "created_at",
    "updated_at",
  ];
  const vals = [
    contentId,
    project,
    actor,
    "ai-prod-content",
    d.format,
    d.objective || "visibility",
    JSON.stringify(d.channels),
    d.title,
    d.caption,
    d.visualDirection || "",
    d.cta || "",
    JSON.stringify(d.hashtags || []),
    "pending_approval",
    d.scheduledAt || stamp,
    stamp + 3 * 86400000,
    stamp,
    stamp,
  ];
  const upgraded = query("PRAGMA table_info(ai_content_items)").some(
    (c) => c.name === "reusable",
  );
  if (upgraded) {
    columns.push(
      "reusable",
      "source_ref",
      "source_revision",
      "source_metadata_json",
    );
    vals.push(1, d.sourceRef, d.sourceRevision, JSON.stringify(metadata));
  }
  const statements = existing.length
    ? [
        `UPDATE ai_content_items SET updated_at=${stamp}${upgraded ? ",source_metadata_json=" + quote(JSON.stringify(metadata)) : ""} WHERE id=${quote(contentId)} AND updated_at=${quote(existing[0].updated_at)} AND status IN('draft','pending_approval');`,
      ]
    : [
        `INSERT INTO ai_content_items(${columns.join(",")}) VALUES(${vals.map(quote).join(",")});`,
      ];
  if (!metadataOnly)
    for (const a of validated.assets)
      statements.push(
        `INSERT OR IGNORE INTO ai_social_assets(id,project_id,content_id,role,r2_bucket,object_key,mime_type,width,height,byte_size,sha256,provenance_json,status,created_at,updated_at) SELECT ${[a.id, project, contentId, a.role || "visual", "files", a.key, a.mime, a.width || null, a.height || null, a.bytes, a.sha, JSON.stringify({ origin: "internal_generated", sourceRef: d.sourceRef, revision: d.sourceRevision, sha256: a.sha }), "active", stamp, stamp].map(quote).join(",")} WHERE EXISTS(SELECT 1 FROM ai_content_items WHERE id=${quote(contentId)} AND updated_at=${stamp});`,
      );
  statements.push(
    `INSERT INTO ai_project_events(id,project_id,actor_user_id,action,target_type,target_id,metadata_json,created_at) SELECT ${["aipe_codex_" + hash(contentId + ":" + stamp).slice(0, 24), project, actor, existing.length ? "social_studio.codex.assets.synced" : "social_studio.codex.import", "ai_content", contentId, JSON.stringify(metadata), stamp].map(quote).join(",")} WHERE EXISTS(SELECT 1 FROM ai_content_items WHERE id=${quote(contentId)} AND updated_at=${stamp});`,
  );
  const directory = mkdtempSync(join(tmpdir(), "avyron-editorial-"));
  try {
    const sql = join(directory, "handoff.sql");
    writeFileSync(sql, statements.join("\n"), { mode: 0o600 });
    cli(["d1", "execute", "avyron-db", "--remote", "--file", sql]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  const saved = query(
    `SELECT id,status,updated_at FROM ai_content_items WHERE id=${quote(contentId)}`,
  )[0];
  if (!saved || saved.updated_at !== stamp)
    throw Error(
      "Handoff not confirmed: the material may have changed during synchronization.",
    );
  return {
    ...saved,
    replayed: false,
    assets: metadataOnly ? 0 : validated.assets.length,
    pendingAssets: metadataOnly ? validated.assets.length : 0,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2),
    file = args.find((x) => !x.startsWith("--"));
  if (!file)
    throw Error(
      "Usage: node scripts/import-social-package.mjs package.json [--apply --upload-assets|--metadata-only]",
    );
  importInternalBundle(resolve(file), {
    apply: args.includes("--apply"),
    uploadAssets: args.includes("--upload-assets"),
    metadataOnly: args.includes("--metadata-only"),
  })
    .then((r) => console.log(JSON.stringify(r)))
    .catch((error) => {
      console.error(error.message.split("\n")[0]);
      process.exitCode = 1;
    });
}
