// src/lib/api.js
import { getToken as getOwnerToken } from "./owner.js";

/**
 * API base resolution:
 * - If VITE_API_URL or VITE_BACKEND_URL is provided (e.g. http://127.0.0.1:5202), use it.
 * - Otherwise, default to same-origin (empty prefix) so Vite's dev proxy handles /api.
 */
function computeApiBase() {
  const envA = (import.meta.env?.VITE_API_URL || "").trim();
  const envB = (import.meta.env?.VITE_BACKEND_URL || "").trim();
  const env = (envA || envB).replace(/\/+$/, "");
  // When unset -> "", so fetch("/api/...") stays same-origin and hits Vite proxy
  return env;
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
    headers["X-Owner-Token"] = token; // optional debug header
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

// x-www-form-urlencoded (for /api/auth/owner expecting `pass_`)
async function sendFormUrlEncoded(path, bodyObj) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const res = await doFetch(apiUrl(path), {
    method: "POST",
    headers,
    body: new URLSearchParams(bodyObj),
  });
  if (!res.ok) {
    const body = await parseMaybeJson(res);
    const msg =
      typeof body === "string" && body
        ? body
        : (body && JSON.stringify(body)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return parseMaybeJson(res);
}

/* ---------------------- Robust DELETE with fallbacks ---------------------- */

function shouldFallback(err) {
  const m = String(err?.message || "");
  return /(405|method not allowed|404|not found|422|unprocessable)/i.test(m);
}

async function deleteWithFallback(resource, id) {
  if (id == null) throw new Error(`Missing id for delete ${resource}`);
  const idStr = encodeURIComponent(String(id));
  const token = getOwnerToken();
  const baseHeaders = { Accept: "application/json" };
  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
    baseHeaders["X-Owner-Token"] = token;
    baseHeaders["X-HTTP-Method-Override"] = "DELETE"; // helps behind some proxies
  } else {
    console.warn(`[API] Owner token missing for DELETE /api/${resource}/${idStr}`);
  }

  // 1) Preferred: DELETE /api/resource/{id}
  try {
    const res = await doFetch(apiUrl(`/api/${resource}/${idStr}`), {
      method: "DELETE",
      headers: baseHeaders,
    });
    if (!res.ok) {
      const body = await parseMaybeJson(res);
      const msg = typeof body === "string" ? body : JSON.stringify(body);
      throw new Error(msg || `${res.status} ${res.statusText}`);
    }
    return res.status === 204 ? null : parseMaybeJson(res);
  } catch (e1) {
    if (!shouldFallback(e1)) throw e1;

    // 2) DELETE /api/resource?id=ID
    try {
      const res = await doFetch(apiUrl(`/api/${resource}?id=${idStr}`), {
        method: "DELETE",
        headers: baseHeaders,
      });
      if (res.ok) return res.status === 204 ? null : parseMaybeJson(res);
      const body = await parseMaybeJson(res);
      const msg = typeof body === "string" ? body : JSON.stringify(body);
      throw new Error(msg || `${res.status} ${res.statusText}`);
    } catch (e2) {
      if (!shouldFallback(e2)) throw e2;

      // 3) POST /api/resource/delete  { id }
      try {
        return await sendJson(`/api/${resource}/delete`, "POST", { id });
      } catch (e3) {
        // 4) POST /api/resource/{id}/delete  {}
        try {
          return await sendJson(`/api/${resource}/${idStr}/delete`, "POST", {});
        } catch (e4) {
          // 5) DELETE /api/resource with JSON body { id } (some frameworks allow body on DELETE)
          try {
            return await sendJson(`/api/${resource}`, "DELETE", { id });
          } catch (e5) {
            console.error(`[API] Failed to delete ${resource} ${id}:`, e1, e2, e3, e4, e5);
            throw e5;
          }
        }
      }
    }
  }
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
export const getLanguages = () => getJson("/api/languages");

export const getPosts = ({ page = 1, pageSize = 10, tag } = {}) =>
  getJson(`/api/posts?page=${page}&pageSize=${pageSize}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`);

export const getPost = (slug) => getJson(`/api/posts/${encodeURIComponent(slug)}`);

/* --------------------------- Owner auth --------------------------- */

// IMPORTANT: backend expects form field name **pass_**
export async function ownerLogin(passphrase) {
  const data = await sendFormUrlEncoded("/api/auth/owner", { pass_: passphrase });
  if (data?.token) {
    try { localStorage.setItem("token", data.token); } catch {}
  }
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
export const updateProject = (id, payload)     => sendJson(`/api/projects/${encodeURIComponent(String(id))}`, "PUT", payload);
export const deleteProject = (id)              => deleteWithFallback("projects", id);

/* ---------------------------- Education (CRUD) ---------------------------- */
export const createEducation = (payload)       => sendJson("/api/education", "POST", payload);
export const updateEducation = (id, payload)   => sendJson(`/api/education/${encodeURIComponent(String(id))}`, "PUT", payload);
export const deleteEducation = (id)            => deleteWithFallback("education", id);

/* --------------------------- Experience (CRUD) ---------------------------- */
export const createExperience = (payload)      => sendJson("/api/experience", "POST", payload);
export const updateExperience = (id, payload)  => sendJson(`/api/experience/${encodeURIComponent(String(id))}`, "PUT", payload);
export const deleteExperience = (id)           => deleteWithFallback("experience", id);

/* ------------------------------- Skills CRUD ------------------------------ */
export const createSkill  = (payload)          => sendJson("/api/skills", "POST", payload);
export const updateSkill  = (id, payload)      => sendJson(`/api/skills/${encodeURIComponent(String(id))}`, "PUT", payload);
export const deleteSkill  = (id)               => deleteWithFallback("skills", id);

/* --------------------------- Profile (About page) ------------------------- */
export const upsertProfile = (payload)         => sendJson("/api/profile", "POST", payload);

export async function uploadProfileImage(file) {
  const form = new FormData();
  form.append("file", file);
  return sendForm("/api/upload/profile-image", form); // { url: "/uploads/..." }
}

/* ---------------------------- Certificates / Gallery ---------------------- */
export const createCertificate = (payload)     => sendJson("/api/gallery", "POST", payload);
export const updateCertificate = (id, payload) => sendJson(`/api/gallery/${encodeURIComponent(String(id))}`, "PUT", payload);
export const deleteCertificate = (id)          => deleteWithFallback("gallery", id);

/** Safe third-party cert URL resolver (fixes LinkedIn CORS) */
export const resolveCertificateUrl = (url) =>
  sendJson("/api/certificates/resolve", "POST", { url });

/* -------------------------------- Blog CRUD ------------------------------- */
export const createPost = (payload)            => sendJson("/api/posts", "POST", payload);
export const updatePost = (id, payload)        => sendJson(`/api/posts/${encodeURIComponent(String(id))}`, "PUT", payload);
export const deletePost = (id)                 => deleteWithFallback("posts", id);

/* --------------------------- Public: Contact form ------------------------- */
export const sendContact = (payload)           => sendJson("/api/contact", "POST", payload);
