// Thin fetch wrapper around the Cloudflare Worker API.
//
// When `PUBLIC_API_BASE` is set at build time the site talks to the Worker for
// shared, persisted data. When it's empty the stores fall back to localStorage
// so the site still works as a static demo (single-device data).

const RAW_BASE = import.meta.env.PUBLIC_API_BASE ?? "";
export const API_BASE = RAW_BASE.replace(/\/$/, "");
export const apiEnabled = API_BASE.length > 0;

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && (data as any).error) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
