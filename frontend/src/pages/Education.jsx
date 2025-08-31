// src/pages/Education.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getEducation, deleteEducation } from "../lib/api.js";
import Reveal from "../components/Reveal.jsx";
import { useOwnerMode } from "../lib/owner.js";

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

// Reads camelCase, snake_case and *YM fields to keep the chosen month
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
function formatYM(obj, prefix) {
  const { y, m } = getYM(obj, prefix);
  if (!y) return "—";
  if (m && m >= 1 && m <= 12) return `${MONTHS_SHORT[m - 1]} ${y}`;
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
  if (y && m) return `${y} yr ${m} mo`;
  if (y) return `${y} yr${y > 1 ? "s" : ""}`;
  return `${m} mo`;
}

/* -------------------- Levels (rank + normalization) -------------------- */
const LEVEL_ORDER = ["Primary School","Secondary School","High School","Diploma/Certificate","Bachelor","Master","MPhil","PhD","Other"];
const LEVEL_RANK = Object.fromEntries(LEVEL_ORDER.map((l, i) => [l.toLowerCase(), i]));

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
  sun: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <path strokeWidth="2" d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M8.05 16.95l-1.414 1.414m0-11.314L8.05 7.05m9.9 9.9l1.414 1.414" />
    </svg>
  ),
  moon: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  grid: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
    </svg>
  ),
  list: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="5" cy="6" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="5" cy="18" r="1.5" />
      <path strokeWidth="2" d="M9 6h12M9 12h12M9 18h12" />
    </svg>
  ),
  chart: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M3 3v18h18" />
      <rect x="6" y="10" width="3" height="7" strokeWidth="2" />
      <rect x="11" y="6" width="3" height="11" strokeWidth="2" />
      <rect x="16" y="13" width="3" height="4" strokeWidth="2" />
    </svg>
  ),
  plus: (cls="w-5 h-5") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M12 5v14M5 12h14" />
    </svg>
  ),
  edit: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" />
      <path strokeWidth="2" d="M4 20h16" />
    </svg>
  ),
  trash: (cls="w-4 h-4") => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M3 6h18M8 6l1-2h6l1 2M6 6v14a2 2 0 002 2h8a2 2 0 002-2V6" />
      <path strokeWidth="2" d="M10 11v6M14 11v6" />
    </svg>
  ),
};

/* -------------------- Marquee -------------------- */
function OverflowMarquee({ text, className = "" }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const [dur, setDur] = useState(10);

  useEffect(() => {
    const check = () => {
      if (!outerRef.current || !innerRef.current) return;
      const needs = innerRef.current.scrollWidth > outerRef.current.clientWidth + 2;
      setOverflow(needs);
      const len = String(text || "").length || 1;
      setDur(Math.max(8, Math.min(24, Math.round(len * 0.45))));
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text]);

  return (
    <div className="relative w-full overflow-hidden" ref={outerRef} aria-label={text} title={text}>
      <style>{`
        @keyframes edu-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .edu-marquee { animation: none !important; } }
      `}</style>
      <div
        className={`whitespace-nowrap ${overflow ? "edu-marquee will-change-transform flex" : ""}`}
        style={overflow ? { animation: `edu-marquee ${dur}s linear infinite` } : undefined}
      >
        <span ref={innerRef} className={`${className} block pr-10`}>{text}</span>
        {overflow && <span aria-hidden="true" className={`${className} block pr-10`}>{text}</span>}
      </div>
    </div>
  );
}

/* -------------------- Stats tiles -------------------- */
function EducationStats({ items }) {
  const stats = useMemo(() => {
    const totalMonths = items.reduce((acc, it) => acc + monthDiffObj(it, it), 0);
    const currentCount = items.filter((it) => getYM(it, "end").y == null).length;
    const completedCount = items.length - currentCount;
    const institutionsCount = new Set(items.map((it) => it.school)).size;

    const y = Math.floor(totalMonths / 12), m = totalMonths % 12;
    let totalStudyLabel = "0 mo";
    if (totalMonths) {
      if (y && m) totalStudyLabel = `${y} yr ${m} mo`;
      else if (y) totalStudyLabel = `${y} yr${y > 1 ? "s" : ""}`;
      else totalStudyLabel = `${m} mo`;
    }
    const highestLevel = highestLevelCanonical(items);

    return { totalStudyLabel, highestLevel, currentCount, completedCount, institutionsCount };
  }, [items]);

  const Tile = ({ value, label, color }) => (
    <div className={`rounded-xl border ${color.border} ${color.bg} px-4 py-3 min-h-[56px] flex items-center`}>
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <OverflowMarquee
            text={String(value)}
            className={`font-semibold leading-none ${color.value} text-[15px] md:text-[17px]`}
          />
        </div>
        <div className={`${color.label} leading-none shrink-0 text-[12px] md:text-[13px]`}>
          {label}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Tile value={stats.totalStudyLabel} label="Total Study Time" color={{
        bg:"bg-blue-50 dark:bg-blue-900/30", border:"border-blue-200 dark:border-blue-700",
        value:"text-blue-900 dark:text-blue-200", label:"text-blue-800 dark:text-blue-300"}} />
      <Tile value={stats.highestLevel} label="Highest Level" color={{
        bg:"bg-emerald-50 dark:bg-emerald-900/30", border:"border-emerald-200 dark:border-emerald-700",
        value:"text-emerald-900 dark:text-emerald-200", label:"text-emerald-800 dark:text-emerald-300"}} />
      <Tile value={stats.currentCount} label="Current" color={{
        bg:"bg-purple-50 dark:bg-purple-900/30", border:"border-purple-200 dark:border-purple-700",
        value:"text-purple-900 dark:text-purple-200", label:"text-purple-800 dark:text-purple-300"}} />
      <Tile value={stats.completedCount} label="Completed" color={{
        bg:"bg-amber-50 dark:bg-amber-900/30", border:"border-amber-200 dark:border-amber-700",
        value:"text-amber-900 dark:text-amber-200", label:"text-amber-800 dark:text-amber-300"}} />
      <Tile value={stats.institutionsCount} label="Institutions" color={{
        bg:"bg-rose-50 dark:bg-rose-900/30", border:"border-rose-200 dark:border-rose-700",
        value:"text-rose-900 dark:text-rose-200", label:"text-rose-800 dark:text-rose-300"}} />
    </div>
  );
}

/* HTML renderer */
function renderDetailsHTML(it) {
  const raw =
    it.detailsHtml ||
    (it.details ? mdLiteToHtml(it.details) : "") ||
    (it.description ? mdLiteToHtml(it.description) : "");
  return sanitizeHtml(raw);
}

/* Certificate detection for correct edit route */
function isCertificate(it) {
  const t = `${it?.type || ""} ${it?.level || ""} ${it?.degree || ""}`.toLowerCase();
  return /certificat|certificate|cert\b/i.test(t);
}

/* -------------------- Page -------------------- */
export default function Education() {
  const nav = useNavigate();

  // Owner mode
  let ownerCtx;
  try { ownerCtx = useOwnerMode?.(); } catch { ownerCtx = null; }
  const isOwner = !!(ownerCtx?.isOwner ?? ownerCtx?.owner ?? ownerCtx?.value ?? ownerCtx);

  // Dark mode
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

  // UI state
  const [showStats, setShowStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem("eduShowStats") || "true"); } catch { return true; }
  });
  useEffect(() => { try { localStorage.setItem("eduShowStats", JSON.stringify(showStats)); } catch {} }, [showStats]);

  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem("eduLayout") || "grid"; } catch { return "grid"; }
  });
  useEffect(() => { try { localStorage.setItem("eduLayout", layout); } catch {} }, [layout]);

  // Data
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const filteredItems = useMemo(
    () => filterEducation(items, searchTerm, filterType, sortBy),
    [items, searchTerm, filterType, sortBy]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);

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
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900"}`}>
      <div className="container mx-auto py-10 px-4 pb-28">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Education Journey
            </h1>
            <div className="h-1 w-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full mt-2" />
            <p className={`mt-3 text-base md:text-lg ${darkMode ? "text-gray-300" : "text-slate-600"}`}>
              A comprehensive overview of my academic background and educational achievements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(v => !v)}
              className={`px-3 py-2 rounded-xl border text-sm inline-flex items-center gap-2 ${darkMode ? "border-gray-600 hover:bg-gray-800 text-gray-100" : "border-gray-300 hover:bg-gray-100 text-gray-700"}`}
              title="Toggle dark mode"
              type="button"
            >
              {darkMode ? Icons.moon() : Icons.sun()} {darkMode ? "Dark" : "Light"}
            </button>
          </div>
        </div>

        {/* Controls bar */}
        <div className={`${darkMode ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"} rounded-xl border shadow-sm p-4 mb-6`}>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search education..."
                  className={`w-full h-11 pl-10 pr-10 rounded-xl border shadow-sm focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400
                  ${darkMode ? "border-gray-700 bg-gray-800 text-gray-100 focus:ring-indigo-400" : "border-gray-200 bg-white text-gray-900 focus:ring-indigo-500"}`}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    aria-label="Clear search"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={`h-11 rounded-xl pr-10 pl-4 text-sm shadow-sm appearance-none transition-colors
                  ${darkMode ? "border border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700" : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"}`}
                >
                  <option value="all" className={darkMode ? "bg-gray-800" : "bg-white"}>All Records</option>
                  <option value="current" className={darkMode ? "bg-gray-800" : "bg-white"}>Current</option>
                  <option value="completed" className={darkMode ? "bg-gray-800" : "bg-white"}>Completed</option>
                </select>
                <span className={`pointer-events-none absolute inset-y-0 right-3 grid place-items-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`h-11 rounded-xl pr-10 pl-4 text-sm shadow-sm appearance-none transition-colors
                  ${darkMode ? "border border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700" : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"}`}
                >
                  <option value="date" className={darkMode ? "bg-gray-800" : "bg-white"}>Sort by Date</option>
                  <option value="school" className={darkMode ? "bg-gray-800" : "bg-white"}>Sort by School</option>
                  <option value="level" className={darkMode ? "bg-gray-800" : "bg-white"}>Sort by Level</option>
                </select>
                <span className={`pointer-events-none absolute inset-y-0 right-3 grid place-items-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </div>
            </div>

            {/* Layout / Stats */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700">
                <button
                  onClick={() => setLayout("grid")}
                  className={`px-3 py-2 text-sm inline-flex items-center gap-2 ${layout === "grid" ? (darkMode ? "bg-gray-700 text-white" : "bg-gray-100") : (darkMode ? "text-gray-300" : "text-gray-700")}`}
                  title="Grid view" type="button"
                >
                  {Icons.grid()} Grid
                </button>
                <button
                  onClick={() => setLayout("list")}
                  className={`px-3 py-2 text-sm inline-flex items-center gap-2 ${layout === "list" ? (darkMode ? "bg-gray-700 text-white" : "bg-gray-100") : (darkMode ? "text-gray-300" : "text-gray-700")}`}
                  title="List view" type="button"
                >
                  {Icons.list()} List
                </button>
              </div>

              <button
                onClick={() => setShowStats((v) => !v)}
                className={`px-3 py-2 rounded-xl border text-sm inline-flex items-center gap-2 ${darkMode ? "border-gray-600 hover:bg-gray-800 text-gray-100" : "border-gray-300 hover:bg-gray-100 text-gray-700"}`}
                title="Toggle stats" type="button"
              >
                {Icons.chart()} {showStats ? "Hide Stats" : "Show Stats"}
              </button>
            </div>
          </div>

          <div className={`mt-3 text-sm ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
            Showing {filteredItems.length} of {items.length} record{items.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Stats */}
        {!loading && items.length > 0 && showStats && <EducationStats items={items} />}

        {/* Error */}
        {err && (
          <div className={`${darkMode ? "bg-red-900/20 border border-red-800 text-red-300" : "bg-red-50 border border-red-200 text-red-700"} rounded-xl p-4 mb-6`}>
            Could not load education: {err}
          </div>
        )}

        {/* Loading / Empty / No matches / Content */}
        {loading ? (
          <div className={layout === "grid" ? "grid gap-6 sm:grid-cols-2" : "space-y-3"}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-xl p-6 border shadow-sm`}>
                <div className="animate-pulse">
                  <div className={`${darkMode ? "bg-gray-700" : "bg-gray-200"} h-6 rounded w-3/4 mb-3`} />
                  <div className={`${darkMode ? "bg-gray-700" : "bg-gray-200"} h-4 rounded w-1/2 mb-2`} />
                  <div className={`${darkMode ? "bg-gray-700" : "bg-gray-200"} h-4 rounded w-2/3`} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 && items.length === 0 ? (
          <Reveal>
            <div className="text-center py-16">
              <div className="mb-6">
                <svg className={`${darkMode ? "text-gray-600" : "text-gray-300"} w-20 h-20 mx-auto`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-xl font-semibold mb-2`}>No Education Records Yet</h3>
              <p className={`${darkMode ? "text-gray-400" : "text-gray-500"} mb-2`}>
                {isOwner ? "Use the “Add Education” button to create your first entry." : "No records to display."}
              </p>
            </div>
          </Reveal>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className={`${darkMode ? "text-gray-600" : "text-gray-300"} w-16 h-16 mx-auto`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className={`${darkMode ? "text-gray-200" : "text-gray-700"} text-lg font-semibold mb-2`}>No matches</h3>
            <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Try a different search term or adjust filters.</p>
            <button
              onClick={() => { setSearchTerm(""); setFilterType("all"); setSortBy("date"); }}
              className={`${darkMode ? "bg-gray-800 text-gray-100 hover:bg-gray-700 border-gray-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300"} mt-4 px-4 py-2 rounded-lg border transition-colors`}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {layout === "grid" ? (
              <div className="grid gap-6 sm:grid-cols-2">
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

                  const gpa = String(it.gpa ?? it.grade ?? "").trim();
                  const thesis = String(it.thesis ?? "").trim();

                  const editPath = isCertificate(it)
                    ? `/certificates/edit/${encodeURIComponent(id)}`
                    : `/education/edit/${encodeURIComponent(id)}`;

                  const subtitle =
                    (levelDisplay && field) ? `${levelDisplay} · ${field}` :
                    (levelDisplay || field || degree || "");

                  return (
                    <Reveal key={String(id)}>
                      <div className={`group relative rounded-2xl border p-5 hover:shadow-lg transition-all ${darkMode ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"}`}>
                        {/* GPA badge always visible */}
                        {gpa && (
                          <span className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap
                            ${darkMode ? "bg-indigo-900/40 text-indigo-200 border border-indigo-700" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>
                            GPA {gpa}
                          </span>
                        )}

                        {/* Actions: only on hover */}
                        {isOwner && (
                          <div className="absolute top-10 right-2 z-10 flex gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav(editPath); }}
                              className={`p-2 rounded-lg border shadow-sm ${darkMode ? "bg-gray-900/80 border-gray-700 hover:bg-gray-800" : "bg-white/90 border-gray-200 hover:bg-white"}`}
                              title="Edit" type="button"
                            >
                              {Icons.edit()}
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
                              className={`p-2 rounded-lg border shadow-sm ${darkMode ? "bg-gray-900/80 border-red-700 text-red-400 hover:bg-red-900/30" : "bg-white/90 border-red-200 text-red-600 hover:bg-red-50"}`}
                              title="Delete" type="button"
                            >
                              {Icons.trash()}
                            </button>
                          </div>
                        )}

                        <div className="pr-24">
                          <h3 className="text-base font-semibold truncate">{school}</h3>
                          {subtitle && (
                            <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} text-sm truncate`}>
                              {subtitle}
                            </div>
                          )}

                          {/* Thesis with bold label only */}
                          {thesis && (
                            <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} text-sm mt-1`}>
                              <span className="font-semibold">Thesis:</span> {thesis}
                            </div>
                          )}

                          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            <span className="whitespace-nowrap">{startLabel} — {endLabel}</span>
                            {dur && <span className="whitespace-nowrap">• {dur}</span>}
                            {loc && <span className="whitespace-nowrap">• {loc}</span>}
                          </div>

                          {detailsHtml && (
                            <div
                              className={`prose prose-base max-w-none mt-2 ${darkMode ? "prose-invert" : ""}`}
                              dangerouslySetInnerHTML={{ __html: detailsHtml }}
                            />
                          )}
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <div className={`rounded-xl border ${darkMode ? "border-gray-700" : "border-gray-200"} overflow-hidden`}>
                <div className={`${darkMode ? "bg-gray-800" : "bg-white"}`}>
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

                    const gpa = String(it.gpa ?? it.grade ?? "").trim();
                    const thesis = String(it.thesis ?? "").trim();

                    const editPath = isCertificate(it)
                      ? `/certificates/edit/${encodeURIComponent(id)}`
                      : `/education/edit/${encodeURIComponent(id)}`;

                    const subtitle =
                      (levelDisplay && field) ? `${levelDisplay} · ${field}` :
                      (levelDisplay || field || degree || "");

                    return (
                      <div
                        key={String(id)}
                        className={`group relative flex items-start gap-4 p-4 border-b last:border-b-0 ${darkMode ? "border-gray-700 hover:bg-gray-800/70" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        {/* GPA badge always visible */}
                        {gpa && (
                          <span className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap
                            ${darkMode ? "bg-indigo-900/40 text-indigo-200 border border-indigo-700" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>
                            GPA {gpa}
                          </span>
                        )}

                        {/* Actions: only on hover */}
                        {isOwner && (
                          <div className="absolute top-10 right-2 z-10 flex gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav(editPath); }}
                              className={`p-2 rounded-lg border shadow-sm ${darkMode ? "bg-gray-900/80 border-gray-700 hover:bg-gray-800" : "bg-white/90 border-gray-200 hover:bg-white"}`}
                              title="Edit" type="button"
                            >
                              {Icons.edit()}
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
                              className={`p-2 rounded-lg border shadow-sm ${darkMode ? "bg-gray-900/80 border-red-700 text-red-400 hover:bg-red-900/30" : "bg-white/90 border-red-200 text-red-600 hover:bg-red-50"}`}
                              title="Delete" type="button"
                            >
                              {Icons.trash()}
                            </button>
                          </div>
                        )}

                        <div className="flex-1 pr-24">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold truncate">{school}</div>
                            {subtitle && (
                              <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} text-sm truncate`}>
                                &middot; {subtitle}
                              </div>
                            )}
                          </div>

                          {/* Thesis with bold label only */}
                          {thesis && (
                            <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} text-sm mt-1`}>
                              <span className="font-semibold">Thesis:</span> {thesis}
                            </div>
                          )}

                          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            <span className="whitespace-nowrap">{startLabel} — {endLabel}</span>
                            {dur && <span className="whitespace-nowrap">• {dur}</span>}
                            {loc && <span className="whitespace-nowrap">• {loc}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Floating Add */}
        {isOwner && (
          <div className="fixed z-50 right-6 bottom-6 md:right-8 md:bottom-8">
            <button
              onClick={() => nav("/education/new")}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Add education"
              type="button"
            >
              {Icons.plus()}
              <span className="font-semibold">Add Education</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Filter helper -------------------- */
function filterEducation(items, searchTerm, filterType, sortBy) {
  let filtered = [...items];
  if (searchTerm) {
    const term = String(searchTerm || "").toLowerCase();
    filtered = filtered.filter(
      (item) =>
        String(item.school || "").toLowerCase().includes(term) ||
        String(item.degree || "").toLowerCase().includes(term) ||
        String(item.field || "").toLowerCase().includes(term) ||
        String(item.level || "").toLowerCase().includes(term) ||
        String(item.thesis || "").toLowerCase().includes(term) ||
        String(item.gpa ?? item.grade ?? "").toLowerCase().includes(term)
    );
  }
  if (filterType === "current") filtered = filtered.filter((item) => getYM(item, "end").y == null);
  else if (filterType === "completed") filtered = filtered.filter((item) => getYM(item, "end").y != null);

  if (sortBy === "school") filtered.sort((a, b) => String(a.school || "").localeCompare(String(b.school || "")));
  else if (sortBy === "level") filtered.sort((a, b) => (detectLevelRank(b) - detectLevelRank(a)));
  else filtered = sortEdu(filtered);
  return filtered;
}
