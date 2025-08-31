// src/lib/owner.js
import { useEffect, useState } from "react";

const KEY_MODE   = "ownerMode";            // "true" | "false"
const KEY_TOKEN  = "ownerToken";           // canonical token key
const ALT_TOKEN  = "token";                // legacy/alternate key some code used
const KEY_TOGGLE = "ownerToggleVisible";   // show toggle in prod after enable
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

/* --------------------- JWT helpers (robust) --------------------- */
function b64urlDecode(str) {
  try {
    let s = (str || "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";               // pad for proper base64
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

/* --------------------- Public API --------------------- */
// Owner = flag true AND token exists & not expired
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
    // Read canonical first, then fallback to legacy "token"
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
    // Write under both keys for compatibility with code that reads either
    writeBoth(KEY_TOKEN, token);
    writeBoth(ALT_TOKEN, token);
    writeLS(KEY_MODE, "true");
    // Ensure toggle stays visible once signed in (so user can sign out later)
    writeLS(KEY_TOGGLE, "true");
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

// When should the toggle be visible?
// - Always in Vite dev
// - When running on localhost/127.*
// - If already signed in (token present & valid)
// - If user previously enabled it
// - If URL has ?admin=1 (persist & strip)
export function getToggleVisible() {
  try {
    const dev = !!import.meta?.env?.DEV;
    if (dev) return true;

    if (hasWindow) {
      const { hostname, href } = window.location;
      const isLocalhost = /^localhost$|^127\.|^0\.0\.0\.0$/.test(hostname);
      if (isLocalhost) return true;

      // one-shot unlock via ?admin=1
      const url = new URL(href);
      if (url.searchParams.get("admin") === "1" || url.searchParams.get("admin") === "true") {
        writeLS(KEY_TOGGLE, "true");
        url.searchParams.delete("admin");
        window.history.replaceState({}, "", url);
        return true;
      }
    }

    // visible if signed in or user enabled previously
    if (getOwner()) return true;
    return (ls && ls.getItem(KEY_TOGGLE)) === "true";
  } catch { return false; }
}

export function setToggleVisible(v) {
  try { writeLS(KEY_TOGGLE, v ? "true" : "false"); dispatchOwnerEvent(); } catch {}
}

/* --------------------- React hook --------------------- */
export function useOwnerMode() {
  const [owner, setOwner] = useState(getOwner());
  const [token, setTok]   = useState(getToken());

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

  return { owner, token };
}

/* --------------------- internal --------------------- */
function dispatchOwnerEvent() { try { window.dispatchEvent(new Event(EVT)); } catch {} }
