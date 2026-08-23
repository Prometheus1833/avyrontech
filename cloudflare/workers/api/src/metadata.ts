const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 200_000;
const FETCH_TIMEOUT_MS = 8_000;

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".lan", ".home", ".internal"];

const parseIpv4 = (hostname: string): number[] | null => {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  return octets.every((octet, index) => /^\d{1,3}$/.test(parts[index]) && octet >= 0 && octet <= 255)
    ? octets
    : null;
};

const isBlockedIpv4 = ([a, b, c]: number[]) =>
  a === 0 ||
  a === 10 ||
  a === 127 ||
  (a === 100 && b >= 64 && b <= 127) ||
  (a === 169 && b === 254) ||
  (a === 172 && b >= 16 && b <= 31) ||
  (a === 192 && b === 0 && (c === 0 || c === 2)) ||
  (a === 192 && b === 168) ||
  (a === 198 && (b === 18 || b === 19)) ||
  (a === 198 && b === 51 && c === 100) ||
  (a === 203 && b === 0 && c === 113) ||
  a >= 224;

const isBlockedIpv6 = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  if (!normalized.includes(":")) return false;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89abcdef]/.test(normalized) || normalized.startsWith("ff")) return true;
  if (normalized.startsWith("2001:db8:")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = parseIpv4(normalized.slice("::ffff:".length));
    return mapped ? isBlockedIpv4(mapped) : true;
  }
  return false;
};

export const validateMetadataUrl = (value: string | URL): URL => {
  const url = value instanceof URL ? new URL(value) : new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("Unsupported protocol");
  if (url.username || url.password) throw new TypeError("Credentials are not allowed");
  if (url.port) throw new TypeError("Non-standard ports are not allowed");

  const hostname = url.hostname.startsWith("[") && url.hostname.endsWith("]")
    ? url.hostname.slice(1, -1)
    : url.hostname;
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized === "localhost" || (!normalized.includes(".") && !normalized.includes(":"))) {
    throw new TypeError("Public hostname required");
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    throw new TypeError("Private hostname is not allowed");
  }
  const ipv4 = parseIpv4(normalized);
  if ((ipv4 && isBlockedIpv4(ipv4)) || isBlockedIpv6(normalized)) {
    throw new TypeError("Private address is not allowed");
  }
  return url;
};

export const readTextUpTo = async (response: Response, maxBytes = MAX_HTML_BYTES): Promise<string> => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = "";
  let bytesRead = 0;

  while (bytesRead < maxBytes) {
    const { done, value } = await reader.read();
    if (done) {
      output += decoder.decode();
      return output;
    }
    const remaining = maxBytes - bytesRead;
    const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
    output += decoder.decode(chunk, { stream: chunk.byteLength === value.byteLength });
    bytesRead += chunk.byteLength;
    if (chunk.byteLength < value.byteLength) break;
  }

  await reader.cancel("metadata response limit reached").catch(() => undefined);
  output += decoder.decode();
  return output;
};

export const fetchMetadataHtml = async (initialUrl: URL): Promise<{ html: string; url: URL }> => {
  let current = validateMetadataUrl(initialUrl);
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(current, {
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9",
        "user-agent": "AvyronBot/1.0 (+https://avyron.ro)",
      },
      redirect: "manual",
      signal,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error("Invalid redirect chain");
      current = validateMetadataUrl(new URL(location, current));
      continue;
    }
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);

    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("Upstream response is not HTML");
    }
    return { html: await readTextUpTo(response), url: current };
  }

  throw new Error("Too many redirects");
};
