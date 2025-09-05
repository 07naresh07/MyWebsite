// src/pages/Education.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEducation, deleteEducation } from "../lib/api.js";
import Reveal from "../components/Reveal.jsx";
import { useOwnerMode } from "../lib/owner.js";

/* -------------------- Import Google Fonts -------------------- */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
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

/* -------------------- Levels -------------------- */
const LEVEL_ORDER = ["Primary School","Secondary School","High School","Diploma/Certificate","Bachelor","Master","MPhil","PhD","Other"];
const LEVEL_RANK = Object.fromEntries(LEVEL_ORDER.map((l, i) => [l.toLowerCase(), i]));
const LEVEL_COLORS = {
  "PhD": { bg: "from-purple-600 to-indigo-600", text: "text-purple-100", border: "border-purple-400" },
  "MPhil": { bg: "from-indigo-600 to-purple-600", text: "text-indigo-100", border: "border-indigo-400" },
  "Master": { bg: "from-blue-600 to-indigo-600", text: "text-blue-100", border: "border-blue-400" },
  "Bachelor": { bg: "from-cyan-600 to-blue-600", text: "text-cyan-100", border: "border-cyan-400" },
  "Diploma/Certificate": { bg: "from-teal-600 to-cyan-600", text: "text-teal-100", border: "border-teal-400" },
  "High School": { bg: "from-green-600 to-teal-600", text: "text-green-100", border: "border-green-400" },
  "Secondary School": { bg: "from-lime-600 to-green-600", text: "text-lime-100", border: "border-lime-400" },
  "Primary School": { bg: "from-yellow-600 to-lime-600", text: "text-yellow-100", border: "border-yellow-400" },
  "Other": { bg: "from-gray-600 to-gray-700", text: "text-gray-100", border: "border-gray-400" }
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
  return "";
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

/* -------------------- Icons -------------------- */
const Icons = {
  sparkles: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 7L18 6M6 12L5 13M19 19L18 18"/>
    </svg>
  ),
  brightness: (cls="w-4 h-4") => (
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
  moon: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  bento: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="8" height="8" rx="2" strokeWidth="2"/>
      <rect x="13" y="3" width="8" height="8" rx="2" strokeWidth="2"/>
      <rect x="3" y="13" width="8" height="8" rx="2" strokeWidth="2"/>
      <rect x="13" y="13" width="8" height="8" rx="2" strokeWidth="2"/>
    </svg>
  ),
  timeline: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" d="M12 2v20M8 4l-4 4 4 4M16 12l4 4-4 4"/>
    </svg>
  ),
  card: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="3" strokeWidth="2"/>
      <path strokeWidth="2" d="M4 10h16M10 14h4"/>
    </svg>
  ),
  stats: (cls="w-4 h-4") => (
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
  school: (cls="w-5 h-5") => (
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
  book: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ),
  certificate: (cls="w-4 h-4") => (
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
};

/* -------------------- Stats Dashboard -------------------- */
function EducationStats({ items }) {
  const stats = useMemo(() => {
    const totalMonths = items.reduce((acc, it) => acc + monthDiffObj(it, it), 0);
    const currentCount = items.filter((it) => getYM(it, "end").y == null).length;
    const completedCount = items.length - currentCount;
    const institutionsCount = new Set(items.map((it) => it.school)).size;
    const y = Math.floor(totalMonths / 12), m = totalMonths % 12;
    let totalStudyLabel = "No data";
    if (totalMonths) {
      if (y && m) totalStudyLabel = `${y} years, ${m} months`;
      else if (y) totalStudyLabel = `${y} year${y > 1 ? "s" : ""}`;
      else totalStudyLabel = `${m} month${m > 1 ? 's' : ''}`;
    }
    const highestLevel = highestLevelCanonical(items);
    return { totalStudyLabel, highestLevel, currentCount, completedCount, institutionsCount };
  }, [items]);

  return (
    <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-pink-500/20 border border-white/50 dark:border-white/10 backdrop-blur-lg">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 to-white/30 dark:from-gray-900/50 dark:to-gray-900/30 backdrop-blur-sm" />
      <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { icon: Icons.calendar, label: "Total Duration", value: stats.totalStudyLabel, gradient: "from-blue-500 to-cyan-500" },
          { icon: Icons.trophy, label: "Highest Degree", value: stats.highestLevel, gradient: "from-purple-500 to-pink-500" },
          { icon: Icons.book, label: "Currently Pursuing", value: stats.currentCount, gradient: "from-green-500 to-emerald-500" },
          { icon: Icons.certificate, label: "Completed", value: stats.completedCount, gradient: "from-orange-500 to-red-500" },
          { icon: Icons.school, label: "Institutions", value: stats.institutionsCount, gradient: "from-indigo-500 to-purple-500" },
        ].map((stat, idx) => (
          <div key={idx} className="group relative overflow-hidden rounded-2xl bg-white/90 dark:bg-gray-800/90 p-4 hover:scale-105 transition-all duration-300 hover:shadow-xl">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
            <div className="relative flex flex-col items-center text-center space-y-2">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient} text-white`}>
                {stat.icon("w-5 h-5")}
              </div>
              <div className="text-2xl font-bold font-['Space_Grotesk'] bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

/* -------------------- Timeline View Component -------------------- */
function TimelineView({ items, isOwner, onDelete, nav, darkMode }) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />
      
      {items.map((it, idx) => {
        const id = it.id ?? `edu-${idx}`;
        const school = it.school || it.institution || "—";
        const degree = it.degree || "";
        const field = it.field || it.major || "";
        const loc = it.location || "";
        const startLabel = formatYM(it, "start", true);
        const endLabel = getYM(it, "end").y == null ? "Present" : formatYM(it, "end", true);
        const dur = humanDurationObj(it);
        const detailsHtml = renderDetailsHTML(it);
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
            <div className="relative flex items-start mb-12 group">
              {/* Timeline dot */}
              <div className={`absolute left-5 w-6 h-6 rounded-full border-4 ${isOngoing ? 'animate-pulse' : ''} bg-gradient-to-br ${levelColor.bg} border-white dark:border-gray-900 shadow-lg z-10`} />
              
              {/* Content card */}
              <div className={`ml-20 flex-1 rounded-2xl border transition-all duration-300 hover:shadow-2xl ${
                darkMode ? "bg-gray-800/95 border-gray-700 hover:border-purple-500" : "bg-white/95 border-gray-200 hover:border-purple-400"
              } backdrop-blur-sm p-6`}>
                {/* Header with actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {levelDisplay && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${levelColor.bg} text-white shadow-md`}>
                          {levelDisplay}
                        </span>
                      )}
                      {isOngoing && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white animate-pulse">
                          Ongoing
                        </span>
                      )}
                      {gpa && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                          GPA: {gpa}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold font-['Space_Grotesk'] mb-1 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                      {school}
                    </h3>
                    {(degree || field) && (
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {degree} {field && degree && "•"} {field}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {isOwner && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => nav(editPath)}
                        className={`p-2 rounded-xl ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"} transition-colors`}
                        type="button"
                      >
                        {Icons.pencil()}
                      </button>
                      <button
                        onClick={() => onDelete(id)}
                        className="p-2 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
                        type="button"
                      >
                        {Icons.trash()}
                      </button>
                    </div>
                  )}
                </div>

                {/* Meta info (boosted contrast for dark mode) */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-200 mb-4">
                  <span className="flex items-center gap-1">
                    {Icons.calendar("w-4 h-4")}
                    {startLabel} — {endLabel}
                  </span>
                  {dur && (
                    <span className="flex items-center gap-1">
                      ⏱️ {dur}
                    </span>
                  )}
                  {loc && (
                    <span className="flex items-center gap-1">
                      {Icons.location("w-4 h-4")}
                      {loc}
                    </span>
                  )}
                </div>

                {/* Description (higher contrast) */}
                {description && (
                  <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/25 dark:to-indigo-900/25 border border-blue-200 dark:border-blue-800/60">
                    <p className="text-sm text-gray-800 dark:text-gray-100 italic">
                      {description}
                    </p>
                  </div>
                )}

                {/* Thesis */}
                {thesis && (
                  <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/25 dark:to-pink-900/25 border border-purple-200 dark:border-purple-800/60">
                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-200 mb-1">
                      📝 Thesis/Research:
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-100">
                      {thesis}
                    </p>
                  </div>
                )}

                {/* Details */}
                {detailsHtml && (
                  <div
                    className={`prose prose-sm max-w-none ${darkMode ? "prose-invert" : ""} text-gray-800 dark:text-gray-100`}
                    dangerouslySetInnerHTML={{ __html: detailsHtml }}
                  />
                )}
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* -------------------- Page -------------------- */
export default function Education() {
  const nav = useNavigate();
  let ownerCtx;
  try { ownerCtx = useOwnerMode?.(); } catch { ownerCtx = null; }
  const isOwner = !!(ownerCtx?.isOwner ?? ownerCtx?.owner ?? ownerCtx?.value ?? ownerCtx);

  const [darkMode, setDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem("darkModeEducation") || "false"); } catch { return false; }
  });
  useEffect(() => {
    try {
      localStorage.setItem("darkModeEducation", JSON.stringify(darkMode));
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    } catch {}
    const root = document.documentElement.classList;
    if (darkMode) root.add("dark"); else root.remove("dark");
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
    <div className={`min-h-screen transition-all duration-300 font-['Inter'] ${
      darkMode 
        ? "bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white" 
        : "bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900"
    }`}>
      <div className="container mx-auto py-12 px-4 pb-32">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-block">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-xl">
                {Icons.school("w-8 h-8 text-white")}
              </div>
              <h1 className="text-5xl md:text-6xl font-black font-['Space_Grotesk'] tracking-tight">
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                  Academic Journey
                </span>
              </h1>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-xl">
                {Icons.sparkles("w-8 h-8 text-white")}
              </div>
            </div>
            <p className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Exploring knowledge, achieving excellence, shaping the future
            </p>
          </div>
        </div>

        {/* Controls (search removed; left-aligned, compact) */}
        <div className={`mb-8 p-6 rounded-3xl backdrop-blur-xl border ${
          darkMode 
            ? "bg-gray-800/60 border-gray-700/50" 
            : "bg-white/70 border-white/50"
        } shadow-2xl`}>
          <div className="flex flex-wrap items-center gap-3 justify-start">
            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`px-4 py-3 rounded-2xl border-2 font-medium transition-all ${
                darkMode 
                  ? "bg-gray-900/60 border-gray-700 text-white hover:border-purple-500" 
                  : "bg-white/80 border-gray-200 text-gray-900 hover:border-purple-400"
              } focus:outline-none focus:ring-4 focus:ring-purple-500/20`}
            >
              <option value="all">All Records</option>
              <option value="current">Currently Studying</option>
              <option value="completed">Completed</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-4 py-3 rounded-2xl border-2 font-medium transition-all ${
                darkMode 
                  ? "bg-gray-900/60 border-gray-700 text-white hover:border-purple-500" 
                  : "bg-white/80 border-gray-200 text-gray-900 hover:border-purple-400"
              } focus:outline-none focus:ring-4 focus:ring-purple-500/20`}
            >
              <option value="date">By Date</option>
              <option value="school">By School</option>
              <option value="level">By Level</option>
            </select>

            {/* View toggles */}
            <div className="flex gap-2">
              {[
                { value: "timeline", icon: Icons.timeline, label: "Timeline" },
                { value: "bento", icon: Icons.bento, label: "Cards" },
                { value: "card", icon: Icons.card, label: "Compact" },
              ].map((view) => (
                <button
                  key={view.value}
                  onClick={() => setLayout(view.value)}
                  className={`px-4 py-3 rounded-2xl border-2 font-medium transition-all flex items-center gap-2 ${
                    layout === view.value
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-lg"
                      : darkMode
                        ? "bg-gray-900/60 border-gray-700 text-gray-200 hover:border-purple-500"
                        : "bg-white/80 border-gray-200 text-gray-700 hover:border-purple-400"
                  }`}
                  type="button"
                >
                  {view.icon()}
                  <span className="hidden sm:inline">{view.label}</span>
                </button>
              ))}
            </div>

            {/* Stats toggle */}
            <button
              onClick={() => setShowStats(v => !v)}
              className={`px-4 py-3 rounded-2xl border-2 font-medium transition-all flex items-center gap-2 ${
                darkMode 
                  ? "bg-gray-900/60 border-gray-700 text-gray-200 hover:border-purple-500" 
                  : "bg-white/80 border-gray-200 text-gray-700 hover:border-purple-400"
              }`}
              type="button"
            >
              {Icons.stats()}
              <span className="hidden sm:inline">{showStats ? "Hide" : "Show"} Stats</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(v => !v)}
              className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all"
              type="button"
            >
              {darkMode ? Icons.brightness() : Icons.moon()}
            </button>
          </div>

          <div className={`mt-4 text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Found {filteredItems.length} of {items.length} education record{items.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Stats Dashboard */}
        {!loading && items.length > 0 && showStats && <EducationStats items={items} />}

        {/* Error */}
        {err && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
            {err}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className={`h-6 rounded-xl mb-3 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
                  <div className={`h-4 rounded-xl mb-2 w-3/4 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
                  <div className={`h-4 rounded-xl w-1/2 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl">
              {Icons.school("w-20 h-20 mx-auto mb-4 text-gray-400")}
              <h3 className="text-2xl font-bold mb-2">
                {items.length === 0 ? "No Education Records" : "No Matches Found"}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {items.length === 0 
                  ? (isOwner ? "Click the Add button to create your first record" : "No records available")
                  : "Try changing the filters or sort"}
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((it, idx) => {
              const id = it.id ?? `edu-${idx}`;
              const school = it.school || it.institution || "—";
              const degree = it.degree || "";
              const field = it.field || it.major || "";
              const loc = it.location || "";
              const startLabel = formatYM(it, "start");
              const endLabel = getYM(it, "end").y == null ? "Present" : formatYM(it, "end");
              const dur = humanDurationObj(it);
              const detailsHtml = renderDetailsHTML(it);
              const levelDisplay = displayLevelName(it);
              const levelColor = LEVEL_COLORS[levelDisplay] || LEVEL_COLORS["Other"];
              const gpa = String(it.gpa ?? it.grade ?? "").trim();
              const thesis = String(it.thesis ?? "").trim();
              const description = String(it.description ?? "").trim();
              const editPath = isCertificate(it) 
                ? `/certificates/edit/${encodeURIComponent(id)}`
                : `/education/edit/${encodeURIComponent(id)}`;

              return (
                <Reveal key={String(id)}>
                  <div className={`group relative h-full rounded-3xl border-2 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                    darkMode 
                      ? "bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900 border-gray-700 hover:border-purple-500" 
                      : "bg-gradient-to-br from-white via-white/90 to-gray-50 border-gray-200 hover:border-purple-400"
                  }`}>
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${levelColor.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    {/* Content */}
                    <div className="relative">
                      {/* Level badge */}
                      {levelDisplay && (
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${levelColor.bg} text-white mb-3 shadow-lg`}>
                          {levelDisplay}
                        </div>
                      )}

                      {/* School name */}
                      <h3 className="text-xl font-bold font-['Space_Grotesk'] mb-2 line-clamp-2 text-gray-900 dark:text-white">
                        {school}
                      </h3>

                      {/* Degree & Field */}
                      {(degree || field) && (
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                          {degree} {field && degree && "•"} {field}
                        </p>
                      )}

                      {/* Description */}
                      {description && (
                        <p className="text-sm text-gray-700 dark:text-gray-200 mb-3 italic line-clamp-2">
                          "{description}"
                        </p>
                      )}

                      {/* Date & Duration */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mb-3">
                        {Icons.calendar("w-3 h-3")}
                        <span>{startLabel} — {endLabel}</span>
                        {dur && <span>({dur})</span>}
                      </div>

                      {/* GPA, Location */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {gpa && (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            GPA: {gpa}
                          </span>
                        )}
                        {loc && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                            {Icons.location("w-3 h-3")}
                            {loc}
                          </span>
                        )}
                      </div>

                      {/* Thesis */}
                      {thesis && (
                        <div className="text-xs text-gray-700 dark:text-gray-200 mb-3">
                          <span className="font-semibold">Thesis:</span> {thesis}
                        </div>
                      )}

                      {/* Details HTML (optional) */}
                      {detailsHtml && (
                        <div
                          className={`prose prose-sm max-w-none ${darkMode ? "prose-invert" : ""} text-gray-800 dark:text-gray-100`}
                          dangerouslySetInnerHTML={{ __html: detailsHtml }}
                        />
                      )}

                      {/* Actions */}
                      {isOwner && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => nav(editPath)}
                            className="p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
                            type="button"
                          >
                            {Icons.pencil()}
                          </button>
                          <button
                            onClick={() => onDelete(id)}
                            className="p-2 rounded-xl bg-red-500/20 backdrop-blur-sm text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-all"
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
          /* Compact Card View */
          <div className="space-y-4">
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
              const editPath = isCertificate(it) 
                ? `/certificates/edit/${encodeURIComponent(id)}`
                : `/education/edit/${encodeURIComponent(id)}`;

              return (
                <div key={String(id)} className={`group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  darkMode 
                    ? "bg-gray-800/60 border-gray-700 hover:border-purple-500" 
                    : "bg-white/80 border-gray-200 hover:border-purple-400"
                }`}>
                  {/* Level indicator */}
                  <div className={`w-2 h-16 rounded-full bg-gradient-to-b ${levelColor.bg}`} />
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold font-['Space_Grotesk'] text-lg text-gray-900 dark:text-white">{school}</h3>
                      {levelDisplay && (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold bg-gradient-to-r ${levelColor.bg} text-white`}>
                          {levelDisplay}
                        </span>
                      )}
                      {gpa && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          GPA: {gpa}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {degree} {field && degree && "•"} {field} • {startLabel} — {endLabel}
                    </p>
                  </div>

                  {/* Actions */}
                  {isOwner && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => nav(editPath)}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        type="button"
                      >
                        {Icons.pencil()}
                      </button>
                      <button
                        onClick={() => onDelete(id)}
                        className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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

        {/* Floating Add Button */}
        {isOwner && (
          <button
            onClick={() => nav("/education/new")}
            className="fixed bottom-8 right-8 p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 group"
            type="button"
          >
            <div className="relative">
              {Icons.plus("w-6 h-6")}
              <span className="absolute -top-2 -right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </div>
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-gray-900 text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Add Education
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------- Filter helper (search removed) -------------------- */
function filterEducation(items, filterType, sortBy) {
  let filtered = [...items];

  if (filterType === "current") filtered = filtered.filter((item) => getYM(item, "end").y == null);
  else if (filterType === "completed") filtered = filtered.filter((item) => getYM(item, "end").y != null);

  if (sortBy === "school") filtered.sort((a, b) => String(a.school || "").localeCompare(String(b.school || "")));
  else if (sortBy === "level") filtered.sort((a, b) => (detectLevelRank(b) - detectLevelRank(a)));
  else filtered = sortEdu(filtered);
  return filtered;
}
