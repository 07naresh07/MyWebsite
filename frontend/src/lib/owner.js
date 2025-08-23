// src/lib/owner.js
import { useEffect, useState } from "react";

const KEY_MODE   = "ownerMode";            // "true" | "false"
const KEY_TOKEN  = "ownerToken";           // token stored in both session & local
const KEY_TOGGLE = "ownerToggleVisible";   // show toggle in prod after enable
const EVT        = "owner-mode-changed";

/* --------------------- Safe storage helpers --------------------- */
const hasWindow = typeof window !== "undefined";
const ls = (() => { if (!hasWindow) return null; try { return window.localStorage; } catch { return null; }})();
const ss = (() => { if (!hasWindow) return null; try { return window.sessionStorage; } catch { return null; }})();

function read(k) {
  try { return (ss && ss.getItem(k)) || (ls && ls.getItem(k)) || ""; } catch { return ""; }
}
function writeBoth(k, v) { try { ss && ss.setItem(k, v); } catch {} try { ls && ls.setItem(k, v); } catch {} }
function removeBoth(k) { try { ss && ss.removeItem(k); } catch {} try { ls && ls.removeItem(k); } catch {} }
function writeLS(k, v) { try { ls && ls.setItem(k, v); } catch {} }

/* --------------------- JWT helpers --------------------- */
function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
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
// OWNER is true if UI flag is set AND (no token required for cookie flow).
// If a token exists (legacy/JWT), it must be valid.
export function getOwner() {
  try {
    const mode = (ls && ls.getItem(KEY_MODE)) === "true";
    const tok  = read(KEY_TOKEN);

    if (tok && isExpired(tok)) {
      removeBoth(KEY_TOKEN);
    }
    return mode && (!tok || !isExpired(tok));
  } catch { return false; }
}

export function getToken() {
  try {
    const tok = read(KEY_TOKEN);
    if (!tok) return "";
    return isExpired(tok) ? "" : tok;
  } catch { return ""; }
}

export function setOwnerFlag(v) {
  try {
    writeLS(KEY_MODE, String(!!v));
    dispatchOwnerEvent();
  } catch {}
}

// Accepts optional JWT (legacy). If absent, still enable owner mode (cookie flow).
export function signInOwner(token) {
  try {
    if (token) {
      if (isExpired(token)) { signOutOwner(); return; }
      writeBoth(KEY_TOKEN, token);
    } else {
      removeBoth(KEY_TOKEN);
    }
    writeLS(KEY_MODE, "true");
    writeLS(KEY_TOGGLE, "true");
    dispatchOwnerEvent();
  } catch {}
}

export function signOutOwner() {
  try {
    removeBoth(KEY_TOKEN);
    writeLS(KEY_MODE, "false");
    dispatchOwnerEvent();
  } catch {}
}

// Toggle visible in dev, localhost, if signed in, if previously enabled, or via ?admin=1
export function getToggleVisible() {
  try {
    const dev = !!import.meta?.env?.DEV;
    if (dev) return true;

    if (hasWindow) {
      const { hostname, href } = window.location;
      const isLocalhost = /^localhost$|^127\.|^0\.0\.0\.0$/.test(hostname);
      if (isLocalhost) return true;

      const url = new URL(href);
      if (url.searchParams.get("admin") === "1") {
        writeLS(KEY_TOGGLE, "true");
        url.searchParams.delete("admin");
        window.history.replaceState({}, "", url);
        return true;
      }
    }

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
      if (!e || !("key" in e) || [null, KEY_MODE, KEY_TOKEN, KEY_TOGGLE].includes(e.key)) sync();
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
