// src/lib/owner.js
import { useEffect, useState } from "react";

const KEY_MODE   = "ownerMode";            // "true" | "false"
const KEY_TOKEN  = "ownerToken";           // canonical token key
const ALT_TOKEN  = "token";                // legacy/alternate key some code used
const KEY_TOGGLE = "ownerToggleVisible";   // user toggle flag (used only when env allows)
const EVT        = "owner-mode-changed";

/* --------------------- Safe storage helpers --------------------- */
const hasWindow = typeof window !== "undefined";
const ls = (() => { if (!hasWindow) return null; try { return window.localStorage; } catch { return null; }})();
const ss = (() => { if (!hasWindow) return null; try { return window.sessionStorage; } catch { return null; }})();

function read(k) {
  try { return (ss && ss.getItem(k)) || (ls && ls.getItem(k)) || ""; } catch { return ""; }
}
function writeBoth(k, v) {
  try { ss && ss.setItem(k, v); } catch {}
  try { ls && ls.setItem(k, v); } catch {}
}
function removeBoth(k) {
  try { ss && ss.removeItem(k); } catch {}
  try { ls && ls.removeItem(k); } catch {}
}
function writeLS(k, v) { try { ls && ls.setItem(k, v); } catch {} }

/* --------------------- JWT helpers --------------------- */
function b64urlDecode(str) {
  try {
    let s = (str || "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return atob(s);
  } catch { return ""; }
}
function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = b64urlDecode(part);
    return JSON.parse(json);
  } catch { return null; }
}
function isExpired(token) {
  const p = decodeJwtPayload(token);
  if (!p || !p.exp) return false; // treat as non-expiring if no exp
  const now = Math.floor(Date.now() / 1000);
  return Number(p.exp) <= now;
}

/* --------------------- API base URL helper --------------------- */
function getApiBase() {
  try {
    const envA = (import.meta.env?.VITE_API_URL || "").trim();
    const envB = (import.meta.env?.VITE_BACKEND_URL || "").trim();
    return (envA || envB).replace(/\/+$/, "");
  } catch { return ""; }
}

/* --------------------- Public API --------------------- */
export function getOwner() {
  try {
    const mode = (ls && ls.getItem(KEY_MODE)) === "true";
    const tok  = getToken();
    if (!mode || !tok) return false;
    return true;
  } catch { return false; }
}

export function getToken() {
  try {
    let tok = read(KEY_TOKEN) || read(ALT_TOKEN);
    if (!tok) return "";
    if (isExpired(tok)) { signOutOwner(); return ""; }
    return tok;
  } catch { return ""; }
}

export function setOwnerFlag(v) {
  try {
    writeLS(KEY_MODE, String(!!v));
    dispatchOwnerEvent();
  } catch {}
}

export function signInOwner(token) {
  try {
    if (!token || isExpired(token)) { signOutOwner(); return; }
    // store token under both keys for compatibility
    writeBoth(KEY_TOKEN, token);
    writeBoth(ALT_TOKEN, token);
    writeLS(KEY_MODE, "true");
    // IMPORTANT: do NOT force-enable toggle visibility here (prevents prod toggle)
    // writeLS(KEY_TOGGLE, "true");  // intentionally removed
    dispatchOwnerEvent();
  } catch {}
}

export function signOutOwner() {
  try {
    removeBoth(KEY_TOKEN);
    removeBoth(ALT_TOKEN);
    writeLS(KEY_MODE, "false");
    dispatchOwnerEvent();
  } catch {}
}

/**
 * Toggle visibility policy:
 *  - Vite dev:        visible
 *  - localhost/127/0: visible
 *  - Deployed:        hidden by default
 *  - Optional overrides via env:
 *      VITE_OWNER_TOGGLE=always  -> always visible (even in prod)
 *      VITE_OWNER_TOGGLE=on      -> allow user-stored KEY_TOGGLE flag to control visibility in prod
 */
export function getToggleVisible() {
  try {
    const envFlag = String(import.meta?.env?.VITE_OWNER_TOGGLE || "off").toLowerCase();

    // explicit "always" wins everywhere
    if (envFlag === "always") return true;

    // dev server (vite) => always show
    const dev = !!import.meta?.env?.DEV;
    if (dev) return true;

    // local hostnames => always show
    if (hasWindow) {
      const { hostname } = window.location;
      if (/^localhost$|^127\.|^0\.0\.0\.0$/.test(hostname)) return true;
    }

    // prod default: hidden, unless env explicitly allows KEY_TOGGLE
    if (envFlag === "on") {
      return (ls && ls.getItem(KEY_TOGGLE)) === "true";
    }

    // otherwise hard-off in prod
    return false;
  } catch {
    return false;
  }
}

export function setToggleVisible(v) {
  try { writeLS(KEY_TOGGLE, v ? "true" : "false"); dispatchOwnerEvent(); } catch {}
}

/* --------------------- Remote Authentication API --------------------- */
export async function loginAsOwner(password, apiBase = "") {
  try {
    const base = apiBase || getApiBase();
    const url = base ? `${base}/api/auth/owner` : "/api/auth/owner";

    const formData = new URLSearchParams();
    formData.append("pass_", password);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData
    });

    if (!res.ok) throw new Error((await res.text()) || `Authentication failed (${res.status})`);

    const data = await res.json();
    if (!data?.token) throw new Error("No token received from server");

    signInOwner(data.token);
    return { success: true, token: data.token };
  } catch (e) {
    return { success: false, error: e?.message || "Authentication failed" };
  }
}

export async function verifyToken(apiBase = "") {
  const token = getToken();
  if (!token) return false;

  try {
    const base = apiBase || getApiBase();
    const url = base ? `${base}/api/auth/me` : "/api/auth/me";

    const response = await fetch(url, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
    });

    if (response.ok) return true;

    // invalid token -> clear it
    signOutOwner();
    return false;
  } catch {
    return false;
  }
}

export function logoutOwner() {
  signOutOwner();
}

export function clearOwnerStorage() {
  try {
    const keys = [KEY_MODE, KEY_TOKEN, ALT_TOKEN, KEY_TOGGLE, "owner_token", "auth_token", "access_token"];
    keys.forEach(key => { removeBoth(key); });
    dispatchOwnerEvent();
  } catch {}
}

/* --------------------- React hook --------------------- */
export function useOwnerMode() {
  const [owner, setOwner] = useState(getOwner());
  const [token, setTok]   = useState(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Optional: verify token on mount; if you don't need remote verification, remove this block
    const checkAuth = async () => {
      const currentToken = getToken();
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
    const sync = () => { setOwner(getOwner()); setTok(getToken()); };

    const onStorage = (e) => {
      // some browsers dispatch null keys; resync anyway
      if (!e || !("key" in e) || [null, KEY_MODE, KEY_TOKEN, ALT_TOKEN, KEY_TOGGLE].includes(e.key)) sync();
    };
    const onVis = () => { if (document.visibilityState === "visible") sync(); };

    window.addEventListener(EVT, sync);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    sync();

    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return { owner, token, loading };
}

export function useOwnerModeWithSetter() {
  const { owner, token, loading } = useOwnerMode();
  const setOwner = (value) => {
    if (value) {
      console.warn("[Owner] Cannot set owner=true without logging in. Use loginAsOwner() instead.");
    } else {
      signOutOwner();
    }
  };
  return { owner, setOwner, token, loading };
}

/* --------------------- internal --------------------- */
function dispatchOwnerEvent() { try { window.dispatchEvent(new Event(EVT)); } catch {} }
