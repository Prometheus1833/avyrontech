import { readFile, writeFile } from "node:fs/promises";
const output =
  process.env.SERVICE_CONTENT_SNAPSHOT_OUTPUT ||
  "src/shared/servicePublishedSnapshot.json";
if (process.env.SERVICE_CONTENT_SNAPSHOT_SKIP === "1") {
  console.log(
    "Service content snapshot: explicitly skipped; retaining the existing public snapshot.",
  );
  process.exit(0);
}
const base = new URL(
  process.env.SERVICE_CONTENT_SNAPSHOT_API || "https://api.avyron.ro",
);
if (
  !["https:", "http:"].includes(base.protocol) ||
  base.username ||
  base.password ||
  (base.protocol === "http:" &&
    !["127.0.0.1", "localhost"].includes(base.hostname))
)
  throw Error("Invalid public snapshot API.");
const manifest = JSON.parse(
  await readFile("src/shared/serviceContentManifest.json", "utf8"),
);
const previous = JSON.parse(await readFile(output, "utf8").catch(() => "{}"));
const entries = await Promise.all(
  Object.entries(manifest).map(async ([key, page]) => {
    const response = await fetch(
      new URL(`/api/public/service-pages/${key}`, base),
      {
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.status === 404 && !previous[key]) return null;
    if (!response.ok)
      throw Error(
        `Public service snapshot unavailable: ${key} HTTP ${response.status}.`,
      );
    let size = 0;
    const chunks = [];
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 256 * 1024) {
          await reader.cancel();
          throw Error("Public snapshot exceeds the content limit.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const data = JSON.parse(new TextDecoder().decode(buffer));
    if (
      !Number.isSafeInteger(data.revision) ||
      data.revision < 0 ||
      !data.values ||
      Array.isArray(data.values) ||
      typeof data.values !== "object" ||
      Object.entries(data.values).some(
        ([field, value]) =>
          !Object.hasOwn(page.values, field) ||
          typeof value !== "string" ||
          !value.trim() ||
          value.length > 6000,
      )
    )
      throw Error(`Invalid public service snapshot: ${key}.`);
    return data.revision > 0
      ? [key, { revision: data.revision, values: data.values }]
      : null;
  }),
);
const value =
  JSON.stringify(Object.fromEntries(entries.filter(Boolean)), null, 2) + "\n";
if ((await readFile(output, "utf8").catch(() => "")) !== value)
  await writeFile(output, value);
console.log(
  `Service content snapshot: ${entries.filter(Boolean).length} published pages; no drafts or identities included.`,
);
