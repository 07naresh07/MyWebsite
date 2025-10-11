// src/lib/owner.js
// POLICY: Owner mode is DISABLED on deployed sites (no edit/delete UI).
// However, lock/unlock must work everywhere via a password that yields a
// short‑lived token for that specific action. On production, we DO NOT persist
// tokens nor flip any owner flags.

import { useEffect, useState } from "react";

const KEY_MODE   = "ownerMode";            // "true" | "false"
const KEY_TOKEN  = "ownerToken";           // canonical token key (local/dev only)
const ALT_TOKEN  = "token";                // legacy key (local/dev only)
const KEY_TOGGLE = "ownerToggleVisible";   // never used in prod
const EVT        = "owner-mode-changed";

/* --------------------- Environment helpers --------------------- */
const hasWindow = typeof window !== "undefined";
const isViteDev = !!import.meta?.env?.DEV;
const isLocalHost = hasWindow && (/^localhost$|^127\.|^0\.0\.0\.0$/.test(window.location.hostname));
const isLocalDev = isViteDev || isLocalHost;   // where owner UI is allowed
const isProdLike = !isLocalDev;                // where owner UI is hard disabled

/* --------------------- Safe storage helpers --------------------- */
const ls = (() => { if (!hasWindow) return null; try { return window.localStorage; } catch { return null; }})();
const ss = (() => { if (!hasWindow) return null; try { return window.sessionStorage; } catch { return null; }})();

function read(k) { try { return (ss && ss.getItem(k)) || (ls && ls.getItem(k)) || ""; } catch { return ""; } }
function writeBoth(k, v) { try { ss && ss.setItem(k, v); } catch {} try { ls && ls.setItem(k, v); } catch {} }
function removeBoth(k) { try { ss && ss.removeItem(k); } catch {} try { ls && ls.removeItem(k); } catch {} }
function writeLS(k, v) { try { ls && ls.setItem(k, v); } catch {} }

/* --------------------- JWT helpers --------------------- */
function b64urlDecode(str) { try { let s = (str || "").replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return atob(s); } catch { return ""; } }
function decodeJwtPayload(token) { try { const part = token.split(".")[1]; if (!part) return null; return JSON.parse(b64urlDecode(part)); } catch { return null; } }
function isExpired(token) { const p = decodeJwtPayload(token); if (!p || !p.exp) return false; const now = Math.floor(Date.now() / 1000); return Number(p.exp) <= now; }

/* --------------------- API base URL helper --------------------- */
function getApiBase() { try { const envA = (import.meta.env?.VITE_API_URL || "").trim(); const envB = (import.meta.env?.VITE_BACKEND_URL || "").trim(); return (envA || envB).replace(/\/+$/, ""); } catch { return ""; } }

/* --------------------- Core owner state (local/dev only) --------------------- */
function getOwnerLocalOnly() {
  if (isProdLike) return false; // never true in prod
  try {
    const mode = (ls && ls.getItem(KEY_MODE)) === "true";
    const tok  = getTokenLocalOnly();
    if (!mode || !tok) return false;
    return true;
  } catch { return false; }
}

function getTokenLocalOnly() {
  if (isProdLike) return ""; // ignore stored tokens in prod
  try {
    let tok = read(KEY_TOKEN) || read(ALT_TOKEN);
    if (!tok) return "";
    if (isExpired(tok)) { signOutOwner(); return ""; }
    return tok;
  } catch { return ""; }
}

/* --------------------- Public API --------------------- */
export function getOwner() { return getOwnerLocalOnly(); }
export function getToken() { return getTokenLocalOnly(); }

export function setOwnerFlag(v) { if (isProdLike) return; try { writeLS(KEY_MODE, String(!!v)); dispatchOwnerEvent(); } catch {} }

export function signInOwner(token) {
  if (isProdLike) return; // never enable owner in prod
  try {
    if (!token || isExpired(token)) { signOutOwner(); return; }
    writeBoth(KEY_TOKEN, token);
    writeBoth(ALT_TOKEN, token);
    writeLS(KEY_MODE, "true");
    dispatchOwnerEvent();
  } catch {}
}

export function signOutOwner() { try { removeBoth(KEY_TOKEN); removeBoth(ALT_TOKEN); writeLS(KEY_MODE, "false"); dispatchOwnerEvent(); } catch {} }

/**
 * Toggle visibility (Navbar button etc.):
 *  - Local/dev: visible
 *  - Prod: hidden unless env overrides to "always"
 */
export function getToggleVisible() {
  try {
    const envFlag = String(import.meta?.env?.VITE_OWNER_TOGGLE || "off").toLowerCase();
    if (envFlag === "always") return true;
    if (isLocalDev) return true;
    return false;
  } catch { return false; }
}

export function setToggleVisible(v) { if (isProdLike) return; try { writeLS(KEY_TOGGLE, v ? "true" : "false"); dispatchOwnerEvent(); } catch {} }

/* --------------------- Auth for actions (works in prod) --------------------- */
// IMPORTANT: This authenticates for a SINGLE ACTION (e.g., lock/unlock) and
// NEVER persists any owner state in production. On local/dev it also returns a
// token and will persist owner state (so you can use the full owner UI).
export async function loginAsOwner(password, apiBase = "") {
  try {
    const base = apiBase || getApiBase();
    const url = base ? `${base}/api/auth/owner` : "/api/auth/owner";

    const formData = new URLSearchParams();
    formData.append("pass_", password);

    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formData });
    if (!res.ok) throw new Error((await res.text()) || `Authentication failed (${res.status})`);

    const data = await res.json();
    if (!data?.token) throw new Error("No token received from server");

    // In local/dev we also persist owner mode for convenience.
    // In production we return the token ONLY (no side effects).
    if (isLocalDev) signInOwner(data.token);

    return { success: true, token: data.token };
  } catch (e) {
    return { success: false, error: e?.message || "Authentication failed" };
  }
}

export async function verifyToken(apiBase = "") {
  if (isProdLike) return false; // never elevate owner in prod
  const token = getTokenLocalOnly();
  if (!token) return false;
  try {
    const base = apiBase || getApiBase();
    const url = base ? `${base}/api/auth/me` : "/api/auth/me";
    const response = await fetch(url, { method: "GET", headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" } });
    if (response.ok) return true;
    signOutOwner();
    return false;
  } catch { return false; }
}

export function logoutOwner() { signOutOwner(); }

export function clearOwnerStorage() { try { [KEY_MODE, KEY_TOKEN, ALT_TOKEN, KEY_TOGGLE, "owner_token", "auth_token", "access_token"].forEach(k => removeBoth(k)); dispatchOwnerEvent(); } catch {} }

/* --------------------- React hook --------------------- */
export function useOwnerMode() {
  const [owner, setOwner] = useState(isLocalDev ? getOwnerLocalOnly() : false);
  const [token, setTok]   = useState(isLocalDev ? getTokenLocalOnly() : "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isProdLike) { setOwner(false); setTok(""); setLoading(false); return; }
    const checkAuth = async () => {
      const currentToken = getTokenLocalOnly();
      if (currentToken) {
        const ok = await verifyToken().catch(() => false);
        setOwner(ok);
      } else {
        setOwner(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isProdLike) return;
    const sync = () => { setOwner(getOwnerLocalOnly()); setTok(getTokenLocalOnly()); };
    const onStorage = (e) => { if (!e || !("key" in e) || [null, KEY_MODE, KEY_TOKEN, ALT_TOKEN, KEY_TOGGLE].includes(e.key)) sync(); };
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    sync();
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return { owner, token, loading };
}

export function useOwnerModeWithSetter() {
  const { owner, token, loading } = useOwnerMode();
  const setOwner = (value) => { if (value) { console.warn("[Owner] Cannot set owner=true without logging in (and only on local/dev)."); } else { signOutOwner(); } };
  return { owner, setOwner, token, loading };
}

/* --------------------- internal --------------------- */
function dispatchOwnerEvent() { try { window.dispatchEvent(new Event(EVT)); } catch {} }
