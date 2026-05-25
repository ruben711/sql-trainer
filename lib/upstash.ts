// Lichte Upstash Redis-client via REST API (geen SDK, edge-compatibel).
// Env-vars worden auto-ingesteld als je Vercel-KV koppelt, of handmatig
// via een Upstash account (https://console.upstash.com).

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const isConfigured = Boolean(URL && TOKEN);

async function cmd<T = any>(...args: (string | number)[]): Promise<T> {
  if (!URL || !TOKEN) throw new Error("Upstash niet geconfigureerd");
  const path = args.map((a) => encodeURIComponent(String(a))).join("/");
  const res = await fetch(`${URL}/${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.result as T;
}

export async function getJson<T = any>(key: string): Promise<T | null> {
  const v = await cmd<string | null>("GET", key);
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

export async function setJson(key: string, value: any): Promise<void> {
  // Upstash REST API: POST-body voor lange waarden
  if (!URL || !TOKEN) throw new Error("Upstash niet geconfigureerd");
  const res = await fetch(`${URL}/SET/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "text/plain" },
    body: JSON.stringify(value),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash SET ${res.status}: ${await res.text()}`);
}
