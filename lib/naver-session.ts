const origin = "https://fin.land.naver.com/";
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
// Naver's public web client encodes its server-issued anonymous token this way.
// The token itself is obtained fresh from the public page, never from a user's browser/account.
const encodingSalt = "a7f3c91e4b6d28a05fc7e13b9d4a6082";
const sessions = new WeakMap<typeof fetch, { expires: number; promise: Promise<{ token: string; cookie: string }> }>();

async function xor(bytes: Uint8Array, nonce: Uint8Array) {
  const hex = Array.from(nonce, b => b.toString(16).padStart(2, "0")).join("");
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 32) {
    const input = new TextEncoder().encode(`${encodingSalt}:${hex}:${i / 32}`);
    const key = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
    for (let j = 0; j < 32 && i + j < bytes.length; j++) result[i + j] = bytes[i + j] ^ key[j];
  }
  return result;
}

export async function maskToken(value: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(8));
  const encoded = await xor(new TextEncoder().encode(value), nonce);
  const bytes = new Uint8Array(nonce.length + encoded.length);
  bytes.set(nonce); bytes.set(encoded, 8);
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join("")).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function unmaskToken(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), c => c.charCodeAt(0));
  if (bytes.length <= 8) throw new Error("Invalid anonymous token");
  return new TextDecoder().decode(await xor(bytes.subarray(8), bytes.subarray(0, 8)));
}

async function createSession(fetcher: typeof fetch) {
  const r = await fetcher(origin, { headers: { "User-Agent": userAgent, "Accept-Language": "ko-KR,ko;q=0.9" }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`Anonymous session HTTP ${r.status}`);
  const html = await r.text();
  if (html.length > 2000000) throw new Error("Unexpected session page");
  let token: string | undefined;
  for (const m of html.matchAll(/self\.__next_f\.push\((\[1,"(?:[^"\\]|\\.)*"\])\)/g)) {
    const flight: unknown = JSON.parse(m[1]);
    if (!Array.isArray(flight) || typeof flight[1] !== "string") continue;
    const encoded = flight[1].match(/"maskedAttestToken":"([A-Za-z0-9_-]+)"/)?.[1];
    if (encoded) { token = await unmaskToken(encoded); break; }
  }
  if (!token) throw new Error("Anonymous session format changed");
  const cookies = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : (r.headers.get("set-cookie") ?? "").split(/,(?=\s*[^;,=\s]+=)/);
  return { token, cookie: cookies.filter(Boolean).map(c => c.split(";")[0]).join("; ") };
}

export async function naverHeaders(fetcher: typeof fetch) {
  let session = sessions.get(fetcher);
  if (!session || session.expires <= Date.now()) {
    const promise = createSession(fetcher).catch(error => { sessions.delete(fetcher); throw error; });
    session = { expires: Date.now() + 120000, promise };
    sessions.set(fetcher, session);
  }
  const { token, cookie } = await session.promise;
  return {
    Accept: "application/json", "User-Agent": userAgent, "Accept-Language": "ko-KR,ko;q=0.9",
    Referer: origin, Cookie: cookie, "x-page-url": origin,
    "x-attest": await maskToken(`${Date.now()}.${token}`),
  };
}
