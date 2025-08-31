// src/pages/Experience.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnerMode } from "../lib/owner.js";
import { getExperience, deleteExperience } from "../lib/api.js";

/* ----------------------------- Modern Icons ----------------------------- */
const Icon = {
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Edit: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  Calendar: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M8 2v4M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  ),
  MapPin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Briefcase: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M20 7h-3V6a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3v1H4a1 1 0 0 0-1 1v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1ZM9 6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9V6Z" />
    </svg>
  ),
  Grid: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  List: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  Filter: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  TrendingUp: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
      <polyline points="16,7 22,7 22,13" />
    </svg>
  ),
  Award: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
      <circle cx="12" cy="8" r="6" />
    </svg>
  ),
  Building: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
    </svg>
  ),
};

/* ----------------------------- Helpers ----------------------------- */
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtYM = (v) => {
  if (!v) return "Present";
  const [y, m] = String(v).split("-");
  const yy = Number(y), mm = Number(m);
  if (!yy || !mm || mm < 1 || mm > 12) return v;
  return `${MONTHS_SHORT[mm - 1]} ${yy}`;
};

function monthDiff(start, end) {
  const [sy, sm] = (start || "").split("-").map(Number);
  if (!sy || !sm) return 0;
  const ed = end ? new Date(Number(end.split("-")[0]), Number(end.split("-")[1]) - 1, 1) : new Date();
  return Math.max(0, (ed.getFullYear() - sy) * 12 + (ed.getMonth() + 1 - sm));
}
function humanDuration(start, end) {
  const months = monthDiff(start, end);
  const y = Math.floor(months / 12), m = months % 12;
  if (!months) return "0 mo";
  if (y && m) return `${y} yr ${m} mo`;
  if (y) return `${y} yr${y > 1 ? "s" : ""}`;
  return `${m} mo`;
}

/* Simple markdown conversion that preserves HTML lists */
function mdLiteToHtml(text) {
  if (!text) return "";
  if (/<[^>]+>/.test(text)) return text;
  const safe = text.toString();
  const lines = safe.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return "";
  const isUL = lines.every((l) => /^(-|\*|•)\s+/.test(l.trim()));
  const isOL = lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  if (isUL) return `<ul>${lines.map((l) => `<li>${inline(l.trim().replace(/^(-|\*|•)\s+/, ""))}</li>`).join("")}</ul>`;
  if (isOL) return `<ol>${lines.map((l) => `<li>${inline(l.trim().replace(/^\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
  return `<p>${inline(lines.join("<br>"))}</p>`;
}

/* Get field value with fallbacks */
function getField(obj, fieldNames) {
  for (const f of fieldNames) {
    const v = obj?.[f];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/* Convert various formats to array */
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => v && String(v).trim()).map((v) => String(v).trim());
  if (typeof value === "string") {
    const t = value.trim();
    if (t.startsWith("[") && t.endsWith("]")) {
      try { const parsed = JSON.parse(t); if (Array.isArray(parsed)) return toArray(parsed); } catch {}
    }
    return t.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

/* ----------------------------- Card ----------------------------- */
const Card = ({ children, className = "", dark = false, ...props }) => (
  <div
    className={`experience-card rounded-xl border shadow-sm
      ${dark ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"}
      ${className}`}
    {...props}
  >
    {children}
  </div>
);

/* ----------------------------- Reveal ----------------------------- */
const Reveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setIsVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return <div className={`transition-all duration-700 transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>{children}</div>;
};

/* ----------------------------- Normalizer ----------------------------- */
function normalize(row = {}) {
  const id = getField(row, ["id", "Id", "experienceId", "_id"]) || String(Date.now());
  const company = getField(row, ["company", "Company", "employer"]) || "";
  const role = getField(row, ["role", "Role", "position", "title", "jobTitle"]) || "";
  const project = getField(row, ["project", "Project", "projectName", "projectTitle", "client", "assignment"]) || "";
  const location = getField(row, ["location", "Location", "city"]) || "";
  const startDate = getField(row, ["startDate", "start_date", "from"]) || "";
  const endDate = getField(row, ["endDate", "end_date", "to"]) || "";
  const tools = toArray(row?.tools || row?.tags || row?.skills || row?.technologies || row?.tech || row?.skillTags || "");
  const htmlDesc = getField(row, ["descriptionHtml", "description_html", "html"]);
  const textDesc = getField(row, ["description", "body", "content"]);
  const descriptionHtml = htmlDesc || mdLiteToHtml(textDesc);
  return { id, company, role, project, location, startDate, endDate, descriptionHtml, tools };
}

/* =============================== Main =============================== */
export default function Experience() {
  const navigate = useNavigate();
  const { owner } = useOwnerMode();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [darkMode, setDarkMode] = useState(() => {
    try { return (localStorage.getItem("experience_theme") || "light") === "dark"; } catch { return false; }
  });
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem("experience_view") || "grid"; } catch { return "grid"; }
  });

  const [sortBy] = useState("date");
  const [filterBy, setFilterBy] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => { try { localStorage.setItem("experience_theme", darkMode ? "dark" : "light"); } catch {} }, [darkMode]);
  useEffect(() => { try { localStorage.setItem("experience_view", viewMode); } catch {} }, [viewMode]);
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);

  async function load() {
    setLoading(true); setErrorMsg("");
    try {
      const data = await getExperience();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      setItems(list.map(normalize));
    } catch (e) {
      setErrorMsg(e?.message || "Failed to load experience.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const onSaved = () => load();
    window.addEventListener("experience:saved", onSaved);
    return () => window.removeEventListener("experience:saved", onSaved);
  }, []);

  useMemo(() => {
    const s = new Set();
    items.forEach((i) => Array.isArray(i.tools) && i.tools.forEach((t) => t && s.add(String(t))));
    return Array.from(s).sort();
  }, [items]);

  const totalExperience = useMemo(() => {
    const totalMonths = items.reduce((acc, it) => acc + monthDiff(it?.startDate, it?.endDate), 0);
    const y = Math.floor(totalMonths / 12), m = totalMonths % 12;
    if (!totalMonths) return "0 mo";
    if (y && m) return `${y} yr ${m} mo`;
    if (y) return `${y} yr${y > 1 ? "s" : ""}`;
    return `${m} mo`;
  }, [items]);

  const currentJobs = items.filter((i) => !i.endDate).length;
  const completedJobs = items.filter((i) => i.endDate).length;

  const filteredAndSortedItems = useMemo(() => {
    let arr = items.filter((item) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.role?.toLowerCase().includes(q) ||
        item.company?.toLowerCase().includes(q) ||
        item.project?.toLowerCase().includes(q) ||
        (Array.isArray(item.tools) && item.tools.some((t) => String(t).toLowerCase().includes(q)));

      const matchesFilter =
        filterBy === "all" || (filterBy === "current" && !item.endDate) || (filterBy === "past" && !!item.endDate);

      const matchesTags =
        selectedTags.length === 0 || (Array.isArray(item.tools) && selectedTags.every((tag) => item.tools.includes(tag)));

      return matchesSearch && matchesFilter && matchesTags;
    });

    arr.sort((a, b) => {
      if (sortBy === "date") {
        const aEnd = a.endDate || "9999-12";
        const bEnd = b.endDate || "9999-12";
        const endCmp = bEnd.localeCompare(aEnd);
        if (endCmp !== 0) return endCmp;
        return (b.startDate || "").localeCompare(a.startDate || "");
      }
      if (sortBy === "company") return (a.company || "").localeCompare(b.company || "");
      if (sortBy === "role") return (a.role || "").localeCompare(b.role || "");
      return 0;
    });

    return arr;
  }, [items, searchTerm, filterBy, sortBy, selectedTags]);

  /* actions */
  const onDelete = async (id) => {
    if (!owner) return;
    if (!window.confirm("Delete this experience? This cannot be undone.")) return;
    try { await deleteExperience(id); await load(); }
    catch (e) { alert(e?.message || "Failed to delete experience."); }
  };

  const exportData = () => {
    if (!owner) return;
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "experience-data.json"; a.click();
    URL.revokeObjectURL(url);
  };

  /* UI */
  if (loading) {
    return (
      <section className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-slate-50 to-blue-50"}`}>
        <div className="container mx-auto px-4 py-20 text-center">Loading…</div>
      </section>
    );
  }

  return (
    <section className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-slate-50 to-blue-50"}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
                  Professional Experience
                </h1>
                <div className="mt-3 h-1 w-32 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-sm">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Total Experience: {totalExperience}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-700 shadow-sm">
                  <Icon.TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Active Roles: {currentJobs}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-200 dark:border-purple-700 shadow-sm">
                  <Icon.Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    Completed: {completedJobs}
                  </span>
                </div>
              </div>

              {errorMsg && <div className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</div>}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                className={`px-4 py-2 rounded-full border transition-colors ${darkMode ? "border-gray-600 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"}`}
              >
                {darkMode ? "🌙 Dark" : "☀️ Light"} Mode
              </button>

              <div className="flex rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-3 transition-all duration-200 ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                  aria-pressed={viewMode === "grid"}
                >
                  <Icon.Grid />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-3 transition-all duration-200 ${viewMode === "list" ? "bg-blue-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                  aria-pressed={viewMode === "list"}
                >
                  <Icon.List />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((s) => !s)}
                className={`p-3 rounded-xl border shadow-sm transition-all duration-200 ${showFilters ? "bg-blue-500 text-white border-blue-500" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:shadow-md"}`}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
                title="Toggle filters"
              >
                <Icon.Filter />
              </button>

              {owner && (
                <button
                  type="button"
                  onClick={exportData}
                  className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Export experience data"
                >
                  <Icon.Download />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredAndSortedItems.length === 0 ? (
          <Reveal>
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Icon.Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No experiences found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Try adjusting your search criteria{owner ? " or add a new entry." : "."}
              </p>
              {owner && (
                <button
                  type="button"
                  onClick={() => navigate("/experience/new")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
                >
                  <Icon.Plus className="w-5 h-5" />
                  Add Experience
                </button>
              )}
            </div>
          </Reveal>
        ) : (
          <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
            {filteredAndSortedItems.map((item, idx) => (
              <Reveal key={item.id} delay={idx * 50}>
                {viewMode === "grid" ? (
                  <Card dark={darkMode} className="group relative p-6 hover:shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden">
                    {owner && (
                      <div className="owner-actions absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/experience/edit/${item.id}`); }}
                          className="p-2 bg-white/95 dark:bg-gray-700/95 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow"
                          title="Edit experience"
                        >
                          <Icon.Edit />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                          className="p-2 bg-white/95 dark:bg-gray-700/95 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:shadow"
                          title="Delete experience"
                        >
                          <Icon.Trash />
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-start justify-between gap-2 mb-4 pr-20">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${item.endDate ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`}>
                        {item.endDate ? "Completed" : "Current"}
                      </div>
                      {item.project && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-700 dark:text-indigo-300 text-xs">
                          <Icon.Briefcase className="w-3 h-3" />
                          <span className="font-medium">{item.project}</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <h3 className="exp-title text-lg font-bold text-gray-900 dark:text-white mb-1">{item.role}</h3>
                      <div className="exp-company flex items-center gap-2 text-gray-700 dark:text-white flex-wrap">
                        <Icon.Building className="w-4 h-4" />
                        <span className="font-medium">{item.company}</span>
                      </div>
                    </div>

                    <div className="exp-meta space-y-2 mb-3 text-sm text-gray-700 dark:text-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon.Calendar className="w-4 h-4" />
                        <span>{fmtYM(item.startDate)} – {fmtYM(item.endDate)}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">({humanDuration(item.startDate, item.endDate)})</span>
                      </div>
                      {item.location && (
                        <div className="flex items-center gap-2">
                          <Icon.MapPin className="w-4 h-4" />
                          <span>{item.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-grow mb-4">
                      <div
                        className="experience-description prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.descriptionHtml }}
                      />
                    </div>

                    {Array.isArray(item.tools) && item.tools.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.tools.map((tool, i) => (
                          <span key={`tool-${item.id}-${i}`} className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {String(tool)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card dark={darkMode} className="group p-6 hover:shadow-lg transition-all duration-200">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="exp-title text-lg font-bold text-gray-900 dark:text-white">{item.role}</h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${item.endDate ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`}>
                            {item.endDate ? "Completed" : "Current"}
                          </div>
                          {item.project && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-700 dark:text-indigo-300 text-xs">
                              <Icon.Briefcase className="w-3 h-3" />
                              {item.project}
                            </span>
                          )}
                        </div>

                        <div className="exp-meta flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-white mb-3">
                          <div className="flex items-center gap-1">
                            <Icon.Building className="w-4 h-4" />
                            <span className="font-medium">{item.company}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Icon.Calendar className="w-4 h-4" />
                            <span>{fmtYM(item.startDate)} – {fmtYM(item.endDate)} ({humanDuration(item.startDate, item.endDate)})</span>
                          </div>
                          {item.location && (
                            <div className="flex items-center gap-1">
                              <Icon.MapPin className="w-4 h-4" />
                              <span>{item.location}</span>
                            </div>
                          )}
                        </div>

                        <div
                          className="experience-description prose prose-sm max-w-none mb-3"
                          dangerouslySetInnerHTML={{ __html: item.descriptionHtml }}
                        />

                        {Array.isArray(item.tools) && item.tools.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.tools.map((tool, i) => (
                              <span key={`tool-${item.id}-${i}`} className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {String(tool)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {owner && (
                        <div className="owner-actions flex gap-2 lg:flex-col lg:items-end shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                          <button
                            type="button"
                            onClick={() => navigate(`/experience/edit/${item.id}`)}
                            className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                            title="Edit experience"
                          >
                            <Icon.Edit />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                            title="Delete experience"
                          >
                            <Icon.Trash />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </Reveal>
            ))}

            {owner && viewMode === "grid" && (
              <Reveal delay={filteredAndSortedItems.length * 50}>
                <button
                  type="button"
                  onClick={() => navigate("/experience/new")}
                  className="h-full w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 flex flex-col items-center justify-center gap-3"
                >
                  <Icon.Plus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">Add Experience</span>
                </button>
              </Reveal>
            )}
          </div>
        )}

        {owner && viewMode === "list" && filteredAndSortedItems.length > 0 && (
          <Reveal delay={300}>
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => navigate("/experience/new")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
              >
                <Icon.Plus className="w-5 h-5" />
                Add New Experience
              </button>
            </div>
          </Reveal>
        )}
      </div>

      {/* Styling: theme-aware text, preserve user colors/highlights, bullet color, hover-owner actions */}
      <style>{`
        /* Lists */
        .experience-description ul { list-style-type: disc !important; margin: 1rem 0 !important; padding-left: 1.5rem !important; }
        .experience-description ol { list-style-type: decimal !important; margin: 1rem 0 !important; padding-left: 1.5rem !important; }
        .experience-description li { display: list-item !important; margin: 0.25rem 0 !important; }
        .experience-description ul li::marker,
        .experience-description ol li::marker { color: currentColor !important; }

        /* --- Theme-aware default text ---
           Light mode: inherit normal text color.
           Dark mode: default to white, but DO NOT override inline colors/highlights. */
        .experience-card .experience-description { color: inherit; }
        .dark .experience-card .experience-description { color: #ffffff; }

        /* Ensure prose children follow container color unless explicitly styled inline */
        .experience-card .experience-description :where(p,li,span,em,strong,div,blockquote,code,h1,h2,h3,h4,a) { color: inherit; }

        /* Links stay readable in dark mode if no inline color was set */
        .dark .experience-card .experience-description a { color: #93c5fd; }

        /* Owner actions: show on hover/focus only */
        .owner-actions { transition: opacity .2s ease; }
      `}</style>
    </section>
  );
}
