// src/pages/Education.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEducation, deleteEducation } from "../lib/api.js";
import Reveal from "../components/Reveal.jsx";
import { useOwnerMode } from "../lib/owner.js";

/* -------------------- Enhanced Font Loading -------------------- */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:wght@400;500;600;700;800&family=Geist:wght@300;400;500;600;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

/* -------------------- Local fallback -------------------- */
const LS_KEY = "localEducation";
function readLocal() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function writeLocal(rows) { try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch {} }
async function localGetEducation() { return readLocal(); }
async function localDeleteEducation(id) {
  const next = readLocal().filter((r) => String(r.id) !== String(id));
  writeLocal(next);
  return true;
}
function statusFromError(e) {
  const m = (e?.message || "").match(/^(\d{3})\s/);
  return m ? parseInt(m[1], 10) : e?.status || e?.response?.status;
}
async function tryApiThenLocal(fnApi, fnLocal, ...args) {
  try {
    const r = await fnApi(...args);
    return { data: r, usedLocal: false };
  } catch (e) {
    const s = statusFromError(e);
    if (s === 404 || s === 405 || s === 0 || !s) {
      const r = await fnLocal(...args);
      return { data: r, usedLocal: true };
    }
    throw e;
  }
}

/* -------------------- Date helpers -------------------- */
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getYM(obj, prefix) {
  const yRaw = obj?.[`${prefix}Year`] ?? obj?.[`${prefix}_year`];
  const y = Number(yRaw);
  let m = obj?.[`${prefix}Month`] ?? obj?.[`${prefix}_month`];
  if (m != null) m = Number(m);
  const ymRaw = obj?.[`${prefix}YM`] ?? obj?.[`${prefix}_ym`];
  if ((m == null || Number.isNaN(m)) && ymRaw) {
    const [yy, mm] = String(ymRaw).split("-");
    if (!Number.isNaN(Number(yy))) {
      if (obj[`${prefix}Year`] == null && obj[`${prefix}_year`] == null) {
        obj[`${prefix}Year`] = Number(yy);
      }
    }
    if (!Number.isNaN(Number(mm))) m = Number(mm);
  }
  return { y: Number.isFinite(y) ? y : null, m: Number.isFinite(m) ? m : null };
}

function keyForEnd(obj) {
  const { y, m } = getYM(obj, "end");
  if (y == null) return 999999;
  return y * 100 + (m ?? 12);
}

function keyForStart(obj) {
  const { y, m } = getYM(obj, "start");
  if (y == null) return -1;
  return y * 100 + (m ?? 1);
}

function formatYM(obj, prefix, full = false) {
  const { y, m } = getYM(obj, prefix);
  if (!y) return "—";
  const months = full ? MONTHS_FULL : MONTHS_SHORT;
  if (m && m >= 1 && m <= 12) return `${months[m - 1]} ${y}`;
  return String(y);
}

function toDateFromObj(obj, prefix) {
  const { y, m } = getYM(obj, prefix);
  if (!y) return null;
  const mm = m && m >= 1 && m <= 12 ? m : 1;
  return new Date(y, mm - 1, 1);
}

function monthDiffObj(startObj, endObj) {
  const s = toDateFromObj(startObj, "start");
  const e = getYM(endObj, "end").y == null ? new Date() : toDateFromObj(endObj, "end");
  if (!s || !e) return 0;
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
}

function humanDurationObj(obj) {
  const months = monthDiffObj(obj, obj);
  const y = Math.floor(months / 12), m = months % 12;
  if (!months) return "";
  if (y && m) return `${y} year${y > 1 ? 's' : ''}, ${m} month${m > 1 ? 's' : ''}`;
  if (y) return `${y} year${y > 1 ? "s" : ""}`;
  return `${m} month${m > 1 ? 's' : ''}`;
}

/* -------------------- Enhanced Level System -------------------- */
const LEVEL_ORDER = ["Primary School","Secondary School","High School","Diploma/Certificate","Bachelor","Master","MPhil","PhD","Other"];
const LEVEL_RANK = Object.fromEntries(LEVEL_ORDER.map((l, i) => [l.toLowerCase(), i]));

const LEVEL_COLORS = {
  "PhD": { 
    bg: "from-purple-600 via-violet-600 to-indigo-600", 
    text: "text-purple-100", 
    border: "border-purple-400",
    shadow: "shadow-purple-500/30",
    glow: "shadow-purple-500/60",
    accent: "bg-purple-500"
  },
  "MPhil": { 
    bg: "from-indigo-600 via-blue-600 to-cyan-600", 
    text: "text-indigo-100", 
    border: "border-indigo-400",
    shadow: "shadow-indigo-500/30",
    glow: "shadow-indigo-500/60",
    accent: "bg-indigo-500"
  },
  "Master": { 
    bg: "from-blue-600 via-sky-600 to-cyan-600", 
    text: "text-blue-100", 
    border: "border-blue-400",
    shadow: "shadow-blue-500/30",
    glow: "shadow-blue-500/60",
    accent: "bg-blue-500"
  },
  "Bachelor": { 
    bg: "from-emerald-600 via-green-600 to-teal-600", 
    text: "text-emerald-100", 
    border: "border-emerald-400",
    shadow: "shadow-emerald-500/30",
    glow: "shadow-emerald-500/60",
    accent: "bg-emerald-500"
  },
  "Diploma/Certificate": { 
    bg: "from-amber-600 via-orange-600 to-red-600", 
    text: "text-amber-100", 
    border: "border-amber-400",
    shadow: "shadow-amber-500/30",
    glow: "shadow-amber-500/60",
    accent: "bg-amber-500"
  },
  "High School": { 
    bg: "from-lime-600 via-green-600 to-emerald-600", 
    text: "text-lime-100", 
    border: "border-lime-400",
    shadow: "shadow-lime-500/30",
    glow: "shadow-lime-500/60",
    accent: "bg-lime-500"
  },
  "Secondary School": { 
    bg: "from-yellow-600 via-lime-600 to-green-600", 
    text: "text-yellow-100", 
    border: "border-yellow-400",
    shadow: "shadow-yellow-500/30",
    glow: "shadow-yellow-500/60",
    accent: "bg-yellow-500"
  },
  "Primary School": { 
    bg: "from-orange-500 via-red-500 to-pink-500", 
    text: "text-orange-100", 
    border: "border-orange-400",
    shadow: "shadow-orange-500/30",
    glow: "shadow-orange-500/60",
    accent: "bg-orange-500"
  },
  "Other": { 
    bg: "from-slate-600 via-gray-700 to-zinc-700", 
    text: "text-slate-100", 
    border: "border-slate-400",
    shadow: "shadow-slate-500/30",
    glow: "shadow-slate-500/60",
    accent: "bg-slate-500"
  }
};

function normalizeLevelText(s) {
  const t = String(s ?? "").toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  if (/(^|\b)(phd|doctor of philosophy|dphil)(\b|$)/.test(t)) return "PhD";
  if (/(^|\b)mphil(\b|$)/.test(t)) return "MPhil";
  if (/(^|\b)(ms|msc|mtech|meng|mba|mca|llm|md|mpt|mph|med|ma|mcom|mfin|mf)(\b|$)/.test(t) || /master/.test(t)) return "Master";
  if (/(^|\b)(be|btech|bsc|ba|beng|bcom|bba|bca|llb)(\b|$)/.test(t) || /bachelor/.test(t)) return "Bachelor";
  if (/postgraduate diploma|pg diploma|graduate diploma/.test(t) || /(diploma|certificate|associate)/.test(t)) return "Diploma/Certificate";
  if (/high school|higher secondary|hsc/.test(t)) return "High School";
  if (/secondary/.test(t)) return "Secondary School";
  if (/primary/.test(t)) return "Primary School";
  return "Other";
}

function displayLevelName(it) {
  return (
    normalizeLevelText(it?.level) ||
    normalizeLevelText(it?.degree) ||
    String(it?.level ?? it?.degree ?? "")
  );
}

function detectLevelRank(it) {
  const canonical = String(displayLevelName(it) || it?.level || "").toLowerCase();
  if (canonical && LEVEL_RANK[canonical] != null) return LEVEL_RANK[canonical];
  return -1;
}

function highestLevelCanonical(items) {
  let best = -1;
  for (const it of items) best = Math.max(best, detectLevelRank(it));
  return best >= 0 ? LEVEL_ORDER[best] : "—";
}

/* -------------------- sort + merge -------------------- */
function sortEdu(rows) {
  const copy = [...(rows || [])];
  copy.sort((a, b) => {
    const be = keyForEnd(b), ae = keyForEnd(a);
    if (be !== ae) return be - ae;
    const bs = keyForStart(b), as = keyForStart(a);
    if (bs !== as) return bs - as;
    const aname = String(a.school || "").toLowerCase();
    const bname = String(b.school || "").toLowerCase();
    return aname.localeCompare(bname);
  });
  return copy;
}

function mergeEdu(apiArr, localArr) {
  const map = new Map();
  (apiArr || []).forEach((it) => { if (it && it.id != null) map.set(String(it.id), it); });
  (localArr || []).forEach((it) => { if (it && it.id != null) map.set(String(it.id), it); });
  return sortEdu(Array.from(map.values()));
}

/* -------------------- sanitize + md-lite -------------------- */
function sanitizeHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
    const allowedTags = new Set(["b","strong","i","em","u","ul","ol","li","br","p","span","div","blockquote","code","mark","a"]);
    const allowedAttrs = {
      span: new Set(["style"]),
      p: new Set(["style"]),
      li: new Set(["style"]),
      div: new Set(["style"]),
      mark: new Set(["style"]),
      a: new Set(["href","target","rel"]),
    };
    const filterStyle = (val = "") => {
      const out = [];
      val.split(";").map((s) => s.trim()).forEach((decl) => {
        const m = decl.match(/^(color|background-color)\s*:\s*([^;]+)$/i);
        if (m) out.push(`${m[1].toLowerCase()}: ${m[2].trim()}`);
      });
      return out.join("; ");
    };
    const walk = (node) => {
      const kids = Array.from(node.childNodes);
      for (const n of kids) {
        if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (!allowedTags.has(tag)) { n.replaceWith(...Array.from(n.childNodes)); continue; }
          const keep = allowedAttrs[tag] || new Set();
          Array.from(n.attributes).forEach((a) => {
            const an = a.name.toLowerCase();
            if (!keep.has(an)) n.removeAttribute(a.name);
          });
          if (tag === "a") { n.setAttribute("target","_blank"); n.setAttribute("rel","noopener noreferrer"); }
          if (n.hasAttribute("style")) {
            const v = filterStyle(n.getAttribute("style"));
            if (v) n.setAttribute("style", v); else n.removeAttribute("style");
          }
          walk(n);
        } else if (n.nodeType === 8) n.remove();
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

function mdLiteToHtml(text) {
  const lines = (text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return "";
  const isUL = lines.every((l) => /^(-|\*)\s+/.test(l));
  const isOL = lines.every((l) => /^\d+\.\s+/.test(l));
  const inline = (s) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  if (isUL) return `<ul>${lines.map((l)=>`<li>${inline(l.replace(/^(-|\*)\s+/, ""))}</li>`).join("")}</ul>`;
  if (isOL) return `<ol>${lines.map((l)=>`<li>${inline(l.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
  return `<p>${inline(lines.join("<br>"))}</p>`;
}

/* Certificate detection */
function isCertificate(it) {
  const t = `${it?.type || ""} ${it?.level || ""} ${it?.degree || ""}`.toLowerCase();
  return /certificat|certificate|cert\b/i.test(t);
}

/* HTML renderer */
function renderDetailsHTML(it) {
  const raw =
    it.detailsHtml ||
    (it.details ? mdLiteToHtml(it.details) : "") ||
    (it.description ? mdLiteToHtml(it.description) : "");
  return sanitizeHtml(raw);
}

/* -------------------- Enhanced Icons -------------------- */
const Icons = {
  sparkles: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 7L18 6M6 12L5 13M19 19L18 18"/>
    </svg>
  ),
  brightness: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="5" strokeWidth="2"/>
      <line x1="12" y1="1" x2="12" y2="3" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="21" x2="12" y2="23" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeWidth="2" strokeLinecap="round"/>
      <line x1="1" y1="12" x2="3" y2="12" strokeWidth="2" strokeLinecap="round"/>
      <line x1="21" y1="12" x2="23" y2="12" strokeWidth="2" strokeLinecap="round"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  moon: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  timeline: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2.5" strokeLinecap="round" d="M12 2v20M8 4l-4 4 4 4M16 12l4 4-4 4"/>
    </svg>
  ),
  grid: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2"/>
    </svg>
  ),
  list: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="8" y1="6" x2="21" y2="6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="21" y2="12" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="18" x2="21" y2="18" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  stats: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6"/>
      <path strokeWidth="2" strokeLinecap="round" d="M2 20h20"/>
    </svg>
  ),
  plus: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
      <path strokeWidth="2" strokeLinecap="round" d="M12 8v8M8 12h8" />
    </svg>
  ),
  pencil: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  ),
  trash: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="11" x2="14" y2="17" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  school: (cls="w-6 h-6") => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
    </svg>
  ),
  location: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3" strokeWidth="2"/>
    </svg>
  ),
  calendar: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
    </svg>
  ),
  trophy: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9H4.5a2.5 2.5 0 010-5H6m12 0h1.5a2.5 2.5 0 110 5H18m-12 0v6a4 4 0 008 0V9M8 21h8"/>
    </svg>
  ),
  book: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ),
  certificate: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="16" y1="13" x2="8" y2="13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="16" y1="17" x2="8" y2="17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="10 9 9 9 8 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  filter: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  clock: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
      <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  star: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  building: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18ZM6 12H4a2 2 0 00-2 2v8h20v-8a2 2 0 00-2-2h-2"/>
      <path strokeWidth="2" d="M18 9h4v13M10 6h4M10 10h4M10 14h4M10 18h4"/>
    </svg>
  ),
};

/* -------------------- Enhanced Stats Dashboard -------------------- */
function EducationStats({ items, darkMode }) {
  const stats = useMemo(() => {
    const totalMonths = items.reduce((acc, it) => acc + monthDiffObj(it, it), 0);
    const currentCount = items.filter((it) => getYM(it, "end").y == null).length;
    const completedCount = items.length - currentCount;
    const institutionsCount = new Set(items.map((it) => it.school)).size;
    const y = Math.floor(totalMonths / 12), m = totalMonths % 12;
    let totalStudyLabel = "No data";
    if (totalMonths) {
      if (y && m) totalStudyLabel = `${y}y ${m}m`;
      else if (y) totalStudyLabel = `${y} year${y > 1 ? "s" : ""}`;
      else totalStudyLabel = `${m} month${m > 1 ? 's' : ''}`;
    }
    const highestLevel = highestLevelCanonical(items);
    return { totalStudyLabel, highestLevel, currentCount, completedCount, institutionsCount };
  }, [items]);

  return (
    <div className="relative mb-16 group">
      <div className={`relative overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-700 hover:scale-105 ${
        darkMode 
          ? "bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-slate-900/50" 
          : "bg-white/80 border-white/80 shadow-2xl shadow-gray-900/10"
      }`}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
        
        <div className="relative p-8 lg:p-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                {Icons.stats("w-6 h-6 text-white")}
              </div>
              <h2 className={`text-3xl lg:text-4xl font-bold font-['Playfair_Display'] ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                Academic Overview
              </h2>
            </div>
            <p className={`text-lg font-medium font-['Geist'] ${
              darkMode ? "text-slate-300" : "text-gray-600"
            }`}>
              Your educational journey at a glance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
            {[
              { 
                icon: Icons.clock, 
                label: "Total Duration", 
                value: stats.totalStudyLabel,
                description: "Years of education",
                gradient: "from-blue-500 to-cyan-500",
                bgGradient: darkMode ? "from-blue-500/10 to-cyan-500/10" : "from-blue-50 to-cyan-50"
              },
              { 
                icon: Icons.trophy, 
                label: "Highest Level", 
                value: stats.highestLevel,
                description: "Academic achievement",
                gradient: "from-purple-500 to-pink-500",
                bgGradient: darkMode ? "from-purple-500/10 to-pink-500/10" : "from-purple-50 to-pink-50"
              },
              { 
                icon: Icons.book, 
                label: "Currently Studying", 
                value: stats.currentCount,
                description: "Ongoing programs",
                gradient: "from-emerald-500 to-green-500",
                bgGradient: darkMode ? "from-emerald-500/10 to-green-500/10" : "from-emerald-50 to-green-50"
              },
              { 
                icon: Icons.certificate, 
                label: "Completed", 
                value: stats.completedCount,
                description: "Finished programs",
                gradient: "from-amber-500 to-orange-500",
                bgGradient: darkMode ? "from-amber-500/10 to-orange-500/10" : "from-amber-50 to-orange-50"
              },
              { 
                icon: Icons.building, 
                label: "Institutions", 
                value: stats.institutionsCount,
                description: "Schools attended",
                gradient: "from-rose-500 to-red-500",
                bgGradient: darkMode ? "from-rose-500/10 to-red-500/10" : "from-rose-50 to-red-50"
              },
            ].map((stat, idx) => (
              <div 
                key={idx} 
                className={`group/stat relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-500 hover:scale-110 hover:-translate-y-3 ${
                  darkMode 
                    ? "bg-slate-800/50 border-slate-700/50 hover:border-slate-600/70" 
                    : "bg-white/70 border-white/70 hover:border-gray-200"
                } p-6 cursor-pointer hover:shadow-2xl`}
                style={{
                  animationDelay: `${idx * 150}ms`
                }}
              >
                {/* Background gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover/stat:opacity-100 transition-opacity duration-500`} />
                
                {/* Glowing border effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover/stat:opacity-20 blur-xl transition-all duration-500`} />
                
                <div className="relative flex flex-col items-center text-center space-y-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg group-hover/stat:shadow-2xl transition-all duration-500 group-hover/stat:scale-110`}>
                    {stat.icon("w-6 h-6")}
                  </div>
                  
                  <div className={`text-3xl font-bold font-['Outfit'] transition-all duration-500 ${
                    darkMode 
                      ? "text-white group-hover/stat:text-white" 
                      : "text-gray-900 group-hover/stat:text-gray-800"
                  }`}>
                    {stat.value}
                  </div>
                  
                  <div>
                    <div className={`text-sm font-semibold font-['Geist'] uppercase tracking-wider transition-all duration-500 ${
                      darkMode 
                        ? "text-slate-300 group-hover/stat:text-slate-200" 
                        : "text-gray-700 group-hover/stat:text-gray-800"
                    }`}>
                      {stat.label}
                    </div>
                    <div className={`text-xs font-medium mt-1 transition-all duration-500 ${
                      darkMode 
                        ? "text-slate-400 group-hover/stat:text-slate-300" 
                        : "text-gray-500 group-hover/stat:text-gray-600"
                    }`}>
                      {stat.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Enhanced Timeline View Component -------------------- */
function TimelineView({ items, isOwner, onDelete, nav, darkMode }) {
  return (
    <div className="relative">
      {/* Enhanced timeline line with gradient and glow */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 rounded-full overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-b from-blue-500 via-purple-500 via-pink-500 to-red-500 ${
          darkMode ? "opacity-70" : "opacity-80"
        }`} />
        <div className={`absolute inset-0 bg-gradient-to-b from-blue-400 via-purple-400 via-pink-400 to-red-400 blur-sm ${
          darkMode ? "opacity-40" : "opacity-30"
        }`} />
      </div>
      
      {items.map((it, idx) => {
        const id = it.id ?? `edu-${idx}`;
        const school = it.school || it.institution || "—";
        const degree = it.degree || "";
        const field = it.field || it.major || "";
        const loc = it.location || "";
        const startLabel = formatYM(it, "start", true);
        const endLabel = getYM(it, "end").y == null ? "Present" : formatYM(it, "end", true);
        const dur = humanDurationObj(it);
        const levelDisplay = displayLevelName(it);
        const levelColor = LEVEL_COLORS[levelDisplay] || LEVEL_COLORS["Other"];
        const gpa = String(it.gpa ?? it.grade ?? "").trim();
        const thesis = String(it.thesis ?? "").trim();
        const description = String(it.description ?? "").trim();
        const editPath = isCertificate(it) 
          ? `/certificates/edit/${encodeURIComponent(id)}`
          : `/education/edit/${encodeURIComponent(id)}`;
        const isOngoing = getYM(it, "end").y == null;

        return (
          <Reveal key={String(id)}>
            <div 
              className="relative flex items-start mb-12 group/timeline animate-fadeInUp"
              style={{
                animationDelay: `${idx * 150}ms`,
              }}
            >
              {/* Enhanced timeline dot with pulsing animation for ongoing */}
              <div className="absolute left-3 top-6 z-10">
                <div className={`relative w-6 h-6 rounded-full border-3 ${
                  darkMode ? "border-slate-900" : "border-white"
                } shadow-lg overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${levelColor.bg} ${
                    isOngoing ? "animate-pulse" : ""
                  }`} />
                  {isOngoing && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${levelColor.bg} animate-ping opacity-60`} />
                  )}
                </div>
                {/* Glowing ring effect */}
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${levelColor.bg} opacity-20 blur-md scale-125 ${
                  isOngoing ? "animate-pulse" : ""
                }`} />
              </div>
              
              {/* Enhanced content card */}
              <div className={`ml-16 flex-1 rounded-2xl border backdrop-blur-xl transition-all duration-500 hover:scale-102 hover:-translate-y-1 ${
                darkMode 
                  ? "bg-slate-800/90 border-slate-700/60 hover:border-slate-600 shadow-xl shadow-slate-900/30" 
                  : "bg-white/95 border-white/90 hover:border-gray-200 shadow-xl shadow-gray-900/8"
              } group-hover/timeline:shadow-2xl overflow-hidden relative`}>
                
                {/* Animated gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${levelColor.bg} opacity-0 group-hover/timeline:opacity-3 transition-opacity duration-500`} />
                
                <div className="relative p-6">
                  {/* Header section */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1">
                      {/* Level and status badges */}
                      <div className="flex items-center gap-2 mb-4">
                        {levelDisplay && (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${levelColor.bg} text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105`}>
                            {levelDisplay}
                          </span>
                        )}
                        {isOngoing && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-500 text-white animate-pulse shadow-md shadow-emerald-500/30">
                            <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse"></span>
                            Active
                          </span>
                        )}
                        {gpa && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30">
                            {Icons.star("w-3 h-3 mr-1")}
                            {gpa}
                          </span>
                        )}
                      </div>
                      
                      {/* School name with enhanced typography */}
                      <h3 className={`text-2xl font-bold font-['Playfair_Display'] mb-3 leading-tight transition-all duration-300 group-hover/timeline:scale-102 ${
                        darkMode 
                          ? "text-white group-hover/timeline:text-purple-200" 
                          : "text-gray-900 group-hover/timeline:text-purple-700"
                      }`}>
                        {school}
                      </h3>
                      
                      {/* Degree and field - FIXED: Removed "in" word */}
                      {(degree || field) && (
                        <div className="mb-4 space-y-1">
                          {degree && (
                            <p className={`text-base font-semibold font-['Outfit'] ${
                              darkMode ? "text-slate-200" : "text-gray-800"
                            }`}>
                              {degree}
                            </p>
                          )}
                          {field && (
                            <p className={`text-sm font-medium font-['Geist'] ${
                              darkMode ? "text-slate-300" : "text-gray-700"
                            }`}>
                              {field}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced action buttons */}
                    {isOwner && (
                      <div className="flex gap-2 opacity-0 group-hover/timeline:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/timeline:translate-x-0">
                        <button
                          onClick={() => nav(editPath)}
                          className={`p-2 rounded-xl backdrop-blur-sm transition-all duration-200 hover:scale-110 shadow-md ${
                            darkMode 
                              ? "bg-slate-700/80 hover:bg-slate-600/80 text-slate-200 hover:text-white" 
                              : "bg-white/90 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                          } hover:shadow-lg`}
                          type="button"
                        >
                          {Icons.pencil("w-4 h-4")}
                        </button>
                        <button
                          onClick={() => onDelete(id)}
                          className="p-2 rounded-xl bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110 shadow-md hover:shadow-lg"
                          type="button"
                        >
                          {Icons.trash("w-4 h-4")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Meta information with enhanced styling */}
                  <div className={`flex flex-wrap items-center gap-4 text-xs mb-5 ${
                    darkMode ? "text-slate-400" : "text-gray-600"
                  }`}>
                    <span className="flex items-center gap-2 font-medium">
                      {Icons.calendar("w-4 h-4 text-blue-500")}
                      <span className="font-['JetBrains_Mono'] text-sm">{startLabel} — {endLabel}</span>
                    </span>
                    {dur && (
                      <span className="flex items-center gap-2 font-medium">
                        {Icons.clock("w-4 h-4 text-emerald-500")}
                        <span className="font-['JetBrains_Mono'] text-sm">{dur}</span>
                      </span>
                    )}
                    {loc && (
                      <span className="flex items-center gap-2 font-medium">
                        {Icons.location("w-4 h-4 text-red-500")}
                        <span className="text-sm">{loc}</span>
                      </span>
                    )}
                  </div>

                  {/* Description with enhanced styling */}
                  {description && (
                    <div className={`mb-5 p-4 rounded-xl border transition-all duration-300 hover:scale-102 ${
                      darkMode 
                        ? "bg-gradient-to-r from-blue-900/15 to-purple-900/15 border-blue-800/40" 
                        : "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200/40"
                    }`}>
                      <p className={`text-sm font-medium italic leading-relaxed font-['Geist'] ${
                        darkMode ? "text-blue-200" : "text-blue-800"
                      }`}>
                        "{description}"
                      </p>
                    </div>
                  )}

                  {/* Thesis with enhanced styling */}
                  {thesis && (
                    <div className={`p-4 rounded-xl border transition-all duration-300 hover:scale-102 ${
                      darkMode 
                        ? "bg-gradient-to-r from-purple-900/15 to-pink-900/15 border-purple-800/40" 
                        : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200/40"
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                          {Icons.book("w-4 h-4 text-white")}
                        </div>
                        <h4 className={`text-sm font-bold font-['Outfit'] ${
                          darkMode ? "text-purple-200" : "text-purple-800"
                        }`}>
                          Research & Thesis
                        </h4>
                      </div>
                      <p className={`text-sm leading-relaxed font-['Geist'] ${
                        darkMode ? "text-purple-100" : "text-purple-700"
                      }`}>
                        {thesis}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* -------------------- Filter helper -------------------- */
function filterEducation(items, filterType, sortBy) {
  let filtered = [...items];

  if (filterType === "current") filtered = filtered.filter((item) => getYM(item, "end").y == null);
  else if (filterType === "completed") filtered = filtered.filter((item) => getYM(item, "end").y != null);

  if (sortBy === "school") filtered.sort((a, b) => String(a.school || "").localeCompare(String(b.school || "")));
  else if (sortBy === "level") filtered.sort((a, b) => (detectLevelRank(b) - detectLevelRank(a)));
  else filtered = sortEdu(filtered);
  return filtered;
}

/* -------------------- Main Page Component -------------------- */
export default function Education() {
  const nav = useNavigate();
  let ownerCtx;
  try { ownerCtx = useOwnerMode?.(); } catch { ownerCtx = null; }
  const isOwner = !!(ownerCtx?.isOwner ?? ownerCtx?.owner ?? ownerCtx?.value ?? ownerCtx);

  // Enhanced dark mode with proper persistence
  const [darkMode, setDarkMode] = useState(() => {
    try { 
      const stored = localStorage.getItem("darkModeEducation");
      return stored ? JSON.parse(stored) : false; 
    } catch { 
      return false; 
    }
  });

  // Apply dark mode changes immediately and properly
  useEffect(() => {
    try {
      localStorage.setItem("darkModeEducation", JSON.stringify(darkMode));
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    } catch {}
    
    const root = document.documentElement;
    const body = document.body;
    
    if (darkMode) {
      root.classList.add("dark");
      body.style.backgroundColor = "#0f172a";
      body.style.color = "#ffffff";
    } else {
      root.classList.remove("dark");
      body.style.backgroundColor = "#ffffff";
      body.style.color = "#000000";
    }
  }, [darkMode]);

  const [showStats, setShowStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem("eduShowStats") || "true"); } catch { return true; }
  });
  useEffect(() => { try { localStorage.setItem("eduShowStats", JSON.stringify(showStats)); } catch {} }, [showStats]);

  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem("eduLayout") || "timeline"; } catch { return "timeline"; }
  });
  useEffect(() => { try { localStorage.setItem("eduLayout", layout); } catch {} }, [layout]);

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const filteredItems = useMemo(
    () => filterEducation(items, filterType, sortBy),
    [items, filterType, sortBy]
  );

  // Database loading effect - this is your existing logic
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await tryApiThenLocal(getEducation, localGetEducation);
        const apiArr = Array.isArray(data) ? data : [];
        const localArr = readLocal();
        if (mounted) setItems(mergeEdu(apiArr, localArr));
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load education");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    function onStorage(ev) {
      if (ev.key === LS_KEY) setItems((prev) => mergeEdu(prev, readLocal()));
    }
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Delete function - your existing logic
  async function onDelete(id) {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    try {
      const { usedLocal } = await tryApiThenLocal(
        (eid) => deleteEducation(eid),
        (eid) => localDeleteEducation(eid),
        id
      );
      await localDeleteEducation(id);
      setItems((prev) => prev.filter((r) => String(r.id) !== String(id)));
      if (usedLocal) {
        alert("Deleted locally only (offline/unauthorized). Unlock Owner mode and check API base to delete on the server.");
      }
    } catch (e) {
      alert(e?.message || "Failed to delete. Make sure Owner mode is unlocked.");
    }
  }

  return (
    <div className={`min-h-screen transition-all duration-700 font-['Inter'] ${
      darkMode 
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-gray-950 text-white" 
        : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-900"
    }`}>
      {/* Enhanced background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-20 -left-20 w-96 h-96 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob ${
          darkMode ? "bg-blue-900" : "bg-blue-300"
        }`} />
        <div className={`absolute -top-20 -right-20 w-96 h-96 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000 ${
          darkMode ? "bg-purple-900" : "bg-purple-300"
        }`} />
        <div className={`absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000 ${
          darkMode ? "bg-pink-900" : "bg-pink-300"
        }`} />
      </div>

      <div className="relative container mx-auto py-16 px-6 pb-32">
        {/* FIXED: Properly Sized Header */}
        <div className="mb-16 text-center">
          <div className="inline-block group">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={`p-2 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg transform transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 ${
                darkMode ? "shadow-blue-900/50" : "shadow-blue-500/30"
              }`}>
                {Icons.school("w-6 h-6 text-white")}
              </div>
              <h1 className={`text-2xl md:text-3xl lg:text-5xl font-bold font-['Playfair_Display'] tracking-tight transition-all duration-700 group-hover:scale-105 ${
                darkMode 
                  ? "bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" 
                  : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
              }`}>
                Education
              </h1>
              <div className={`p-2 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg transform transition-all duration-700 group-hover:scale-110 group-hover:-rotate-12 ${
                darkMode ? "shadow-purple-900/50" : "shadow-purple-500/30"
              }`}>
                {Icons.sparkles("w-6 h-6 text-white")}
              </div>
            </div>
            <p className={`text-sm md:text-base font-medium font-['Geist'] transition-all duration-700 ${
              darkMode ? "text-slate-300 group-hover:text-slate-200" : "text-gray-600 group-hover:text-gray-700"
            }`}>
              Building knowledge • Achieving excellence • Shaping tomorrow
            </p>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className={`mb-16 p-8 rounded-3xl backdrop-blur-xl border transition-all duration-500 hover:scale-105 ${
          darkMode 
            ? "bg-slate-800/60 border-slate-700/50 shadow-2xl shadow-slate-900/50" 
            : "bg-white/80 border-white/80 shadow-2xl shadow-gray-900/10"
        }`}>
          <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-between">
            {/* Enhanced Filter */}
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`px-6 py-4 rounded-2xl border-2 font-semibold text-base transition-all duration-300 focus:scale-105 ${
                  darkMode 
                    ? "bg-slate-900/80 border-slate-700 text-white hover:border-blue-500 focus:border-blue-400" 
                    : "bg-white/90 border-gray-200 text-gray-900 hover:border-blue-400 focus:border-blue-500"
                } focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-lg font-['Geist']`}
              >
                <option value="all">All Records</option>
                <option value="current">Currently Studying</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-6 py-4 rounded-2xl border-2 font-semibold text-base transition-all duration-300 focus:scale-105 ${
                  darkMode 
                    ? "bg-slate-900/80 border-slate-700 text-white hover:border-blue-500 focus:border-blue-400" 
                    : "bg-white/90 border-gray-200 text-gray-900 hover:border-blue-400 focus:border-blue-500"
                } focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-lg font-['Geist']`}
              >
                <option value="date">Sort by Date</option>
                <option value="school">Sort by School</option>
                <option value="level">Sort by Level</option>
              </select>
            </div>

            {/* Enhanced View toggles */}
            <div className="flex gap-3">
              {[
                { value: "timeline", icon: Icons.timeline, label: "Timeline" },
                { value: "bento", icon: Icons.grid, label: "Grid" },
                { value: "card", icon: Icons.list, label: "List" },
              ].map((view) => (
                <button
                  key={view.value}
                  onClick={() => setLayout(view.value)}
                  className={`px-6 py-4 rounded-2xl border-2 font-semibold text-base transition-all duration-300 flex items-center gap-3 hover:scale-105 shadow-lg font-['Geist'] ${
                    layout === view.value
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-blue-500/30"
                      : darkMode
                        ? "bg-slate-900/80 border-slate-700 text-slate-200 hover:border-blue-500 hover:text-white"
                        : "bg-white/90 border-gray-200 text-gray-700 hover:border-blue-400 hover:text-gray-900"
                  }`}
                  type="button"
                >
                  {view.icon()}
                  <span className="hidden sm:inline">{view.label}</span>
                </button>
              ))}
            </div>

            {/* Enhanced Stats and Theme toggles */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowStats(v => !v)}
                className={`px-6 py-4 rounded-2xl border-2 font-semibold text-base transition-all duration-300 flex items-center gap-3 hover:scale-105 shadow-lg font-['Geist'] ${
                  darkMode 
                    ? "bg-slate-900/80 border-slate-700 text-slate-200 hover:border-blue-500 hover:text-white" 
                    : "bg-white/90 border-gray-200 text-gray-700 hover:border-blue-400 hover:text-gray-900"
                }`}
                type="button"
              >
                {Icons.stats()}
                <span className="hidden sm:inline">{showStats ? "Hide" : "Show"} Stats</span>
              </button>

              <button
                onClick={() => setDarkMode(v => !v)}
                className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 group"
                type="button"
              >
                <div className="transform transition-transform duration-500 group-hover:rotate-180">
                  {darkMode ? Icons.brightness("w-6 h-6") : Icons.moon("w-6 h-6")}
                </div>
              </button>
            </div>
          </div>

          <div className={`mt-6 text-base font-semibold font-['JetBrains_Mono'] ${
            darkMode ? "text-slate-300" : "text-gray-700"
          }`}>
            Showing {filteredItems.length} of {items.length} education record{items.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Enhanced Stats Dashboard */}
        {!loading && items.length > 0 && showStats && (
          <EducationStats items={items} darkMode={darkMode} />
        )}

        {/* Error */}
        {err && (
          <div className="mb-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-['Geist']">
            {err}
          </div>
        )}

        {/* Enhanced Content */}
        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className={`p-8 rounded-3xl ${
                  darkMode ? "bg-slate-800/60" : "bg-white/80"
                } backdrop-blur-sm`}>
                  <div className={`h-8 rounded-2xl mb-4 ${
                    darkMode ? "bg-slate-700" : "bg-gray-200"
                  }`} />
                  <div className={`h-6 rounded-xl mb-3 w-3/4 ${
                    darkMode ? "bg-slate-700" : "bg-gray-200"
                  }`} />
                  <div className={`h-6 rounded-xl w-1/2 ${
                    darkMode ? "bg-slate-700" : "bg-gray-200"
                  }`} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-32">
            <div className={`inline-block p-16 rounded-3xl backdrop-blur-xl ${
              darkMode 
                ? "bg-slate-800/60 border border-slate-700/50" 
                : "bg-white/80 border border-white/50"
            } shadow-2xl`}>
              {Icons.school("w-32 h-32 mx-auto mb-8 text-gray-400")}
              <h3 className={`text-3xl font-bold font-['Playfair_Display'] mb-6 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                {items.length === 0 ? "No Education Records" : "No Matches Found"}
              </h3>
              <p className={`text-xl font-['Geist'] ${
                darkMode ? "text-slate-300" : "text-gray-600"
              }`}>
                {items.length === 0 
                  ? (isOwner ? "Click the Add button to create your first record" : "No records available")
                  : "Try changing the filters or sort options"}
              </p>
            </div>
          </div>
        ) : layout === "timeline" ? (
          <TimelineView 
            items={filteredItems} 
            isOwner={isOwner} 
            onDelete={onDelete} 
            nav={nav}
            darkMode={darkMode}
          />
        ) : layout === "bento" ? (
          <div className="grid gap-8 lg:gap-10 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((it, idx) => {
              const id = it.id ?? `edu-${idx}`;
              const school = it.school || it.institution || "—";
              const degree = it.degree || "";
              const field = it.field || it.major || "";
              const loc = it.location || "";
              const startLabel = formatYM(it, "start");
              const endLabel = getYM(it, "end").y == null ? "Present" : formatYM(it, "end");
              const dur = humanDurationObj(it);
              const levelDisplay = displayLevelName(it);
              const levelColor = LEVEL_COLORS[levelDisplay] || LEVEL_COLORS["Other"];
              const gpa = String(it.gpa ?? it.grade ?? "").trim();
              const thesis = String(it.thesis ?? "").trim();
              const description = String(it.description ?? "").trim();
              const editPath = isCertificate(it) 
                ? `/certificates/edit/${encodeURIComponent(id)}`
                : `/education/edit/${encodeURIComponent(id)}`;
              const isOngoing = getYM(it, "end").y == null;

              return (
                <Reveal key={String(id)}>
                  <div className={`group relative h-full rounded-3xl border p-8 transition-all duration-700 hover:scale-105 hover:-translate-y-3 backdrop-blur-xl ${
                    darkMode 
                      ? "bg-slate-800/80 border-slate-700/50 hover:border-slate-600 shadow-2xl shadow-slate-900/40" 
                      : "bg-white/90 border-white/80 hover:border-gray-200 shadow-2xl shadow-gray-900/10"
                  } animate-fadeInUp overflow-hidden`}
                    style={{
                      animationDelay: `${idx * 150}ms`,
                    }}
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${levelColor.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-700`} />
                    
                    {/* Content */}
                    <div className="relative h-full flex flex-col">
                      {/* Level badge and status */}
                      <div className="flex items-center justify-between mb-6">
                        {levelDisplay && (
                          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${levelColor.bg} text-white shadow-lg`}>
                            {levelDisplay}
                          </div>
                        )}
                        {isOngoing && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white animate-pulse">
                            <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                            Active
                          </div>
                        )}
                      </div>

                      {/* School name */}
                      <h3 className={`text-2xl font-bold font-['Playfair_Display'] mb-4 line-clamp-2 transition-colors duration-500 ${
                        darkMode ? "text-white group-hover:text-purple-200" : "text-gray-900 group-hover:text-purple-700"
                      }`}>
                        {school}
                      </h3>

                      {/* Degree & Field - FIXED: Removed "in" word */}
                      {(degree || field) && (
                        <div className="mb-6 space-y-2">
                          {degree && (
                            <p className={`text-lg font-semibold font-['Outfit'] ${
                              darkMode ? "text-slate-200" : "text-gray-800"
                            }`}>
                              {degree}
                            </p>
                          )}
                          {field && (
                            <p className={`text-base font-medium font-['Geist'] ${
                              darkMode ? "text-slate-300" : "text-gray-700"
                            }`}>
                              {field}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Thesis */}
                      {thesis && (
                        <div className={`mb-4 p-3 rounded-xl border transition-all duration-300 hover:scale-102 ${
                          darkMode 
                            ? "bg-purple-900/20 border-purple-800/40" 
                            : "bg-purple-50 border-purple-200/40"
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 rounded bg-gradient-to-r from-purple-500 to-pink-500">
                              {Icons.book("w-3 h-3 text-white")}
                            </div>
                            <span className={`text-xs font-semibold ${
                              darkMode ? "text-purple-200" : "text-purple-800"
                            }`}>
                              Research
                            </span>
                          </div>
                          <p className={`text-sm leading-relaxed font-['Geist'] line-clamp-2 ${
                            darkMode ? "text-purple-100" : "text-purple-700"
                          }`}>
                            {thesis}
                          </p>
                        </div>
                      )}

                      {/* Description */}
                      {description && (
                        <p className={`text-sm leading-relaxed italic line-clamp-3 mb-6 font-['Geist'] ${
                          darkMode ? "text-slate-300" : "text-gray-700"
                        }`}>
                          "{description}"
                        </p>
                      )}

                      {/* Meta info - pushed to bottom */}
                      <div className="mt-auto space-y-4">
                        {/* Date & Duration */}
                        <div className={`flex items-center gap-3 text-sm font-medium font-['JetBrains_Mono'] ${
                          darkMode ? "text-slate-400" : "text-gray-600"
                        }`}>
                          {Icons.calendar("w-4 h-4 text-blue-500")}
                          <span>{startLabel} — {endLabel}</span>
                          {dur && <span className="text-emerald-500">({dur})</span>}
                        </div>

                        {/* GPA, Location */}
                        <div className="flex flex-wrap gap-3">
                          {gpa && (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              {Icons.star("w-3 h-3 mr-1")}
                              GPA: {gpa}
                            </span>
                          )}
                          {loc && (
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${
                              darkMode ? "bg-slate-700/50 text-slate-300" : "bg-gray-100 text-gray-700"
                            }`}>
                              {Icons.location("w-3 h-3")}
                              {loc}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {isOwner && (
                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => nav(editPath)}
                            className={`p-3 rounded-xl backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 ${
                              darkMode ? "bg-slate-700/80 text-slate-200" : "bg-white/90 text-gray-700"
                            }`}
                            type="button"
                          >
                            {Icons.pencil()}
                          </button>
                          <button
                            onClick={() => onDelete(id)}
                            className="p-3 rounded-xl bg-red-500/20 backdrop-blur-sm text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-all duration-300 hover:scale-110 shadow-lg"
                            type="button"
                          >
                            {Icons.trash()}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        ) : (
          /* Compact Card View - FIXED: Removed "in" word */
          <div className="space-y-6">
            {filteredItems.map((it, idx) => {
              const id = it.id ?? `edu-${idx}`;
              const school = it.school || it.institution || "—";
              const degree = it.degree || "";
              const field = it.field || it.major || "";
              const startLabel = formatYM(it, "start");
              const endLabel = getYM(it, "end").y == null ? "Present" : formatYM(it, "end");
              const levelDisplay = displayLevelName(it);
              const levelColor = LEVEL_COLORS[levelDisplay] || LEVEL_COLORS["Other"];
              const gpa = String(it.gpa ?? it.grade ?? "").trim();
              const thesis = String(it.thesis ?? "").trim();
              const isOngoing = getYM(it, "end").y == null;
              const editPath = isCertificate(it) 
                ? `/certificates/edit/${encodeURIComponent(id)}`
                : `/education/edit/${encodeURIComponent(id)}`;

              return (
                <div 
                  key={String(id)} 
                  className={`group flex items-center gap-6 p-6 rounded-2xl border-2 transition-all duration-500 hover:scale-105 hover:shadow-xl backdrop-blur-sm ${
                    darkMode 
                      ? "bg-slate-800/60 border-slate-700/50 hover:border-slate-600" 
                      : "bg-white/80 border-white/80 hover:border-gray-200"
                  } animate-fadeInUp`}
                  style={{
                    animationDelay: `${idx * 100}ms`,
                  }}
                >
                  {/* Level indicator */}
                  <div className={`w-2 h-20 rounded-full bg-gradient-to-b ${levelColor.bg} flex-shrink-0 ${
                    isOngoing ? "animate-pulse" : ""
                  }`} />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className={`font-bold font-['Outfit'] text-xl truncate ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {school}
                      </h3>
                      {levelDisplay && (
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${levelColor.bg} text-white flex-shrink-0`}>
                          {levelDisplay}
                        </span>
                      )}
                      {isOngoing && (
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-500 text-white animate-pulse flex-shrink-0">
                          Active
                        </span>
                      )}
                      {gpa && (
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                          darkMode ? "bg-amber-900/30 text-amber-300" : "bg-amber-100 text-amber-700"
                        }`}>
                          GPA: {gpa}
                        </span>
                      )}
                    </div>
                    <p className={`text-base truncate font-['Geist'] ${
                      darkMode ? "text-slate-200" : "text-gray-700"
                    }`}>
                      {degree} {field && degree && "•"} {field} • 
                      <span className="font-['JetBrains_Mono'] ml-2">{startLabel} — {endLabel}</span>
                    </p>
                    {/* Thesis in compact view */}
                    {thesis && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-0.5 rounded bg-gradient-to-r from-purple-500 to-pink-500">
                            {Icons.book("w-3 h-3 text-white")}
                          </div>
                          <span className={`text-xs font-semibold ${
                            darkMode ? "text-purple-300" : "text-purple-700"
                          }`}>
                            Research
                          </span>
                        </div>
                        <p className={`text-sm truncate font-['Geist'] ${
                          darkMode ? "text-purple-200" : "text-purple-600"
                        }`}>
                          {thesis}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isOwner && (
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 flex-shrink-0">
                      <button
                        onClick={() => nav(editPath)}
                        className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                          darkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        type="button"
                      >
                        {Icons.pencil()}
                      </button>
                      <button
                        onClick={() => onDelete(id)}
                        className={`p-3 rounded-xl text-red-600 dark:text-red-400 transition-all duration-300 hover:scale-110 ${
                          darkMode ? "bg-red-900/30 hover:bg-red-900/50" : "bg-red-100 hover:bg-red-200"
                        }`}
                        type="button"
                      >
                        {Icons.trash()}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Enhanced Floating Add Button */}
        {isOwner && (
          <button
            onClick={() => nav("/education/new")}
            className="fixed bottom-8 right-8 p-5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-500 group z-50"
            type="button"
          >
            <div className="relative">
              {Icons.plus("w-7 h-7")}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
              </span>
            </div>
            <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 shadow-xl font-['Geist']">
              Add Education Record
            </span>
          </button>
        )}
      </div>

      {/* Enhanced CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 8s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}