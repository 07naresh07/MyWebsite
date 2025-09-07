// src/pages/Projects.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getProjects, deleteProject as apiDelete } from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";

/* ---------- Smart Suggestions (BIM-first, trimmed dev set) ---------- */
const SMART_SUGGESTIONS = {
  // BIM / AEC core
  revit: ["bim", "family", "parametric", "dynamo", "navisworks", "ifc", "acc", "bim 360", "cobie", "lod", "iso 19650", "qto"],
  dynamo: ["graph", "automation", "python", "revit api", "parametric"],
  grasshopper: ["parametric", "rhino", "data trees", "gh", "kangaroo"],
  rhino: ["grasshopper", "nurbs", "mesh", "subd"],
  navisworks: ["clash detection", "timeliner", "quantification", "model coordination"],
  ifc: ["openbim", "ifc4", "classification", "bcf"],
  speckle: ["interoperability", "data exchange", "streams", "connectors"],
  tekla: ["steel", "fabrication", "shop drawings"],
  archicad: ["hotlink", "morph", "bim"],
  solibri: ["model checking", "rulesets", "ifc"],
  "bim 360": ["docs", "build", "model coordination", "issues"],
  acc: ["docs", "build", "issues", "rfis", "submittals"],
  "point cloud": ["scan to bim", "reality capture", "registration"],
  "scan-to-bim": ["point cloud", "registration", "mesh"],
  cobie: ["asset information", "handover", "sheets"],
  "iso 19650": ["cde", "information management", "naming"],
  "revit api": ["add-in", "c#", "pyrevit", "automation"],
  pyrevit: ["scripts", "bundle", "automation", "panel"],
  bimcollab: ["bcf", "issues", "coordination"],
  "bim track": ["bcf", "issues", "coordination"],

  // trimmed dev set (kept common ones only)
  react: ["frontend", "component", "ui"],
  node: ["backend", "api", "express"],
  python: ["backend", "automation", "data"],
  typescript: ["type-safe", "frontend", "backend"],
  next: ["react", "fullstack", "vercel"],
  vue: ["frontend", "spa"],
  angular: ["frontend", "enterprise"],
  svelte: ["frontend", "lightweight", "performance"],
};

const DIFFICULTY_WEIGHTS = {
  react: 2, vue: 2, angular: 3, svelte: 2,
  node: 2, express: 1, fastapi: 2, django: 3,
  python: 1, javascript: 1, typescript: 2,
  next: 3, nuxt: 3, gatsby: 3,
  aws: 4, docker: 3, kubernetes: 5,
  tensorflow: 4, pytorch: 4, ml: 4,
  blockchain: 5, solidity: 5, web3: 4,
};

/* ---------- Modern Icons ---------- */
const ICONS = {
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  ),
  brain: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </svg>
  ),
  sparkles: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  ),
  timeline: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6" />
      <path d="M9 12H1m14 0h8" />
    </svg>
  ),
  trending: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  external: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  delete: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  loading: (
    <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".3" />
      <path
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        fill="currentColor"
      />
    </svg>
  ),
  add: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

/* ---------- Helpers ---------- */
function toArray(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (!v) return [];
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

function parseDateSafe(s) {
  if (!s && s !== 0) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function getRecencyKey(p) {
  const cand = [p?.updatedAt, p?.updated_at, p?.modifiedAt, p?.modified_at, p?.createdAt, p?.created_at, p?.created];
  for (const v of cand) {
    const d = parseDateSafe(v);
    if (d) return d.getTime();
  }
  return 0;
}

function sanitizeHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
    const cleanElement = (el) => {
      el.querySelectorAll("mark, font").forEach((n) => n.replaceWith(...n.childNodes));
      el.querySelectorAll("[style]").forEach((n) => {
        const style = n.getAttribute("style") || "";
        const filtered = style
          .split(";")
          .map((s) => s.trim())
          .filter((decl) => {
            return (
              !/^background(-color)?\s*:/i.test(decl) &&
              !/^border\s*:/i.test(decl) &&
              !decl.includes("highlight") &&
              !decl.includes("rgba(255, 255, 255") &&
              !decl.includes("rgb(255, 255, 255") &&
              !decl.includes("#ffffff") &&
              !decl.includes("#fff")
            );
          })
          .join("; ");
        if (filtered.trim()) n.setAttribute("style", filtered);
        else n.removeAttribute("style");
      });
    };
    cleanElement(doc.body);
    return doc.body.innerHTML;
  } catch {
    return html || "";
  }
}

function htmlToPlain(text) {
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeHtml(text || "");
  return tmp.textContent || tmp.innerText || "";
}

function calculateDifficulty(techStack) {
  const score = toArray(techStack).reduce((acc, tech) => {
    const weight = DIFFICULTY_WEIGHTS[tech.toLowerCase()] || 1;
    return acc + weight;
  }, 0);
  // used only for sorting; not displayed
  return { score };
}

function estimateReadingTime(text) {
  const words = htmlToPlain(text).trim() ? htmlToPlain(text).split(/\s+/).length : 0;
  const minutes = Math.ceil(words / 200);
  return Number.isFinite(minutes) ? minutes : 0;
}

function normalizeProject(p = {}) {
  const name = p.name ?? p.title ?? p.project_name ?? "";
  const summary =
    p.summary ??
    p.summaryHtml ??
    p.summary_html ??
    p.bodyHtml ??
    p.body_html ??
    p.description ??
    "";

  const techStack = p.techStack ?? p.tech_stack ?? p.technologies ?? p.techs ?? [];

  let linkUrl = null;
  if (typeof p.links === "string") linkUrl = p.links;
  else if (p.links && typeof p.links === "object") linkUrl = p.links.url || p.links.link || null;
  linkUrl = linkUrl || p.url || p.link || null;

  const images = Array.isArray(p.images) ? p.images : toArray(p.images ?? p.image_urls ?? p.gallery);

  return {
    id: p.id ?? p.project_id ?? p.slug ?? name,
    name,
    summary,
    techStack,
    featured: Boolean(p.featured ?? p.is_featured ?? p.starred),
    createdAt: p.createdAt ?? p.created_at ?? p.created ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? p.updated_at ?? p.modifiedAt ?? p.modified_at ?? new Date().toISOString(),
    links: linkUrl ? { url: linkUrl } : null,
    images,
  };
}

function findSimilarProjects(project, allProjects) {
  const projectTech = toArray(project?.techStack).map((t) => t.toLowerCase());
  return allProjects
    .filter((p) => p.id !== project.id)
    .map((p) => {
      const otherTech = toArray(p?.techStack).map((t) => t.toLowerCase());
      const commonTech = projectTech.filter((tech) => otherTech.includes(tech));
      const similarity = commonTech.length / Math.max(projectTech.length || 1, otherTech.length || 1);
      return { project: p, similarity, commonTech };
    })
    .filter((item) => item.similarity > 0.2)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

/* ---------- Main Component ---------- */
export default function SmartProjects() {
  const [darkMode, setDarkMode] = useState(false);
  const { owner } = useOwnerMode();
  const nav = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [smartMode, setSmartMode] = useState("intelligent"); // intelligent | recent | difficulty | reading
  const [selectedProject, setSelectedProject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      const raw = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      const data = raw.map(normalizeProject);
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
    return () => {
      alive = false;
    };
  }, [fetchProjects]);

  useEffect(() => {
    if (location.state?.refreshProjects) {
      fetchProjects();
      nav(location.pathname, { replace: true, state: {} });
    }
    const onFocus = () => fetchProjects();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchProjects();
    };
    const onCustom = () => fetchProjects();
    const onStorage = (e) => {
      if (e.key === "projects:dirty" && e.newValue === "1") {
        try {
          localStorage.removeItem("projects:dirty");
        } catch {}
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

  // Smart search suggestions (BIM-first)
  useEffect(() => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }
    const suggestions = new Set();
    const q = query.toLowerCase();

    Object.keys(SMART_SUGGESTIONS).forEach((key) => {
      const keyLower = key.toLowerCase();
      if (keyLower.includes(q) || q.includes(keyLower)) {
        SMART_SUGGESTIONS[key].forEach((s) => suggestions.add(s));
      }
    });

    items.forEach((project) => {
      toArray(project?.techStack).forEach((tech) => {
        const t = (tech || "").toLowerCase();
        if (t.includes(q)) suggestions.add(t);
      });
    });

    const ordered = Array.from(suggestions).sort((a, b) => {
      const isBIM = (w) =>
        /revit|bim|navis|ifc|acc|cobie|lod|iso|dynamo|grasshopper|rhino|speckle|solibri|tekla|archicad|scan|point cloud|bcf|bimcollab|bim track/i.test(
          w
        );
      return (isBIM(b) ? 1 : 0) - (isBIM(a) ? 1 : 0);
    });

    setSearchSuggestions(ordered.slice(0, 8));
  }, [query, items]);

  const processedProjects = useMemo(() => {
    let projects = items.map((project) => ({
      ...project,
      difficulty: calculateDifficulty(project?.techStack), // used for sorting only
      readingTime: estimateReadingTime(project?.summary),
      searchScore: 0,
    }));

    if (query.trim()) {
      const q = query.toLowerCase();
      projects = projects
        .map((project) => {
          let score = 0;
          if (project?.name?.toLowerCase().includes(q)) score += 10;

          const techMatches = toArray(project?.techStack).filter((tech) => (tech || "").toLowerCase().includes(q));
          score += techMatches.length * 5;

          const plain = htmlToPlain(project?.summary).toLowerCase();
          if (plain.includes(q)) score += 3;

          const curated = SMART_SUGGESTIONS[q] || [];
          curated.forEach((suggestion) => {
            if (
              plain.includes(suggestion) ||
              toArray(project?.techStack).some((tech) => (tech || "").toLowerCase().includes(suggestion))
            ) {
              score += 2;
            }
          });

          return { ...project, searchScore: score };
        })
        .filter((project) => project.searchScore > 0);
    }

    switch (smartMode) {
      case "difficulty": // Complex
        return projects.slice().sort((a, b) => (b.difficulty?.score || 0) - (a.difficulty?.score || 0));
      case "recent":
        return projects.slice().sort((a, b) => getRecencyKey(b) - getRecencyKey(a));
      case "reading": // Quick (short first)
        return projects.slice().sort((a, b) => (a.readingTime || 0) - (b.readingTime || 0));
      default: // intelligent
        if (query.trim()) {
          return projects.slice().sort((a, b) => b.searchScore - a.searchScore);
        }
        return projects
          .slice()
          .sort((a, b) => ((a.featured !== b.featured) ? (b.featured ? 1 : 0) - (a.featured ? 1 : 0) : getRecencyKey(b) - getRecencyKey(a)));
    }
  }, [items, query, smartMode]);

  const goAdd = () => {
    if (owner) nav("/projects/new");
  };
  const goEdit = (id) => {
    if (owner) nav(`/projects/edit/${encodeURIComponent(id)}`);
  };

  const onDelete = async (id) => {
    if (!owner || !window.confirm("Delete this project?")) return;
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

  const openModal = (project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  if (err) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          darkMode ? "bg-gray-900" : "bg-gradient-to-br from-slate-50 via-white to-blue-50"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center p-8 max-w-md ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-3xl shadow-2xl border backdrop-blur-sm`}
        >
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"} mb-2`}>Something went wrong</h2>
          <pre className={`${darkMode ? "text-red-400 bg-red-900/20" : "text-red-600 bg-red-50"} text-sm p-4 rounded-lg`}>{err}</pre>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${
        darkMode ? "bg-gray-900" : "bg-gradient-to-br from-slate-50 via-white to-blue-50"
      }`}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
        .mono { font-family: 'JetBrains Mono', 'Monaco', 'Consolas', monospace; }
        .glass-effect { backdrop-filter: blur(20px); background: ${
          darkMode ? "rgba(17, 24, 39, 0.8)" : "rgba(255, 255, 255, 0.8)"
        }; border: 1px solid ${darkMode ? "rgba(55, 65, 81, 0.3)" : "rgba(229, 231, 235, 0.3)"}; }
        .project-card { transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); transform-style: preserve-3d; }
        .project-card:hover { transform: translateY(-8px) rotateX(2deg) rotateY(1deg); box-shadow: 0 32px 64px -12px rgba(0,0,0,0.25); }
        .floating-animation { animation: floating 6s ease-in-out infinite; }
        @keyframes floating { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .gradient-text { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .tech-pill { position: relative; overflow: hidden; }
        .tech-pill::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s; }
        .tech-pill:hover::before { left: 100%; }
        .project-content { color: ${darkMode ? "#f3f4f6" : "#1f2937"}; line-height: 1.6; }
        .project-content p { margin: 0.4rem 0; line-height: 1.6; }
        .project-content ul { list-style: disc outside; padding-left: 1.5rem; margin: 0.4rem 0; }
        .project-content ol { list-style: decimal outside; padding-left: 1.75rem; margin: 0.4rem 0; }
        .project-content li { margin: 0.2rem 0; line-height: 1.5; }
        .project-content a { color: ${darkMode ? "#60a5fa" : "#3b82f6"}; text-decoration: underline; }
        .project-content h1, .project-content h2, .project-content h3 { font-weight: 600; margin: 0.6rem 0 0.4rem 0; }
        .project-content h1 { font-size: 1.25rem; }
        .project-content h2 { font-size: 1.125rem; }
        .project-content h3 { font-size: 1rem; }
      `}</style>

      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <div className="relative inline-block">
            <motion.h1
              className="text-5xl md:text-7xl font-black mb-6"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <span className="gradient-text">Projects</span>
            </motion.h1>
            <motion.div
              className="absolute -top-4 -right-4 floating-animation"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {ICONS.brain}
            </motion.div>
          </div>

          <motion.p
            className={`text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Exploring the intersection of creativity and technology through intelligent design
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-8 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              <span className={`font-bold text-2xl ${darkMode ? "text-white" : "text-gray-900"}`}>{items.length}</span>{" "}
              Projects Created
            </div>
            <div className={`w-px h-8 ${darkMode ? "bg-gray-700" : "bg-gray-300"}`} />
            <div className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              <span className={`font-bold text-2xl ${darkMode ? "text-white" : "text-gray-900"}`}>
                {new Set(items.flatMap((p) => toArray(p?.techStack))).size}
              </span>{" "}
              Technologies Used
            </div>
          </motion.div>
        </motion.div>

        {/* Smart Controls */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="glass-effect rounded-3xl p-8 mb-4 shadow-xl"
        >
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-2xl">
              <div
                className={`absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {ICONS.search}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects (Revit, Dynamo, IFC, ACC, …)"
                className={`w-full h-14 rounded-2xl pl-16 pr-6 text-lg transition-all duration-300 ${
                  darkMode
                    ? "bg-gray-800/50 text-white border-2 border-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                    : "bg-white/50 text-gray-900 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                } backdrop-blur-sm`}
              />

              {/* Smart Suggestions */}
              <AnimatePresence>
                {searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`absolute top-full left-0 right-0 mt-2 ${
                      darkMode ? "bg-gray-800" : "bg-white"
                    } rounded-2xl shadow-2xl border ${darkMode ? "border-gray-700" : "border-gray-200"} overflow-hidden z-10`}
                  >
                    <div className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {searchSuggestions.map((suggestion, index) => (
                          <motion.button
                            type="button"
                            key={suggestion}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.04 }}
                            onClick={() => setQuery(suggestion)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                              darkMode ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Smart Mode Selector */}
            <div
              className={`relative flex items-center gap-2 p-2 rounded-2xl ${
                darkMode ? "bg-gray-800/50" : "bg-white/50"
              } backdrop-blur-sm`}
            >
              {[
                { value: "intelligent", label: "Smart", icon: ICONS.brain },
                { value: "recent", label: "Recent", icon: ICONS.timeline },
                { value: "difficulty", label: "Complex", icon: ICONS.trending },
                { value: "reading", label: "Quick", icon: ICONS.clock },
              ].map((mode) => {
                const active = smartMode === mode.value;
                return (
                  <motion.button
                    type="button"
                    key={mode.value}
                    aria-pressed={active}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSmartMode(mode.value)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 ${
                      active
                        ? "text-white"
                        : darkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {active && <span className="absolute inset-0 rounded-xl -z-10 bg-gradient-to-r from-blue-500 to-purple-600" />}
                    <span className="shrink-0">{mode.icon}</span>
                    <span className="hidden sm:inline">{mode.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Add Button */}
            {owner && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goAdd}
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {ICONS.add}
                <span>Create</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <ProjectsSkeleton darkMode={darkMode} />
        ) : processedProjects.length === 0 ? (
          <EmptyState query={query} darkMode={darkMode} owner={owner} onClear={() => setQuery("")} onAdd={goAdd} />
        ) : (
          <ProjectsGrid
            projects={processedProjects}
            darkMode={darkMode}
            owner={owner}
            busyId={busyId}
            onEdit={goEdit}
            onDelete={onDelete}
            onView={openModal}
          />
        )}

        {/* Modal */}
        <SmartProjectModal
          project={selectedProject}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          allProjects={items}
          darkMode={darkMode}
          onProjectSelect={(p) => setSelectedProject(p)}
        />

        {/* Theme Toggle */}
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setDarkMode(!darkMode)}
          className={`fixed bottom-8 right-8 w-16 h-16 rounded-2xl shadow-2xl ${
            darkMode ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white" : "bg-gradient-to-r from-slate-800 to-slate-900 text-white"
          } flex items-center justify-center text-2xl transition-all z-50`}
          aria-label="Toggle theme"
        >
          {darkMode ? "☀️" : "🌙"}
        </motion.button>
      </div>
    </div>
  );
}

/* ---------- Components ---------- */

function ProjectsGrid({ projects, darkMode, owner, busyId, onEdit, onDelete, onView }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      <AnimatePresence mode="popLayout">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            darkMode={darkMode}
            owner={owner}
            isBusy={busyId === String(project.id)}
            onEdit={() => onEdit(project.id)}
            onDelete={() => onDelete(project.id)}
            onView={() => onView(project)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ProjectCard({ project, index, darkMode, owner, isBusy, onEdit, onDelete, onView }) {
  const linkUrl = project?.links?.url || project?.links?.link;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="project-card"
    >
      <div
        className={`h-full rounded-3xl overflow-hidden glass-effect border-2 ${
          darkMode ? "border-gray-800/50" : "border-gray-200/50"
        } group relative`}
      >
        {/* Gradient accent */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        {/* Owner controls */}
        {owner && (
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={`p-2 rounded-xl ${darkMode ? "bg-gray-800/90 text-blue-400" : "bg-white/90 text-blue-600"} backdrop-blur-sm shadow-lg border ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}
              aria-label="Edit project"
            >
              {ICONS.edit}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isBusy}
              className={`p-2 rounded-xl ${darkMode ? "bg-gray-800/90 text-red-400" : "bg-white/90 text-red-600"} backdrop-blur-sm shadow-lg border ${
                darkMode ? "border-gray-700" : "border-gray-200"
              } disabled:opacity-50`}
              aria-label="Delete project"
            >
              {isBusy ? ICONS.loading : ICONS.delete}
            </motion.button>
          </div>
        )}

        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className={`text-xl font-bold leading-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
                {project?.name || "Untitled Project"}
              </h3>
            </div>

            {/* Badges (professional: no difficulty label) */}
            <div className="flex flex-wrap gap-2 mb-4">
              {project?.featured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-full text-xs font-semibold shadow">
                  {ICONS.star} Featured
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-700"
                }`}
              >
                {ICONS.clock} {project.readingTime}m read
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 mb-4">
            <div
              className={`project-content text-sm leading-relaxed line-clamp-4 ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(project?.summary) || "No description available.",
              }}
            />
          </div>

          {/* Tech Stack */}
          {toArray(project?.techStack).length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {toArray(project.techStack)
                  .slice(0, 4)
                  .map((tech, idx) => (
                    <span
                      key={`${tech}-${idx}`}
                      className={`tech-pill px-3 py-1 rounded-lg text-xs font-medium ${
                        darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {tech}
                    </span>
                  ))}
                {toArray(project.techStack).length > 4 && (
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    +{toArray(project.techStack).length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            {linkUrl && (
              <motion.a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                {ICONS.external}
                <span>Live Demo</span>
              </motion.a>
            )}

            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                darkMode ? "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              {ICONS.sparkles}
              <span>Explore</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SmartProjectModal({ project, isOpen, onClose, allProjects, darkMode, onProjectSelect }) {
  const images = toArray(project?.images);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset carousel when project changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [project?.id]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  const similarProjects = findSimilarProjects(project, allProjects);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
        {/* Backdrop (click to close) */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden glass-effect shadow-2xl z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-6 md:p-8 border-b ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {project?.name || "Project Details"}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      darkMode ? "bg-blue-900/30 text-blue-200" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {ICONS.clock} {project.readingTime}m read
                  </span>
                  {project?.featured && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-full text-sm font-semibold">
                      {ICONS.star} Featured
                    </span>
                  )}
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className={`p-3 rounded-xl ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"} transition-colors`}
                aria-label="Close"
              >
                {ICONS.close}
              </motion.button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 md:p-8 max-h-[75vh] md:max-h-[80vh] overflow-y-auto overscroll-contain touch-pan-y">
            {/* Images */}
            {images.length > 0 && (
              <div className="relative -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6 md:mb-8">
                <motion.img
                  key={activeImageIndex}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  src={images[activeImageIndex]}
                  alt={`${project?.name} screenshot ${activeImageIndex + 1}`}
                  className="w-full h-64 md:h-80 object-cover select-none"
                  draggable={false}
                />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      aria-label="Previous image"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      aria-label="Next image"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-3 h-3 rounded-full transition-colors ${idx === activeImageIndex ? "bg-white" : "bg-white/50"}`}
                          aria-label={`Show image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Description */}
            <div className="mb-8">
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>About This Project</h3>
              <div
                className={`project-content text-lg leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(project?.summary) }}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                {project?.client && (
                  <div>
                    <h4 className={`text-sm font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Client
                    </h4>
                    <p className={`${darkMode ? "text-white" : "text-gray-900"} font-medium`}>{project.client}</p>
                  </div>
                )}
                {project?.role && (
                  <div>
                    <h4 className={`text-sm font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Role
                    </h4>
                    <p className={`${darkMode ? "text-white" : "text-gray-900"} font-medium`}>{project.role}</p>
                  </div>
                )}
                {project?.location && (
                  <div>
                    <h4 className={`text-sm font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Location
                    </h4>
                    <p className={`${darkMode ? "text-white" : "text-gray-900"} font-medium`}>{project.location}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Timeline</h4>
                  <div className="space-y-1 text-sm">
                    {project?.createdAt && (
                      <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <span className="font-medium">Created:</span> {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    )}
                    {project?.updatedAt && (
                      <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <span className="font-medium">Updated:</span> {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {toArray(project?.techStack).length > 0 && (
                  <div>
                    <h4 className={`text-sm font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      {toArray(project.techStack).map((tech, idx) => (
                        <span
                          key={`${tech}-${idx}`}
                          className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${
                            darkMode ? "bg-blue-900/30 border-blue-700 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800"
                          }`}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Similar Projects */}
            {similarProjects.length > 0 && (
              <div className="mb-2">
                <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>Similar Projects</h3>
                <div className="grid gap-4">
                  {similarProjects.map(({ project: simProject, similarity, commonTech }) => (
                    <motion.button
                      type="button"
                      key={simProject.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onProjectSelect(simProject)}
                      className={`p-4 rounded-2xl text-left transition-all ${
                        darkMode ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className={`font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>{simProject.name}</h4>
                          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                            {Math.round(similarity * 100)}% similar • {commonTech.length} shared technologies
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {commonTech.slice(0, 3).map((tech, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded text-xs ${
                                darkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-700"
                              }`}
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Link */}
            {(project?.links?.url || project?.links?.link) && (
              <div className="pt-4">
                <motion.a
                  href={project?.links?.url || project?.links?.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all text-lg"
                >
                  {ICONS.external}
                  <span>View Live Project</span>
                </motion.a>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProjectsSkeleton({ darkMode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`h-80 rounded-3xl glass-effect border-2 ${darkMode ? "border-gray-800/50" : "border-gray-200/50"} p-6`}
        >
          <div className="space-y-4 h-full flex flex-col">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" />
            <div className="space-y-3">
              <div className={`h-6 rounded-lg animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
              <div className={`h-4 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`} />
              <div className={`h-4 rounded animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"} w-3/4`} />
            </div>
            <div className="mt-auto flex items-center justify-end">
              <div className={`h-10 rounded-xl animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"} w-32`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EmptyState({ query, darkMode, owner, onClear, onAdd }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-8xl floating-animation">{query ? "🔍" : "🚀"}</div>

        <div className="space-y-4">
          <h3 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            {query ? "No matches found" : "Ready to build something amazing?"}
          </h3>
          <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {query
              ? "Try adjusting your search terms or explore different technologies."
              : owner
              ? "Your project portfolio is waiting for its first creation."
              : "Check back soon for exciting new projects."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {query && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClear}
              className={`px-8 py-3 rounded-2xl font-medium ${
                darkMode ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } transition-all`}
            >
              Clear Search
            </motion.button>
          )}

          {owner && !query && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAdd}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Create Your First Project
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
