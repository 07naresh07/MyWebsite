import type { PagedResult, Post, Project } from "../types";

// In dev we rely on Vite proxy: use relative base ("")
const BASE = "";

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
