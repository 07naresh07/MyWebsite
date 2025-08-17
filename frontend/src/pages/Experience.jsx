// src/pages/Experience.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnerMode } from "../lib/owner.js";

/* ----------------------------- Modern Icons ----------------------------- */
const Icon = {
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Edit: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5Z"/>
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M10 11v6M14 11v6"/>
    </svg>
  ),
  ExternalLink: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    </svg>
  ),
  Calendar: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M8 2v4M16 2v4"/>
      <rect width="18" height="18" x="3" y="4" rx="2"/>
      <path d="M3 10h18"/>
    </svg>
  ),
  MapPin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Briefcase: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="M20 7h-3V6a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3v1H4a1 1 0 0 0-1 1v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1ZM9 6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9V6Z"/>
    </svg>
  ),
  Grid: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <rect width="7" height="7" x="3" y="3" rx="1"/>
      <rect width="7" height="7" x="14" y="3" rx="1"/>
      <rect width="7" height="7" x="14" y="14" rx="1"/>
      <rect width="7" height="7" x="3" y="14" rx="1"/>
    </svg>
  ),
  List: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  ),
  Filter: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-5 h-5"}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  TrendingUp: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/>
      <polyline points="16,7 22,7 22,13"/>
    </svg>
  ),
  Award: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/>
      <circle cx="12" cy="8" r="6"/>
    </svg>
  ),
  Building: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
      <path d="M9 22v-4h6v4"/>
    </svg>
  ),
  Sparkles: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M19 17v4"/>
      <path d="M3 5h4"/>
      <path d="M17 19h4"/>
    </svg>
  )
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

function mdLiteToHtml(text) {
  const safe = (text ?? "").toString();
  const lines = safe.split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return "";
  const isUL = lines.every((l) => /^(-|\*|•)\s+/.test(l));
  const formatInline = (s) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*(.+?)\*/g, "<em>$1</em>");
  if (isUL) {
    return `<ul class="space-y-1">${lines.map((l) => 
      `<li class="flex items-start gap-2">
        <span class="text-blue-500 mt-1 text-sm">•</span>
        <span>${formatInline(l.replace(/^(-|\*|•)\s+/, ""))}</span>
       </li>`
    ).join("")}</ul>`;
  }
  return `<p>${formatInline(lines.join("<br>"))}</p>`;
}

/* ----------------------------- Card ----------------------------- */
const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

/* ----------------------------- Reveal ----------------------------- */
const Reveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setIsVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className={`transition-all duration-700 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {children}
    </div>
  );
};

/* =============================== Main Component ============================== */
export default function Experience() {
  const navigate = useNavigate();
  const { owner } = useOwnerMode(); // ✅ your hook returns { owner, token }

  const [items, setItems] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("date");
  const [filterBy, setFilterBy] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  /* --------------------- LOAD & SYNC WITH LOCALSTORAGE --------------------- */
  const STORAGE_KEYS = ["experience_items", "experiences"]; // primary + compatibility

  const readAll = () => {
    try {
      const sets = STORAGE_KEYS
        .map(k => JSON.parse(localStorage.getItem(k) || "[]"))
        .filter(Array.isArray);
      const map = new Map();
      sets.flat().forEach(x => map.set(String(x.id), x));
      return Array.from(map.values());
    } catch {
      return [];
    }
  };

  const writeAll = (rows) => {
    try {
      const json = JSON.stringify(rows);
      localStorage.setItem("experience_items", json);
      localStorage.setItem("experiences", json);
    } catch {}
  };

  useEffect(() => { setItems(readAll()); }, []);

  useEffect(() => {
    const onSaved = () => setItems(readAll());
    window.addEventListener("experience:saved", onSaved);
    const onStorage = (e) => {
      if (STORAGE_KEYS.includes(e.key)) setItems(readAll());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("experience:saved", onSaved);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /* ------------------- DERIVED: TAGS, TOTALS, FILTERS, SORT ------------------- */
  const allTools = useMemo(() => {
    const s = new Set();
    items.forEach(i => (i.tools || []).forEach(t => s.add(t)));
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
  const currentJobs = items.filter(i => !i.endDate).length;
  const completedJobs = items.filter(i => i.endDate).length;

  const filteredAndSortedItems = useMemo(() => {
    let arr = items.filter(item => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.role?.toLowerCase().includes(q) ||
        item.company?.toLowerCase().includes(q) ||
        (item.tools || []).some(t => t.toLowerCase().includes(q));

      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "current" && !item.endDate) ||
        (filterBy === "past" && !!item.endDate);

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every(tag => (item.tools || []).includes(tag));

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

  /* ----------------------------- ACTIONS ---------------------------------- */
  const onDelete = (id) => {
    if (!owner) return; // guard in case UI is somehow shown
    if (!window.confirm("Delete this experience? This cannot be undone.")) return;
    setItems(prev => {
      const next = prev.filter(x => String(x.id) !== String(id));
      writeAll(next);
      return next;
    });
  };
  const exportData = () => {
    // Export is read-only; allowed for all
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "experience-data.json"; a.click();
    URL.revokeObjectURL(url);
  };

  /* ------------------------- LAYOUT -------------------------- */
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
                <div className="mt-3 h-1 w-32 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-sm">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
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
            </div>

            {/* Non-destructive controls are always visible */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDarkMode(v => !v)}
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
                onClick={() => setShowFilters(s => !s)}
                className={`p-3 rounded-xl border shadow-sm transition-all duration-200 ${showFilters ? "bg-blue-500 text-white border-blue-500" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:shadow-md"}`}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
                title="Toggle filters"
              >
                <Icon.Filter />
              </button>

              <button
                type="button"
                onClick={exportData}
                className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                title="Export experience data"
              >
                <Icon.Download />
              </button>
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
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No experiences found
              </h3>
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
                  <Card className="group relative p-6 hover:shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden">
                    {/* Edit/Delete only in owner mode */}
                    {owner && (
                      <div className="absolute top-4 right-4 flex gap-2 z-20">
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
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.endDate 
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      }`}>
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
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {item.role}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 flex-wrap">
                        <Icon.Building className="w-4 h-4" />
                        {item.companyUrl ? (
                          <a
                            href={item.companyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1"
                          >
                            {item.company}
                            <Icon.ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="font-medium">{item.company}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon.Calendar className="w-4 h-4" />
                        <span>{fmtYM(item.startDate)} – {fmtYM(item.endDate)}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          ({humanDuration(item.startDate, item.endDate)})
                        </span>
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
                        className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-li:my-1"
                        dangerouslySetInnerHTML={{ __html: item.descriptionHtml || mdLiteToHtml(item.description || "") }}
                      />
                    </div>

                    {Array.isArray(item.tools) && item.tools.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.tools.map((tool, i) => (
                          <span
                            key={`tool-${item.id}-${i}`}
                            className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card className="p-6 hover:shadow-lg transition-all duration-200">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {item.role}
                          </h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.endDate ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          }`}>
                            {item.endDate ? "Completed" : "Current"}
                          </div>
                          {item.project && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-700 dark:text-indigo-300 text-xs">
                              <Icon.Briefcase className="w-3 h-3" />
                              {item.project}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Icon.Building className="w-4 h-4" />
                            {item.companyUrl ? (
                              <a
                                href={item.companyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 font-medium"
                              >
                                {item.company}
                                <Icon.ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="font-medium">{item.company}</span>
                            )}
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
                          className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5"
                          dangerouslySetInnerHTML={{ __html: item.descriptionHtml || mdLiteToHtml(item.description || "") }}
                        />

                        {Array.isArray(item.tools) && item.tools.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.tools.map((tool, i) => (
                              <span
                                key={`tool-${item.id}-${i}`}
                                className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Edit/Delete only in owner mode */}
                      {owner && (
                        <div className="flex gap-2 lg:flex-col lg:items-end shrink-0">
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

            {/* Add Card (Grid only) — owner only */}
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

        {/* Add Button (List view) — owner only */}
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
    </section>
  );
}
