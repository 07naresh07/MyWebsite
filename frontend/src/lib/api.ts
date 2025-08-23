// api.ts
import type { PagedResult, Post, Project } from "../types";

// Use env var in prod; fall back to relative for local dev with Vite proxy
const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "";

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getPosts(page: number, pageSize: number, tag?: string) {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(tag ? { tag } : {}),
    }).toString();
    return fetch(`${BASE}/api/posts?${qs}`).then(toJson<PagedResult<Post>>);
  },

  getPost(slug: string) {
    return fetch(`${BASE}/api/posts/${encodeURIComponent(slug)}`).then(
      toJson<Post>
    );
  },

  getProjects() {
    return fetch(`${BASE}/api/projects`).then(toJson<Project[]>);
  },
};
