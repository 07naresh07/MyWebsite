// src/lib/api.ts
import type { PagedResult, Post, Project } from "../types";

// Use backend base URL in prod (from Vercel). Fall back to "" for local dev (Vite proxy).
const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

// Prefix helper that guarantees exactly one slash between BASE and path.
function u(path: string) {
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return (res.json() as unknown) as T;
}

export const api = {
  getPosts(page: number, pageSize: number, tag?: string) {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(tag ? { tag } : {}),
    }).toString();

    return fetch(u(`/api/posts?${qs}`)).then((r) =>
      toJson<PagedResult<Post>>(r)
    );
  },

  getPost(slug: string) {
    return fetch(u(`/api/posts/${encodeURIComponent(slug)}`)).then((r) =>
      toJson<Post>(r)
    );
  },

  getProjects() {
    return fetch(u(`/api/projects`)).then((r) => toJson<Project[]>(r));
  },

  // Add others the same way:
  // getSkills:   () => fetch(u(`/api/skills`)).then((r) => toJson<Skill[]>(r)),
  // getProfile:  () => fetch(u(`/api/profile`)).then((r) => toJson<Profile>(r)),
  // getCerts:    () => fetch(u(`/api/certificates`)).then((r) => toJson<Certificate[]>(r)),
  // getExp:      () => fetch(u(`/api/experience`)).then((r) => toJson<Experience[]>(r)),
  // getEdu:      () => fetch(u(`/api/education`)).then((r) => toJson<Education[]>(r)),
};
