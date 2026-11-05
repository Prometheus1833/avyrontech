import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { serviceContentManifest } = await server.ssrLoadModule(
    "/src/data/serviceContentRegistry.ts",
  );
  const serialized = JSON.stringify(serviceContentManifest, null, 2) + "\n";
  const path = "src/shared/serviceContentManifest.json";
  if (process.argv.includes("--check")) {
    if ((await readFile(path, "utf8")) !== serialized)
      throw Error(
        "Service content manifest is stale; run npm run service-content:generate.",
      );
  } else await writeFile(path, serialized);
  console.log(
    `Service content: ${Object.keys(serviceContentManifest).length} pages, ${Object.values(serviceContentManifest).reduce((count, page) => count + Object.keys(page.values).length, 0)} editable fields.`,
  );
} finally {
  await server.close();
}
