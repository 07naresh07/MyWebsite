import type { PagedResult, Post, Project } from "../types";

/** API base:
 * - Use VITE_API_URL if set (recommended: http://127.0.0.1:5174)
 * - Otherwise same-origin (assumes a Vite proxy is configured)
 */
const API =
  (import.meta as any).env?.VITE_API_URL?.trim().replace(/\/+$/, "") || "";

// Resolve a path to absolute API URL when VITE_API_URL is present
const apiUrl = (path: string) => (API ? `${API}${path}` : path);

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
    return fetch(apiUrl(`/api/posts?${qs}`)).then(toJson<PagedResult<Post>>);
  },

  getPost(slug: string) {
    return fetch(apiUrl(`/api/posts/${encodeURIComponent(slug)}`)).then(
      toJson<Post>
    );
  },

  getProjects() {
    return fetch(apiUrl(`/api/projects`)).then(toJson<Project[]>);
  },
};
