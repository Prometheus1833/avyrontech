/** Native API client for an authenticated operator. Never stores credentials or self-approves. */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
export async function socialOperator(
  {
    command,
    project = "aip_avyron_web",
    file,
    id,
    revision,
    reference,
    decision = "approved",
    intentKey,
    base = "https://api.avyron.ro",
    token,
  },
  fetcher = fetch,
) {
  const url = new URL(base);
  if (
    url.protocol !== "https:" ||
    !["api.avyron.ro", "avyron.ro", "app.avyron.ro"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/"
  )
    throw Error("Use the existing first-party AVYRON API.");
  if (!token)
    throw Error(
      "Native authenticated session required in AVYRON_ACCESS_TOKEN. Never paste a token into chat.",
    );
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  let path = `/api/ai-projects/${encodeURIComponent(project)}`,
    method = "GET",
    body;
  if (command === "agenda") path += "/social-manager?view=focus";
  else if (command === "handoff") {
    if (!file || !intentKey)
      throw Error(
        "A reviewed JSON package and stable --intent key are required.",
      );
    const raw = readFileSync(file);
    if (raw.byteLength > 196608)
      throw Error(
        "Handoff metadata is too large. Store assets in the native private library.",
      );
    body = JSON.stringify(JSON.parse(raw));
    method = "POST";
    path += "/social-manager/drafts";
    headers["Idempotency-Key"] = intentKey;
  } else if (command === "review") {
    if (
      !id ||
      !Number.isSafeInteger(revision) ||
      !reference ||
      !["approved", "rejected", "pending_approval"].includes(decision)
    )
      throw Error(
        "Exact content ID, revision, human approval reference and decision are required.",
      );
    path += `/content/${encodeURIComponent(id)}`;
    method = "PATCH";
    body = JSON.stringify({
      status: decision,
      expectedUpdatedAt: revision,
      origin: "codex_chat",
      approvalReference: reference,
    });
  } else throw Error("Supported commands: agenda, handoff, review.");
  const response = await fetcher(new URL(path, url), {
    method,
    headers,
    body,
    redirect: "error",
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(
      `AVYRON ${response.status}: ${result.error?.code || "request_failed"}`,
    );
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [command, ...args] = process.argv.slice(2),
    options = { command, token: process.env.AVYRON_ACCESS_TOKEN };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    if (
      ![
        "project",
        "file",
        "id",
        "revision",
        "reference",
        "decision",
        "intent",
        "base",
      ].includes(key) ||
      !args[i + 1]
    )
      throw Error("Invalid operator argument.");
    options[key === "intent" ? "intentKey" : key] =
      key === "revision" ? Number(args[i + 1]) : args[i + 1];
  }
  socialOperator(options)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
