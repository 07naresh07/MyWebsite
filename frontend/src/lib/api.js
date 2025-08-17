// src/lib/api.js
import { getToken as getOwnerToken } from "./owner.js";

/**
 * API base resolution:
 * - Uses VITE_API_URL if provided (e.g. http://localhost:5202 or https://api.example.com)
 * - If running on Vite dev (port 5173), defaults to http://localhost:5202
 * - Otherwise defaults to same-origin (empty prefix)
 */
function computeApiBase() {
  const env = (import.meta.env?.VITE_API_URL || "").trim().replace(/\/+$/, "");
  if (env) return env;

  const { protocol, hostname, port } = window.location;
  const isViteDev = port === "5173";
  if (isViteDev) return `${protocol}//${hostname}:5202`;
  return ""; // same-origin in production
}
const API = computeApiBase();

const joinUrl = (base, path) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
};

// Exported so pages/components can build absolute API URLs (e.g., for form actions)
export const apiUrl = (path) => joinUrl(API, path);

/** Resolve a server-relative path like "/uploads/xxx.png" to an absolute URL on the API host */
export const fileUrl = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  // If API is empty (same-origin), still return absolute path so <img src> works
  return API ? `${API}${p}` : p;
};

/* -----------------------------------------------------------
   Core fetch helpers (with timeout + better error parsing)
----------------------------------------------------------- */

const DEFAULT_TIMEOUT_MS = 20000;

async function parseMaybeJson(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      // fall through to text
    }
  }
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function doFetch(input, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function getJson(path) {
  const res = await doFetch(apiUrl(path), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await parseMaybeJson(res);
    const msg =
      typeof body === "string" && body
        ? body
        : (body && JSON.stringify(body)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json();
}

async function sendJson(path, method, body) {
  const token = getOwnerToken();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Owner-Token"] = token; // harmless extra for local debugging
  } else if (/^\/api\//.test(path) && method !== "GET") {
    console.warn(`[API] Owner token missing for ${method} ${path}. Unlock Owner mode first.`);
  }

  const res = await doFetch(apiUrl(path), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const bodyTextOrJson = await parseMaybeJson(res);
    const msg =
      typeof bodyTextOrJson === "string"
        ? bodyTextOrJson || `${res.status} ${res.statusText}`
        : JSON.stringify(bodyTextOrJson);

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "401 Unauthorized: Owner mode required or session expired. Please unlock from the navbar and try again."
      );
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

  const res = await doFetch(apiUrl(path), {
    method: "POST",
    headers, // browser sets multipart boundary automatically
    body: formData,
  });

  if (!res.ok) {
    const bodyTextOrJson = await parseMaybeJson(res);
    const msg =
      typeof bodyTextOrJson === "string"
        ? bodyTextOrJson || `${res.status} ${res.statusText}`
        : JSON.stringify(bodyTextOrJson);

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "401 Unauthorized: Owner mode required or session expired. Please unlock from the navbar and try again."
      );
    }
    throw new Error(msg);
  }
  return parseMaybeJson(res);
}

/* ------------------------------- Public GETs ------------------------------ */

export const getHealth     = () => getJson("/api/health");
export const getProfile    = () => getJson("/api/profile");
export const getProjects   = () => getJson("/api/projects");
export const getSkills     = () => getJson("/api/skills");
export const getEducation  = () => getJson("/api/education");
export const getExperience = () => getJson("/api/experience");

/** Primary gallery read. If backend still returns 405 on /api/gallery, fall back to /api/certificates */
export const getGallery = async () => {
  try {
    const r = await getJson("/api/gallery");
    // Support either array or {items:[...]}
    return Array.isArray(r) ? r : (Array.isArray(r?.items) ? r.items : []);
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("405") || /Method Not Allowed/i.test(msg)) {
      // Fallback: map /api/certificates into gallery-like items
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

/** Certificates table read (direct) */
export const getCertificates = () => getJson("/api/certificates");

/** Languages (collection read) */
export const getLanguages = () => getJson("/api/languages");

/** Posts listing (public) */
export const getPosts = ({ page = 1, pageSize = 10, tag } = {}) =>
  getJson(
    `/api/posts?page=${page}&pageSize=${pageSize}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`
  );

/** Single post by slug (public) — used by BlogEdit */
export const getPost = (slug) => getJson(`/api/posts/${encodeURIComponent(slug)}`);

/* --------------------------- Owner auth --------------------------- */

export async function ownerLogin(passphrase) {
  // No token on purpose; this endpoint returns a token
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

/* ----------------------------- Projects (CRUD) ---------------------------- */
export const createProject = (payload)         => sendJson("/api/projects", "POST", payload);
export const updateProject = (id, payload)     => sendJson(`/api/projects/${id}`, "PUT", payload);
export const deleteProject = (id)              => sendJson(`/api/projects/${id}`, "DELETE");

/* ---------------------------- Education (CRUD) ---------------------------- */
export const createEducation = (payload)       => sendJson("/api/education", "POST", payload);
export const updateEducation = (id, payload)   => sendJson(`/api/education/${id}`, "PUT", payload);
export const deleteEducation = (id)            => sendJson(`/api/education/${id}`, "DELETE");

/* --------------------------- Experience (CRUD) ---------------------------- */
export const createExperience = (payload)      => sendJson("/api/experience", "POST", payload);
export const updateExperience = (id, payload)  => sendJson(`/api/experience/${id}`, "PUT", payload);
export const deleteExperience = (id)           => sendJson(`/api/experience/${id}`, "DELETE");

/* ------------------------------- Skills CRUD ------------------------------ */
export const createSkill  = (payload)          => sendJson("/api/skills", "POST", payload);
export const updateSkill  = (id, payload)      => sendJson(`/api/skills/${id}`, "PUT", payload);
export const deleteSkill  = (id)               => sendJson(`/api/skills/${id}`, "DELETE");

/* ------------------------------- Languages CRUD (optional use) ------------ */
// Provided in case your backend exposes /api/languages for direct edits
export const createLanguage = (payload)        => sendJson("/api/languages", "POST", payload);
export const updateLanguage = (id, payload)    => sendJson(`/api/languages/${id}`, "PUT", payload);
export const deleteLanguage = (id)             => sendJson(`/api/languages/${id}`, "DELETE");

/* --------------------------- Profile (About page) ------------------------- */
/** Normalize and map outgoing keys to what backend expects */
function prepareProfilePayload(p = {}) {
  const toArray = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  const out = {};

  if ("fullName" in p) out.fullName = p.fullName;
  if ("quote" in p) out.quote = p.quote;
  if ("avatarUrl" in p) out.avatarUrl = p.avatarUrl;

  // <- important: map about/about_html/aboutHtml -> aboutHtml for the API
  const aboutHtml = p.aboutHtml ?? p.about_html ?? p.about ?? p.bio;
  if (aboutHtml !== undefined) out.aboutHtml = aboutHtml;

  if ("motto" in p) out.motto = p.motto ?? "";

  if ("interests" in p) out.interests = toArray(p.interests);
  if ("focus" in p) out.focus = toArray(p.focus);

  if ("languages" in p) {
    const items = Array.isArray(p.languages) ? p.languages : [];
    out.languages = items
      .map((l) =>
        typeof l === "string"
          ? { name: l, level: "" }
          : { name: l?.name ?? l?.language ?? "", level: l?.level ?? l?.proficiency ?? "" }
      )
      .filter((x) => x.name);
  }

  return out;
}

export const upsertProfile = (payload) => sendJson("/api/profile", "PUT", prepareProfilePayload(payload));

export async function uploadProfileImage(file) {
  const form = new FormData();
  form.append("file", file);
  return sendForm("/api/upload/profile-image", form); // { url: "/uploads/..." }
}

/* ---------------------------- Certificates / Gallery ---------------------- */
/* Backend compatibility:
   GET    /api/gallery           (maps certificates -> gallery items)
   POST   /api/gallery           (requires matching backend route if you want to write)
   PUT    /api/gallery/:id       (requires matching backend route)
   DELETE /api/gallery/:id       (requires matching backend route)
*/
export const createCertificate = (payload)     => sendJson("/api/gallery", "POST", payload);
export const updateCertificate = (id, payload) => sendJson(`/api/gallery/${id}`, "PUT", payload);
export const deleteCertificate = (id)          => sendJson(`/api/gallery/${id}`, "DELETE");

/** Safe third-party cert URL resolver (fixes LinkedIn CORS) */
export const resolveCertificateUrl = (url) =>
  sendJson("/api/certificates/resolve", "POST", { url });

/* -------------------------------- Blog CRUD ------------------------------- */
/* Backend routes required:
   GET    /api/posts?page=&pageSize=&tag=
   GET    /api/posts/:slug
   POST   /api/posts
   PUT    /api/posts/:id
   DELETE /api/posts/:id
*/
export const createPost = (payload)            => sendJson("/api/posts", "POST", payload);
export const updatePost = (id, payload)        => sendJson(`/api/posts/${id}`, "PUT", payload);
export const deletePost = (id)                 => sendJson(`/api/posts/${id}`, "DELETE");

/* --------------------------- Public: Contact form ------------------------- */
// Use from Contact.jsx, or call fetch(apiUrl("/contact")) directly.
export const sendContact = (payload)           => sendJson("/contact", "POST", payload);
