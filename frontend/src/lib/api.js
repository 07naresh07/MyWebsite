// src/lib/api.js
import { getToken as getOwnerToken } from "./owner.js";

/* ---------------- base URL helpers ---------------- */
function computeApiBase() {
  const env = (import.meta.env?.VITE_API_URL || "").trim().replace(/\/+$/, "");
  if (env) return env;

  const { protocol, hostname, port } = window.location;
  const isViteDev = port === "5173";
  if (isViteDev) return `${protocol}//${hostname}:5202`;
  return "";
}
const API = computeApiBase();

const joinUrl = (base, path) => `${base}${path.startsWith("/") ? path : `/${path}`}`;
export const apiUrl = (path) => joinUrl(API, path);

export const fileUrl = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return API ? `${API}${p}` : p;
};

/* ---------------- core fetch helpers ---------------- */
const DEFAULT_TIMEOUT_MS = 20000;

async function parseMaybeJson(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await res.json(); } catch {}
  }
  try { return await res.text(); } catch { return ""; }
}

async function doFetch(input, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function getJson(path) {
  const res = await doFetch(apiUrl(path), { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await parseMaybeJson(res);
    const msg = typeof body === "string" && body ? body : (body && JSON.stringify(body)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json();
}

async function sendJson(path, method, body) {
  const token = getOwnerToken();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Owner-Token"] = token;
  } else if (/^\/api\//.test(path) && method !== "GET") {
    console.warn(`[API] Owner token missing for ${method} ${path}. Unlock Owner mode first.`);
  }

  const res = await doFetch(apiUrl(path), { method, headers, body: body != null ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const bodyTextOrJson = await parseMaybeJson(res);
    const msg =
      typeof bodyTextOrJson === "string"
        ? bodyTextOrJson || `${res.status} ${res.statusText}`
        : JSON.stringify(bodyTextOrJson);
    if (res.status === 401 || res.status === 403) {
      throw new Error("401 Unauthorized: Owner mode required or session expired. Please unlock from the navbar and try again.");
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return parseMaybeJson(res);
}

async function sendForm(path, formData) {
  const token = getOwnerToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Owner-Token"] = token;
  } else if (/^\/api\//.test(path)) {
    console.warn(`[API] Owner token missing for POST ${path}. Unlock Owner mode first.`);
  }

  const res = await doFetch(apiUrl(path), { method: "POST", headers, body: formData });
  if (!res.ok) {
    const bodyTextOrJson = await parseMaybeJson(res);
    const msg =
      typeof bodyTextOrJson === "string"
        ? bodyTextOrJson || `${res.status} ${res.statusText}`
        : JSON.stringify(bodyTextOrJson);
    if (res.status === 401 || res.status === 403) {
      throw new Error("401 Unauthorized: Owner mode required or session expired. Please unlock from the navbar and try again.");
    }
    throw new Error(msg);
  }
  return parseMaybeJson(res);
}

/* ---------------- Public GETs ---------------- */
export const getHealth     = () => getJson("/api/health");
export const getProfile    = () => getJson("/api/profile");
export const getProjects   = () => getJson("/api/projects");
export const getSkills     = () => getJson("/api/skills");
export const getEducation  = () => getJson("/api/education");
export const getExperience = () => getJson("/api/experience");

export const getGallery = async () => {
  try {
    const r = await getJson("/api/gallery");
    return Array.isArray(r) ? r : (Array.isArray(r?.items) ? r.items : []);
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("405") || /Method Not Allowed/i.test(msg)) {
      const certs = await getCertificates().catch(() => []);
      return (Array.isArray(certs) ? certs : []).map((c) => ({
        id: c.id,
        title: c.title,
        description: (c.issuer || "") + (c.dateMonth ? ` • ${c.dateMonth}` : ""),
        imageUrl: c.imageUrl || c.image_url || "",
        tags: Array.isArray(c.skills) ? c.skills : [],
        sortOrder: c.sortOrder ?? 0,
        published: true,
      }));
    }
    throw e;
  }
};
export const getCertificates = () => getJson("/api/certificates");
export const getLanguages    = () => getJson("/api/languages");

export const getPosts = ({ page = 1, pageSize = 10, tag } = {}) =>
  getJson(`/api/posts?page=${page}&pageSize=${pageSize}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`);
export const getPost  = (slug) => getJson(`/api/posts/${encodeURIComponent(slug)}`);

/* ---------------- Owner auth ---------------- */
export async function ownerLogin(passphrase) {
  const data = await sendJson("/api/auth/owner", "POST", { pass: passphrase });
  return data?.token;
}
export async function authMe() {
  const token = getOwnerToken();
  const headers = token ? { Authorization: `Bearer ${token}`, "X-Owner-Token": token } : {};
  const res = await doFetch(apiUrl("/api/auth/me"), { headers });
  const body = await parseMaybeJson(res);
  return { status: res.status, body };
}

/* ---------------- Projects CRUD ---------------- */
export const createProject = (payload)         => sendJson("/api/projects", "POST", payload);
export const updateProject = (id, payload)     => sendJson(`/api/projects/${id}`, "PUT", payload);
export const deleteProject = (id)              => sendJson(`/api/projects/${id}`, "DELETE");

/* ---------------- Education CRUD ---------------- */
export const createEducation = (payload)       => sendJson("/api/education", "POST", payload);
export const updateEducation = (id, payload)   => sendJson(`/api/education/${encodeURIComponent(id)}`, "PUT", payload);

// IMPORTANT: This tries the canonical route and, if your backend doesn’t have it,
// throws a clear error without touching other API functions.
export const deleteEducation = async (id) => {
  try {
    return await sendJson(`/api/education/${encodeURIComponent(id)}`, "DELETE");
  } catch (e) {
    const msg = String(e?.message || "");
    if (/^(404|405)/.test(msg) || /Not Found|Method Not Allowed/i.test(msg)) {
      const err = new Error("DELETE /api/education/:id is not available on the backend (404/405). Please add that route.");
      err.code = "EDU_DELETE_ROUTE_MISSING";
      throw err;
    }
    throw e;
  }
};

/* ---------------- Experience CRUD ---------------- */
export const createExperience = (payload)      => sendJson("/api/experience", "POST", payload);
export const updateExperience = (id, payload)  => sendJson(`/api/experience/${id}`, "PUT", payload);
export const deleteExperience = (id)           => sendJson(`/api/experience/${id}`, "DELETE");

/* ---------------- Skills CRUD ---------------- */
export const createSkill  = (payload)          => sendJson("/api/skills", "POST", payload);
export const updateSkill  = (id, payload)      => sendJson(`/api/skills/${id}`, "PUT", payload);
export const deleteSkill  = (id)               => sendJson(`/api/skills/${id}`, "DELETE");

/* ---------------- Optional Languages CRUD ---------------- */
export const createLanguage = (payload)        => sendJson("/api/languages", "POST", payload);
export const updateLanguage = (id, payload)    => sendJson(`/api/languages/${id}`, "PUT", payload);
export const deleteLanguage = (id)             => sendJson(`/api/languages/${id}`, "DELETE");

/* ---------------- Profile (About page) ---------------- */
function prepareProfilePayload(p = {}) {
  const toListArray = (v) => {
    if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof v === "string") return v.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
    return [];
  };
  const toListText = (v) => {
    if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean).join("\n");
    if (typeof v === "string") return v;
    return "";
  };
  const toLangArray = (v) => {
    if (Array.isArray(v)) {
      return v
        .map((it) => {
          if (typeof it === "string") {
            const m = it.match(/^(.+?)\s*[:(]\s*([^)]+)\)?\s*$/);
            if (m) return { name: m[1].trim(), level: m[2].trim() };
            return { name: it.trim(), level: "" };
          }
          const name = (it?.name ?? it?.language ?? "").toString().trim();
          const level = (it?.level ?? it?.proficiency ?? "").toString().trim();
          if (!name) return null;
          return { name, level };
        })
        .filter(Boolean);
    }
    if (typeof v === "string") {
      return v
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const byColon = line.split(":");
          if (byColon.length >= 2) return { name: byColon[0].trim(), level: byColon.slice(1).join(":").trim() };
          const m = line.match(/^(.+?)\s*\((.+)\)\s*$/);
          if (m) return { name: m[1].trim(), level: m[2].trim() };
          return { name: line, level: "" };
        });
    }
    return [];
  };
  const toLangText = (v) => {
    if (Array.isArray(v)) {
      return v
        .map((it) => {
          if (typeof it === "string") return it.trim();
          const name = (it?.name ?? it?.language ?? "").toString().trim();
          const level = (it?.level ?? it?.proficiency ?? "").toString().trim();
          if (!name) return "";
          return level ? `${name}:${level}` : name;
        })
        .filter(Boolean)
        .join("\n");
    }
    if (typeof v === "string") return v;
    return "";
  };

  const out = {};

  if ("fullName"  in p) out.fullName  = p.fullName;
  if ("quote"     in p) out.quote     = p.quote;
  if ("avatarUrl" in p) out.avatarUrl = p.avatarUrl;

  const about = p.about ?? p.bio ?? p.aboutHtml ?? p.about_html;
  if (about !== undefined) out.about = about;

  if ("motto" in p) out.motto = typeof p.motto === "string" ? p.motto : (p.motto ?? "");

  const interestsArr = toListArray(p.interests ?? p.interestsText);
  const focusArr     = toListArray(p.focus ?? p.focusText);
  const langsArr     = toLangArray(p.languages ?? p.languagesText);

  out.interests = interestsArr;
  out.focus     = focusArr;
  out.languages = langsArr;

  out.interestsText = toListText(p.interests ?? p.interestsText);
  out.focusText     = toListText(p.focus ?? p.focusText);
  out.languagesText = toLangText(p.languages ?? p.languagesText);

  if (p.socials?.extras) out.socials = { extras: p.socials.extras };

  return out;
}

export const upsertProfile = (payload) =>
  sendJson("/api/profile", "PUT", prepareProfilePayload(payload));

export async function uploadProfileImage(file) {
  const form = new FormData();
  form.append("file", file);
  return sendForm("/api/upload/profile-image", form);
}

/* ---------------- Certificates / Gallery ---------------- */
export const createCertificate = (payload)     => sendJson("/api/gallery", "POST", payload);
export const updateCertificate = (id, payload) => sendJson(`/api/gallery/${id}`, "PUT", payload);
export const deleteCertificate = (id)          => sendJson(`/api/gallery/${id}`, "DELETE");
export const resolveCertificateUrl = (url)     => sendJson("/api/certificates/resolve", "POST", { url });

/* ---------------- Blog CRUD ---------------- */
export const createPost = (payload)            => sendJson("/api/posts", "POST", payload);
export const updatePost = (id, payload)        => sendJson(`/api/posts/${id}`, "PUT", payload);
export const deletePost = (id)                 => sendJson(`/api/posts/${id}`, "DELETE");

/* ---------------- Public contact ---------------- */
export const sendContact = (payload)           => sendJson("/contact", "POST", payload);
