// Server-side admin authentication via signed cookie (HMAC-SHA256).
// Werkt in Vercel Edge Runtime via Web Crypto API.

const SECRET = process.env.ADMIN_SECRET || "";

const COOKIE_NAME = "admin_token";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dagen

async function hmac(message: string): Promise<string> {
  if (!SECRET) throw new Error("ADMIN_SECRET niet ingesteld");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string vergelijk om timing attacks te vermijden. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signAdminToken(): Promise<string> {
  const exp = Date.now() + TTL_MS;
  const payload = `admin.${exp}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token || !SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== "admin") return false;
  const exp = parseInt(expStr, 10);
  if (Number.isNaN(exp) || exp < Date.now()) return false;
  try {
    const expectedSig = await hmac(`${role}.${expStr}`);
    return safeEqual(sig, expectedSig);
  } catch {
    return false;
  }
}

export function readAdminCookie(req: Request): string | undefined {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export async function isAdminRequest(req: Request): Promise<boolean> {
  return verifyAdminToken(readAdminCookie(req));
}

export function setCookieHeader(token: string): string {
  const maxAge = Math.floor(TTL_MS / 1000);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Secure`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`;
}
