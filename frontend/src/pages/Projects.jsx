import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getProjects, deleteProject as apiDelete } from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";

/* ---------- Constants & Modern Icons ---------- */
const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent", icon: "📅" },
  { value: "name-asc", label: "Name A→Z", icon: "🔤" },
  { value: "name-desc", label: "Name Z→A", icon: "🔡" },
  { value: "featured", label: "Featured First", icon: "⭐" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All Projects", icon: "📋", count: 0 },
  { value: "featured", label: "Featured", icon: "⭐", count: 0 },
  { value: "with-links", label: "Live Projects", icon: "🔗", count: 0 },
];

const VIEW_MODES = [
  { value: "grid", label: "Grid View", icon: "▦" },
  { value: "list", label: "List View", icon: "☰" },
  { value: "compact", label: "Compact View", icon: "▤" },
];

const ICONS = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  ),
  add: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  delete: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  loading: (
    <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".3" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  chevronDown: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  externalLink: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  star: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  list: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  compact: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="2" />
      <rect x="3" y="10" width="18" height="2" />
      <rect x="3" y="16" width="18" height="2" />
    </svg>
  ),
};

/* ---------- Helpers ---------- */
function toArray(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (!v) return [];
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}
function parseDateSafe(s) { if (!s) return null; const d = new Date(s); return Number.isFinite(d.getTime()) ? d : null; }
function getRecencyKey(p) {
  const ud = parseDateSafe(p?.updatedAt) || parseDateSafe(p?.modifiedAt);
  const cd = parseDateSafe(p?.createdAt);
  const d = ud || cd || new Date(0);
  return d.getTime?.() ?? 0;
}
function sanitizeHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
    const allowedTags = new Set(["a","b","strong","i","em","u","ul","ol","li","br","p","span","div","blockquote","code","mark","font","pre","h1","h2","h3","h4","h5","h6"]);
    const allowedAttrs = { a: new Set(["href","target","rel"]), span: new Set(["style"]), p: new Set(["style"]), li: new Set(["style"]), font: new Set(["color"]), mark: new Set(["style"]), div: new Set(["style"]), pre: new Set(["style"]), code: new Set(["style"]) };
    const filterStyle = (val = "") => {
      const out = [];
      val.split(";").map((s) => s.trim()).forEach((decl) => {
        const m = decl.match(/^(color|background-color|font-size|font-family|text-align)\s*:\s*([^;]+)$/i);
        if (m) out.push(`${m[1].toLowerCase()}: ${m[2].trim()}`);
      });
      return out.join("; ");
    };
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (!allowedTags.has(tag)) { n.replaceWith(...[...n.childNodes]); return; }
          const keep = allowedAttrs[tag] || new Set();
          [...n.attributes].forEach((a) => { if (!keep.has(a.name.toLowerCase())) n.removeAttribute(a.name); });
          if (tag === "a") { n.setAttribute("target","_blank"); n.setAttribute("rel","noopener noreferrer"); }
          if (n.hasAttribute("style")) {
            const v = filterStyle(n.getAttribute("style"));
            if (v) n.setAttribute("style", v); else n.removeAttribute("style");
          }
          walk(n);
        } else if (n.nodeType === 8) n.remove();
      });
    };
    walk(doc.body);
    return doc.body.innerHTML;
  } catch { return html || ""; }
}
function htmlToPlain(text) {
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeHtml(text || "");
  return tmp.textContent || tmp.innerText || "";
}
function sortRecent(arr) { return [...(arr || [])].sort((a, b) => getRecencyKey(b) - getRecencyKey(a)); }

/* ---------- Main ---------- */
export default function Projects() {
  const [darkMode, setDarkMode] = useState(false);
  const { owner } = useOwnerMode();
  const nav = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("recent");
  const [filterMode, setFilterMode] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [expandedTech, setExpandedTech] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAdvancedFilters] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const backdropRef = useRef(null);
  const modalRef = useRef(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      const data = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      setItems(data);
      setErr("");
    } catch (e) {
      setErr(e?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchProjects();
    })();
    return () => { alive = false; };
  }, [fetchProjects]);

  useEffect(() => {
    if (location.state?.refreshProjects) {
      fetchProjects();
      nav(location.pathname, { replace: true, state: {} });
    }
    const onFocus = () => fetchProjects();
    const onVisibility = () => { if (document.visibilityState === "visible") fetchProjects(); };
    const onCustom = () => fetchProjects();
    const onStorage = (e) => {
      if (e.key === "projects:dirty" && e.newValue === "1") {
        try { localStorage.removeItem("projects:dirty"); } catch {}
        fetchProjects();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("projects:updated", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("projects:updated", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [fetchProjects, location.pathname, location.state, nav]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filterOptionsWithCounts = useMemo(() => {
    const featuredCount = items.filter((p) => !!p?.featured).length;
    const withLinksCount = items.filter((p) => p?.links?.url || p?.links?.link).length;
    return FILTER_OPTIONS.map((option) => ({
      ...option,
      count:
        option.value === "all" ? items.length :
        option.value === "featured" ? featuredCount :
        option.value === "with-links" ? withLinksCount : 0,
    }));
  }, [items]);

  const projects = useMemo(() => {
    let arr = Array.isArray(items) ? items : [];
    if (filterMode === "featured") arr = arr.filter((p) => !!p?.featured);
    else if (filterMode === "with-links") arr = arr.filter((p) => !!(p?.links?.url || p?.links?.link));
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((p) => {
        const tech = toArray(p?.techStack).join(" ").toLowerCase();
        const tags = toArray(p?.tags).join(" ").toLowerCase();
        return (
          String(p?.name || "").toLowerCase().includes(q) ||
          String(htmlToPlain(p?.summary) || "").toLowerCase().includes(q) ||
          tech.includes(q) || tags.includes(q)
        );
      });
    }
    if (sortMode === "name-asc") return [...arr].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    if (sortMode === "name-desc") return [...arr].sort((a, b) => (b?.name || "").localeCompare(a?.name || ""));
    if (sortMode === "featured") return [...arr].sort((a, b) => (b?.featured ? 1 : 0) - (a?.featured ? 1 : 0));
    return sortRecent(arr);
  }, [items, query, sortMode, filterMode]);

  const uniqueTechCount = useMemo(() => {
    const set = new Set();
    items.forEach((p) => toArray(p?.techStack).forEach((t) => set.add(String(t).toLowerCase())));
    return set.size;
  }, [items]);
  const featuredCount = useMemo(() => items.filter((p) => !!p?.featured).length, [items]);
  const withLinksCount = useMemo(() => items.filter((p) => p?.links?.url || p?.links?.link).length, [items]);

  const goAdd = () => { if (owner) nav("/projects/new"); };
  const goEdit = (id) => { if (owner) nav(`/projects/edit/${encodeURIComponent(id)}`); };

  const onDelete = async (id) => {
    if (!owner) return;
    if (!window.confirm("Delete this project?")) return;
    try {
      setBusyId(String(id));
      await apiDelete(id);
      setItems((prev) => prev.filter((p) => String(p?.id) !== String(id)));
    } catch (e) {
      alert(e?.message || "Delete failed");
    } finally {
      setBusyId("");
    }
  };

  const openModal = (p) => { setActive(p); setOpen(true); };
  const toggleTechExpansion = (tech) => {
    setExpandedTech((prev) => prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]);
  };
  const clearFilters = () => { setQuery(""); setFilterMode("all"); setExpandedTech([]); };

  if (err) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-gray-50 via-white to-gray-100"}`}>
        <div className={`text-center p-8 ${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-xl border ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"} mb-2`}>Something went wrong</h2>
          <pre className={`${darkMode ? "text-red-400 bg-red-900/20" : "text-red-600 bg-red-50"} text-sm p-4 rounded-lg`}>{err}</pre>
        </div>
      </div>
    );
  }

  return (
    <section className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-gray-50 via-white to-gray-100"}`}>
      <style>{`
        .projects-grid {
          display: grid;
          gap: 1.5rem;
          grid-template-columns: ${
            viewMode === "grid" ? "repeat(auto-fill, minmax(350px, 1fr))" :
            viewMode === "list" ? "1fr" :
            "repeat(auto-fill, minmax(280px, 1fr))"
          };
        }
        .project-card {
          height: ${viewMode === "grid" ? "320px" : viewMode === "list" ? "auto" : "240px"};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .project-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        @media (min-width: 1024px) {
          .main-layout { grid-template-columns: ${sidebarCollapsed ? "80px 1fr" : "320px 1fr"}; }
        }
      `}</style>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Projects
                </h1>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setDarkMode((v) => !v)}
                  className={`px-4 py-2 rounded-full border text-sm ${
                    darkMode ? "border-gray-600 hover:bg-gray-800 text-white" : "border-gray-300 hover:bg-gray-100 text-gray-700"
                  } transition-colors`}
                >
                  {darkMode ? "🌙 Dark" : "☀️ Light"} Mode
                </motion.button>
              </div>

              <div className="h-1 w-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full" />

              <div className={`flex flex-wrap items-center gap-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>{items.length} total projects</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-amber-500 rounded-full"></span>{featuredCount} featured</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>{withLinksCount} live projects</span>
              </div>
            </div>

            {/* Single Add button (owner-only) — Top right only */}
            {owner && (
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={goAdd}
                className="flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                aria-label="Add New Project"
                title="Add a project"
              >
                {ICONS.add}
                <span>Add Project</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Main Layout */}
        <div
          className="main-layout grid gap-8 transition-all duration-300"
          style={{
            gridTemplateColumns:
              typeof window !== "undefined" && window.innerWidth >= 1024
                ? sidebarCollapsed ? "80px 1fr" : "320px 1fr"
                : "1fr",
          }}
        >
          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`space-y-6 ${sidebarCollapsed ? "w-20" : ""}`}>
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Filters & Stats</h2>}
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`p-2 rounded-lg ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"} transition-colors`}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  {ICONS.chevronRight}
                </motion.div>
              </motion.button>
            </div>

            {!sidebarCollapsed && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard title="Total" value={items.length} icon="📊" darkMode={darkMode} />
                  <StatCard title="Featured" value={featuredCount} icon="⭐" darkMode={darkMode} />
                  <StatCard title="Live" value={withLinksCount} icon="🔗" darkMode={darkMode} />
                  <StatCard title="Tech" value={uniqueTechCount} icon="⚡" darkMode={darkMode} />
                </div>

                <div className="space-y-2">
                  {filterOptionsWithCounts.map((option, idx) => (
                    <motion.button
                      key={option.value}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all font-medium ${
                        filterMode === option.value
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                          : darkMode
                          ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                      onClick={() => setFilterMode(option.value)}
                      aria-pressed={filterMode === option.value}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-lg">{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        filterMode === option.value ? "bg-white/20 text-white" :
                        darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-600"
                      }`}>{option.count}</span>
                    </motion.button>
                  ))}
                </div>

                <TechStackExplorer
                  items={items}
                  expandedTech={expandedTech}
                  toggleTechExpansion={toggleTechExpansion}
                  openModal={openModal}
                  darkMode={darkMode}
                />

                {(query || filterMode !== "all") && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={clearFilters}
                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all font-medium ${
                      darkMode ? "bg-red-900/30 text-red-300 hover:bg-red-900/50" : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {ICONS.close}
                    <span>Clear All Filters</span>
                  </motion.button>
                )}
              </>
            )}
          </motion.div>

          {/* Main Content */}
          <div className="space-y-6">
            <EnhancedControls
              query={query}
              setQuery={setQuery}
              sortMode={sortMode}
              setSortMode={setSortMode}
              viewMode={viewMode}
              setViewMode={setViewMode}
              showAdvancedFilters={showAdvancedFilters}
              resultsCount={projects.length}
              darkMode={darkMode}
            />

            {loading ? (
              <EnhancedSkeletonGrid viewMode={viewMode} darkMode={darkMode} />
            ) : projects.length === 0 ? (
              <EnhancedEmptyState
                hasFilters={!!(query || filterMode !== "all")}
                clearFilters={clearFilters}
                owner={owner}
                darkMode={darkMode}
              />
            ) : (
              <EnhancedProjectsGrid
                projects={projects}
                owner={owner}
                busyId={busyId}
                onEdit={goEdit}
                onDelete={onDelete}
                openModal={openModal}
                viewMode={viewMode}
                darkMode={darkMode}
              />
            )}
          </div>
        </div>

        <EnhancedProjectModal
          open={open}
          active={active}
          setOpen={setOpen}
          backdropRef={backdropRef}
          modalRef={modalRef}
          darkMode={darkMode}
        />
      </div>
    </section>
  );
}

/* ---------- Components ---------- */
function StatCard({ title, value, icon, darkMode }) {
  return (
    <div className={`p-4 rounded-2xl shadow-lg border ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-500 text-white">
          {value > 99 ? "99+" : value}
        </div>
      </div>
      <div className="text-2xl font-black leading-none">{Number.isFinite(value) ? value.toLocaleString() : "0"}</div>
      <div className={`text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        {title}
      </div>
    </div>
  );
}

function TechStackExplorer({ items, expandedTech, toggleTechExpansion, openModal, darkMode }) {
  const topTech = useMemo(() => {
    const techMap = new Map();
    items.forEach((p) => {
      toArray(p?.techStack).forEach((t) => {
        const k = t.toLowerCase();
        techMap.set(k, (techMap.get(k) || 0) + 1);
      });
    });
    return Array.from(techMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tech, count]) => ({ tech, count }));
  }, [items]);

  const techColors = [
    "from-blue-500 to-cyan-500","from-green-500 to-emerald-500","from-purple-500 to-pink-500","from-amber-500 to-orange-500","from-red-500 to-rose-500",
    "from-indigo-500 to-blue-500","from-teal-500 to-green-500","from-violet-500 to-purple-500","from-orange-500 to-red-500","from-cyan-500 to-blue-500",
  ];

  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-bold uppercase tracking-wide ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Technology Stack</h3>
      {topTech.map(({ tech, count }, idx) => (
        <div key={tech} className="relative">
          <button
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${darkMode ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}
            onClick={() => toggleTechExpansion(tech)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${techColors[idx % techColors.length]} shadow-lg`} />
              <span className="font-medium capitalize">{tech}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-600"}`}>{count}</span>
              <div className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>{ICONS.chevronDown}</div>
            </div>
          </button>

          <AnimatePresence>
            {expandedTech.includes(tech) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="mt-2 ml-6 space-y-1 overflow-hidden">
                {items
                  .filter((p) => toArray(p?.techStack).map((t) => t.toLowerCase()).includes(tech))
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p?.id}
                      className={`block w-full text-left p-2 text-sm rounded-lg transition-all ${
                        darkMode ? "text-gray-300 hover:text-white hover:bg-gray-800/50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                      onClick={() => openModal(p)}
                    >
                      • {p?.name || "Untitled"}
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function EnhancedControls({
  query, setQuery, sortMode, setSortMode, viewMode, setViewMode, showAdvancedFilters, resultsCount, darkMode,
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 group">
            <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${darkMode ? "text-gray-400" : "text-gray-400"}`}>{ICONS.search}</div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, technologies, descriptions..."
              className={`w-full h-12 rounded-xl border-2 pl-12 pr-4 text-sm transition-all ${
                darkMode ? "bg-gray-800 text-white border-gray-700 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                          : "bg-white text-gray-900 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
              }`}
              aria-label="Search projects"
            />
            {query && (
              <motion.button
                initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => setQuery("")}
                className={`absolute inset-y-0 right-0 pr-4 flex items-center ${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"}`}
                aria-label="Clear search"
              >
                {ICONS.close}
              </motion.button>
            )}
          </div>

          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className={`h-12 rounded-xl border-2 pr-10 pl-4 text-sm appearance-none min-w-[160px] transition-all ${
                darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"
              }`}
              aria-label="Sort projects"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
            <div className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {ICONS.chevronDown}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            <span className={`${darkMode ? "text-white" : "text-gray-900"} font-bold`}>{resultsCount}</span> projects
          </div>

          <div className={`flex items-center p-1 rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
            {VIEW_MODES.map((mode) => (
              <motion.button
                key={mode.value} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode(mode.value)}
                className={`p-2 rounded-md transition-all ${
                  viewMode === mode.value
                    ? darkMode ? "bg-gray-700 text-indigo-300 shadow-sm" : "bg-white text-indigo-600 shadow-sm"
                    : darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                }`}
                title={mode.label} aria-label={mode.label}
              >
                {mode.value === "grid" ? ICONS.grid : mode.value === "list" ? ICONS.list : ICONS.compact}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-xl border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
            <div className={`text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Advanced Filters</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" placeholder="React, Node.js..." className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"}`} />
              <select className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"}`}>
                <option>All time</option><option>Last month</option><option>Last 6 months</option><option>Last year</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EnhancedSkeletonGrid({ viewMode, darkMode }) {
  const itemCount = viewMode === "list" ? 5 : viewMode === "compact" ? 8 : 6;
  return (
    <div className="projects-grid">
      {Array.from({ length: itemCount }).map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
          className={`project-card rounded-2xl p-6 shadow-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="space-y-4">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse" />
            <div className="space-y-3">
              <div className={`h-6 rounded-lg animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
              <div className={`h-4 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"} animate-pulse`} />
              <div className={`h-4 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"} animate-pulse w-3/4`} />
            </div>
            {viewMode === "grid" && <div className={`h-32 rounded-xl animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />}
            <div className="flex justify-between items-center">
              <div className={`h-4 rounded ${darkMode ? "bg-gray-700" : "bg-gray-200"} animate-pulse w-1/3`} />
              <div className={`h-8 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-200"} animate-pulse w-20`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EnhancedEmptyState({ hasFilters, clearFilters, owner, darkMode }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 px-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-8xl">{hasFilters ? "🔍" : "📁"}</div>
        <div className="space-y-3">
          <h3 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            {hasFilters ? "No projects found" : "No projects yet"}
          </h3>
          <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {hasFilters ? "Try adjusting your search criteria or filters." : owner ? "Use the Add Project button to create your first one." : "Ask the owner to add some projects."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {hasFilters && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={clearFilters}
              className={`px-6 py-3 rounded-xl font-medium ${
                darkMode ? "bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Clear Filters
            </motion.button>
          )}
          {/* NOTE: Removed the second Add button here to keep only the top-right one */}
        </div>
      </div>
    </motion.div>
  );
}

function EnhancedProjectsGrid({ projects, owner, busyId, onEdit, onDelete, openModal, viewMode, darkMode }) {
  return (
    <div className="projects-grid">
      <AnimatePresence mode="popLayout">
        {projects.map((p, index) => {
          const linkUrl = p?.links?.url || p?.links?.link || null;
          const plain = htmlToPlain(p?.summary);
          const rich = sanitizeHtml(p?.summary);

          return (
            <motion.div
              key={p?.id ?? `idx-${index}`}
              layout
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, delay: index * 0.04, type: "spring", stiffness: 120 }}
              className="project-card"
            >
              {/* list view no longer forces a two-column flex with an empty left rail */}
              <div className={`h-full rounded-2xl shadow-lg border overflow-hidden relative ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} ${viewMode === "list" ? "" : "flex flex-col"}`}>
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                {/* Owner controls */}
                {owner && (
                  <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-100">
                    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }}
                      onClick={() => onEdit(p?.id)}
                      className={`p-2 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-600 hover:border-indigo-500 text-white" : "bg-white border-gray-200 hover:border-indigo-300 text-gray-800"}`}
                      title="Edit" aria-label={`Edit ${p?.name || "project"}`}
                    >
                      {ICONS.edit}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }}
                      onClick={() => onDelete(p?.id)}
                      className={`p-2 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-600 hover:border-red-500 text-white" : "bg-white border-gray-200 hover:border-red-300 text-gray-800"} disabled:opacity-50`}
                      title="Delete" aria-label={`Delete ${p?.name || "project"}`} disabled={busyId === String(p?.id)}
                    >
                      {busyId === String(p?.id) ? ICONS.loading : ICONS.delete}
                    </motion.button>
                  </div>
                )}

                <div className={`p-6 ${viewMode === "list" ? "" : "flex-1 flex flex-col"}`}>
                  {/* Title + badges */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className={`text-xl font-bold leading-tight ${darkMode ? "text-white" : "text-gray-900"}`}>{p?.name || "Untitled Project"}</h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {p?.featured && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full text-xs font-bold shadow">
                          {ICONS.star} Featured
                        </span>
                      )}
                      {linkUrl && (
                        <a
                          href={linkUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xs font-bold shadow"
                          title="View live project" onClick={(e) => e.stopPropagation()}
                        >
                          {ICONS.externalLink} Live
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    {viewMode === "list" ? (
                      <div
                        className={`prose prose-sm max-w-none leading-relaxed ${darkMode ? "prose-invert text-gray-300" : "text-gray-700"}`}
                        dangerouslySetInnerHTML={{ __html: rich || "<p>No description available for this project.</p>" }}
                      />
                    ) : (
                      <p className={`leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-600"} ${viewMode === "grid" ? "line-clamp-4" : "line-clamp-2"}`}>
                        {plain || "No description available for this project."}
                      </p>
                    )}

                    {/* Tech chips */}
                    {toArray(p?.techStack).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1">
                        {toArray(p?.techStack).slice(0, viewMode === "compact" ? 3 : 8).map((tech, idx) => (
                          <span key={`${tech}-${idx}`} className={`px-2 py-1 rounded-md text-xs font-medium ${darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"}`}>
                            {tech}
                          </span>
                        ))}
                        {toArray(p?.techStack).length > (viewMode === "compact" ? 3 : 8) && (
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${darkMode ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-600"}`}>
                            +{toArray(p?.techStack).length - (viewMode === "compact" ? 3 : 8)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta (list view) */}
                    {viewMode === "list" && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
                        {p?.client && <div className={darkMode ? "text-gray-300" : "text-gray-700"}><span className="font-medium">Client: </span>{p.client}</div>}
                        {p?.role && <div className={darkMode ? "text-gray-300" : "text-gray-700"}><span className="font-medium">Role: </span>{p.role}</div>}
                        {p?.location && <div className={darkMode ? "text-gray-300" : "text-gray-700"}><span className="font-medium">Location: </span>{p.location}</div>}
                        <div className={darkMode ? "text-gray-400" : "text-gray-500"}>
                          {p?.createdAt && <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>}
                          {p?.updatedAt && <span> • Updated {new Date(p.updatedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-between">
                    {viewMode !== "list" && (
                      <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {p?.createdAt && <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>}
                      </div>
                    )}

                    <motion.button whileHover={{ x: 4 }} whileTap={{ scale: 0.95 }} onClick={() => openModal(p)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${darkMode ? "bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}
                      aria-label={`View details for ${p?.name || "project"}`}
                    >
                      <span>View Details</span>
                      {ICONS.chevronRight}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function EnhancedProjectModal({ open, active, setOpen, backdropRef, modalRef, darkMode }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = toArray(active?.images);
  if (!open || !active) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={backdropRef}
        onMouseDown={(e) => { if (e.target === backdropRef.current) setOpen(false); }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        aria-modal="true" role="dialog"
      >
        <motion.div
          ref={modalRef}
          onMouseDown={(e) => e.stopPropagation()}
          className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border overflow-hidden ${darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
        >
          <div className={`flex items-center justify-between p-6 border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50"}`}>
            <div className="space-y-1">
              <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{active?.name || "Project Details"}</h2>
              <div className="flex items-center gap-3">
                {active?.featured && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${darkMode ? "bg-amber-900/30 text-amber-200" : "bg-amber-100 text-amber-800"}`}>⭐ Featured</span>
                )}
                {(active?.links?.url || active?.links?.link) && (
                  <a href={active?.links?.url || active?.links?.link} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${darkMode ? "bg-green-900/30 text-green-200 hover:bg-green-900/50" : "bg-green-100 text-green-800 hover:bg-green-200"} transition-colors`}
                  >
                    {ICONS.externalLink} View Live
                  </a>
                )}
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setOpen(false)}
              className={`p-2 rounded-lg ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"} transition-colors`} aria-label="Close modal">
              {ICONS.close}
            </motion.button>
          </div>

          <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
            {images.length > 0 && (
              <div className="relative">
                <motion.img key={activeImageIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  src={images[activeImageIndex]} alt={`${active?.name} screenshot ${activeImageIndex + 1}`} className="w-full h-64 md:h-80 object-cover" />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors" aria-label="Previous image">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6-6-6" /></svg>
                    </button>
                    <button onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors" aria-label="Next image">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button key={idx} onClick={() => setActiveImageIndex(idx)} className={`w-3 h-3 rounded-full transition-colors ${idx === activeImageIndex ? "bg-white" : "bg-white/50"}`} aria-label={`View image ${idx + 1}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="p-6 space-y-6">
              {active?.summary && (
                <div className="space-y-3">
                  <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>About This Project</h3>
                  <div className={`prose prose-sm max-w-none leading-relaxed ${darkMode ? "prose-invert text-gray-300" : "text-gray-700"}`}
                       dangerouslySetInnerHTML={{ __html: sanitizeHtml(active.summary) }} />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {active?.client && (<div><h4 className={`text-sm font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Client</h4><p className={`${darkMode ? "text-white" : "text-gray-900"} font-medium`}>{active.client}</p></div>)}
                  {active?.role && (<div><h4 className={`text-sm font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Role</h4><p className={`${darkMode ? "text-white" : "text-gray-900"} font-medium`}>{active.role}</p></div>)}
                  {active?.location && (<div><h4 className={`text-sm font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Location</h4><p className={`${darkMode ? "text-white" : "text-gray-900"} font-medium`}>{active.location}</p></div>)}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Timeline</h4>
                    <div className="space-y-1 text-sm">
                      {active?.createdAt && (<p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}><span className="font-medium">Created:</span> {new Date(active.createdAt).toLocaleDateString()}</p>)}
                      {active?.updatedAt && (<p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}><span className="font-medium">Updated:</span> {new Date(active.updatedAt).toLocaleDateString()}</p>)}
                    </div>
                  </div>

                  {toArray(active?.techStack).length > 0 && (
                    <div>
                      <h4 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Technologies</h4>
                      <div className="flex flex-wrap gap-2">
                        {toArray(active.techStack).map((tech, idx) => (
                          <span key={`${tech}-${idx}`} className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            darkMode ? "bg-indigo-900/30 border-indigo-700 text-indigo-200" : "bg-indigo-100 border-indigo-200 text-indigo-800"
                          }`}>{tech}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(active?.links?.url || active?.links?.link) && (
                <div className={`flex flex-wrap gap-3 pt-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <a href={active?.links?.url || active?.links?.link} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all font-medium">
                    {ICONS.externalLink}
                    <span>View Live Project</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
