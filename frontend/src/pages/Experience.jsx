// src/pages/Experience.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
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
  ChevronDown: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className ?? "w-4 h-4"}>
      <path d="m6 9 6 6 6-6" />
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

/* Enhanced markdown conversion with better HTML structure */
function mdLiteToHtml(text) {
  if (!text) return "";
  if (/<[^>]+>/.test(text)) return text;
  
  const safe = String(text).trim();
  if (!safe) return "";
  
  const lines = safe.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return "";
  
  const isUL = lines.every((l) => /^(-|\*|•)\s+/.test(l.trim()));
  const isOL = lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));
  
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
  
  if (isUL) {
    return `<ul class="experience-list">${lines.map((l) => 
      `<li class="experience-list-item">${inline(l.trim().replace(/^(-|\*|•)\s+/, ""))}</li>`
    ).join("")}</ul>`;
  }
  
  if (isOL) {
    return `<ol class="experience-list">${lines.map((l) => 
      `<li class="experience-list-item">${inline(l.trim().replace(/^\d+[.)]\s+/, ""))}</li>`
    ).join("")}</ol>`;
  }
  
  return `<div class="experience-text">${lines.map(line => 
    `<p class="experience-paragraph">${inline(line)}</p>`
  ).join("")}</div>`;
}

/* Get field value with fallbacks */
function getField(obj, fieldNames) {
  for (const f of fieldNames) {
    const v = obj?.[f];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

/* Convert various formats to array */
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((v) => v && String(v).trim()).map((v) => String(v).trim());
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (t.startsWith("[") && t.endsWith("]")) {
      try { 
        const parsed = JSON.parse(t); 
        if (Array.isArray(parsed)) return toArray(parsed); 
      } catch (e) {
        console.warn("Failed to parse array string:", t, e);
      }
    }
    return t.split(/[,;|]/).map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

/* ----------------------------- Enhanced Components ----------------------------- */
const Card = ({ children, className = "", dark = false, ...props }) => (
  <article
    className={`experience-card rounded-xl border shadow-sm transition-all duration-300 hover:shadow-lg ${
      dark 
        ? "bg-gray-800/90 backdrop-blur-sm border-gray-700/50 hover:bg-gray-800" 
        : "bg-white/90 backdrop-blur-sm border-gray-200/50 hover:bg-white"
    } ${className}`}
    {...props}
  >
    {children}
  </article>
);

const Reveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => { 
    const t = setTimeout(() => setIsVisible(true), delay); 
    return () => clearTimeout(t); 
  }, [delay]);
  
  return (
    <div className={`transition-all duration-700 transform ${
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    }`}>
      {children}
    </div>
  );
};

const LoadingSpinner = ({ dark }) => (
  <div className="flex items-center justify-center py-20">
    <div className={`relative w-12 h-12 animate-spin rounded-full border-4 border-solid ${
      dark ? "border-gray-600 border-t-blue-400" : "border-gray-200 border-t-blue-600"
    }`} />
    <span className="sr-only">Loading experience data...</span>
  </div>
);

/* ----------------------------- Normalizer ----------------------------- */
function normalize(row = {}) {
  try {
    const id = getField(row, ["id", "Id", "experienceId", "_id"]) || `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const company = getField(row, ["company", "Company", "employer", "organization"]) || "";
    const role = getField(row, ["role", "Role", "position", "title", "jobTitle", "jobRole"]) || "";
    const project = getField(row, ["project", "Project", "projectName", "projectTitle", "client", "assignment"]) || "";
    const location = getField(row, ["location", "Location", "city", "address"]) || "";
    const startDate = getField(row, ["startDate", "start_date", "from", "startMonth"]) || "";
    const endDate = getField(row, ["endDate", "end_date", "to", "endMonth"]) || "";
    const tools = toArray(row?.tools || row?.tags || row?.skills || row?.technologies || row?.tech || row?.skillTags || "");
    const htmlDesc = getField(row, ["descriptionHtml", "description_html", "html"]);
    const textDesc = getField(row, ["description", "body", "content", "details"]);
    const descriptionHtml = htmlDesc || mdLiteToHtml(textDesc);
    
    return { 
      id, 
      company, 
      role, 
      project, 
      location, 
      startDate, 
      endDate, 
      descriptionHtml, 
      tools: tools.slice(0, 20) // Limit tools to prevent UI overflow
    };
  } catch (error) {
    console.error("Error normalizing experience item:", error, row);
    return {
      id: `error_${Date.now()}`,
      company: "Error loading data",
      role: "Please check this item",
      project: "",
      location: "",
      startDate: "",
      endDate: "",
      descriptionHtml: "There was an error loading this experience. Please edit or delete it.",
      tools: []
    };
  }
}

/* =============================== Main Component =============================== */
export default function Experience() {
  const navigate = useNavigate();
  const { owner } = useOwnerMode();

  // State management
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Theme and view preferences with better error handling
  const [darkMode, setDarkMode] = useState(() => {
    try { 
      const saved = localStorage.getItem("experience_theme");
      return saved === "dark" || (saved === null && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
    } catch (e) { 
      console.warn("Failed to read theme preference:", e);
      return false; 
    }
  });
  
  const [viewMode, setViewMode] = useState(() => {
    try { 
      return localStorage.getItem("experience_view") || "grid"; 
    } catch (e) {
      console.warn("Failed to read view mode preference:", e);
      return "grid"; 
    }
  });

  // Filters and search
  const [sortBy, setSortBy] = useState("date");
  const [filterBy, setFilterBy] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  // Persist preferences with error handling
  useEffect(() => { 
    try { 
      localStorage.setItem("experience_theme", darkMode ? "dark" : "light"); 
    } catch (e) {
      console.warn("Failed to save theme preference:", e);
    } 
  }, [darkMode]);
  
  useEffect(() => { 
    try { 
      localStorage.setItem("experience_view", viewMode); 
    } catch (e) {
      console.warn("Failed to save view mode preference:", e);
    } 
  }, [viewMode]);
  
  useEffect(() => { 
    document.documentElement.classList.toggle("dark", darkMode); 
  }, [darkMode]);

  // Enhanced data loading with retry logic
  const load = useCallback(async (retries = 0) => {
    if (retries === 0) {
      setLoading(true);
      setErrorMsg("");
    }
    
    try {
      const data = await getExperience();
      let list = [];
      
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object') {
        list = Array.isArray(data.items) ? data.items : 
               Array.isArray(data.data) ? data.data : 
               Array.isArray(data.experiences) ? data.experiences : [];
      }
      
      const normalizedItems = list.map(normalize).filter(item => item && item.id);
      setItems(normalizedItems);
      setRetryCount(0);
      
      if (normalizedItems.length === 0 && list.length > 0) {
        console.warn("All items failed normalization. Raw data:", list);
        setErrorMsg("Some experience data could not be loaded properly. Please check the data format.");
      }
    } catch (e) {
      console.error("Failed to load experience (attempt", retries + 1, "):", e);
      
      if (retries < 2) {
        // Retry up to 2 times with exponential backoff
        setTimeout(() => load(retries + 1), (retries + 1) * 1000);
        setRetryCount(retries + 1);
        return;
      }
      
      setErrorMsg(e?.message || "Failed to load experience data. Please check your connection and try again.");
      setItems([]); // Clear items on persistent failure
    } finally { 
      if (retries === 0) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load and event listeners
  useEffect(() => {
    load();
    
    const onSaved = () => {
      console.log("Experience saved event received");
      load();
    };
    
    const onStorageChange = (e) => {
      if (e.key === 'experience_theme') {
        setDarkMode(e.newValue === 'dark');
      } else if (e.key === 'experience_view') {
        setViewMode(e.newValue || 'grid');
      }
    };
    
    window.addEventListener("experience:saved", onSaved);
    window.addEventListener("storage", onStorageChange);
    
    return () => {
      window.removeEventListener("experience:saved", onSaved);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [load]);

  // Enhanced computed values
  const allTags = useMemo(() => {
    const tagSet = new Set();
    items.forEach((item) => {
      if (Array.isArray(item.tools)) {
        item.tools.forEach((tool) => {
          const cleanTool = String(tool).trim();
          if (cleanTool) tagSet.add(cleanTool);
        });
      }
    });
    return Array.from(tagSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [items]);

  const stats = useMemo(() => {
    const totalMonths = items.reduce((acc, item) => {
      const months = monthDiff(item?.startDate, item?.endDate);
      return acc + (isNaN(months) ? 0 : months);
    }, 0);
    
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    
    let totalExperience = "0 mo";
    if (totalMonths) {
      if (y && m) totalExperience = `${y} yr ${m} mo`;
      else if (y) totalExperience = `${y} yr${y > 1 ? "s" : ""}`;
      else totalExperience = `${m} mo`;
    }

    return {
      totalExperience,
      currentJobs: items.filter((i) => !i.endDate).length,
      completedJobs: items.filter((i) => i.endDate).length,
      totalPositions: items.length,
      uniqueCompanies: new Set(items.map(i => i.company).filter(Boolean)).size,
      mostRecentStart: items.reduce((latest, item) => {
        if (!item.startDate) return latest;
        return !latest || item.startDate > latest ? item.startDate : latest;
      }, "")
    };
  }, [items]);

  // Enhanced filtering with debounced search
  const filteredAndSortedItems = useMemo(() => {
    let arr = items.filter((item) => {
      try {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !q ||
          item.role?.toLowerCase().includes(q) ||
          item.company?.toLowerCase().includes(q) ||
          item.project?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q) ||
          item.descriptionHtml?.toLowerCase().includes(q) ||
          (Array.isArray(item.tools) && item.tools.some((t) => 
            String(t).toLowerCase().includes(q)
          ));

        const matchesFilter =
          filterBy === "all" || 
          (filterBy === "current" && !item.endDate) || 
          (filterBy === "past" && !!item.endDate);

        const matchesTags =
          selectedTags.length === 0 || 
          (Array.isArray(item.tools) && selectedTags.every((tag) => 
            item.tools.some(tool => String(tool).toLowerCase() === tag.toLowerCase())
          ));

        return matchesSearch && matchesFilter && matchesTags;
      } catch (e) {
        console.error("Error filtering item:", item, e);
        return true; // Include item if filtering fails
      }
    });

    // Enhanced sorting
    arr.sort((a, b) => {
      try {
        if (sortBy === "date") {
          const aEnd = a.endDate || "9999-12";
          const bEnd = b.endDate || "9999-12";
          const endCmp = bEnd.localeCompare(aEnd);
          if (endCmp !== 0) return endCmp;
          return (b.startDate || "").localeCompare(a.startDate || "");
        }
        if (sortBy === "company") {
          return (a.company || "").localeCompare(b.company || "", undefined, { numeric: true });
        }
        if (sortBy === "role") {
          return (a.role || "").localeCompare(b.role || "", undefined, { numeric: true });
        }
        return 0;
      } catch (e) {
        console.error("Error sorting items:", a, b, e);
        return 0;
      }
    });

    return arr;
  }, [items, searchTerm, filterBy, sortBy, selectedTags]);

  // Enhanced actions with better UX and error handling
  const onDelete = useCallback(async (id, itemTitle) => {
    if (!owner) return;
    
    const confirmMsg = itemTitle 
      ? `Delete "${itemTitle}"?\n\nThis action cannot be undone.`
      : "Delete this experience?\n\nThis action cannot be undone.";
    
    if (!window.confirm(confirmMsg)) return;
    
    try { 
      setLoading(true);
      await deleteExperience(id); 
      await load(); 
    } catch (e) { 
      console.error("Failed to delete experience:", e);
      setErrorMsg(e?.message || "Failed to delete experience. Please try again.");
      setLoading(false);
    }
  }, [owner, load]);

  const exportData = useCallback(() => {
    if (!owner || items.length === 0) return;
    
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        totalItems: items.length,
        experiences: items.map(item => ({
          ...item,
          exportedAt: new Date().toISOString()
        }))
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `experience-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export data:", e);
      alert("Failed to export data. Please try again.");
    }
  }, [owner, items]);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showFilters) {
          setShowFilters(false);
          e.preventDefault();
        }
      }
      if (e.key === '/' && e.ctrlKey) {
        setShowFilters(prev => !prev);
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFilters]);

  // Loading state
  if (loading) {
    return (
      <section className={`min-h-screen transition-colors duration-300 ${
        darkMode ? "dark bg-gray-900 text-white" : "bg-gradient-to-br from-slate-50 to-blue-50 text-gray-900"
      }`}>
        <div className="container mx-auto px-4">
          <LoadingSpinner dark={darkMode} />
          {retryCount > 0 && (
            <div className="text-center mt-4">
              <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Retrying... (Attempt {retryCount + 1}/3)
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "dark bg-gray-900" : "bg-gradient-to-br from-slate-50 to-blue-50"
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
                  Professional Experience
                </h1>
                <div className="mt-3 h-1 w-32 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
              </div>

              {/* Enhanced stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-sm">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Total: {stats.totalExperience}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-700 shadow-sm">
                  <Icon.TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Active: {stats.currentJobs}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-200 dark:border-purple-700 shadow-sm">
                  <Icon.Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    Completed: {stats.completedJobs}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl border border-orange-200 dark:border-orange-700 shadow-sm">
                  <Icon.Briefcase className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                    Positions: {stats.totalPositions}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-600 dark:text-red-300">{errorMsg}</p>
                  <button
                    onClick={() => {
                      setErrorMsg("");
                      load();
                    }}
                    className="mt-2 text-sm text-red-700 dark:text-red-400 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            {/* Enhanced Controls */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-white transition-all duration-200 font-medium"
                aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              >
                {darkMode ? "🌙 Dark" : "☀️ Light"}
              </button>

              <div className="flex rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-3 transition-all duration-200 ${
                    viewMode === "grid" 
                      ? "bg-blue-500 text-white" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  aria-pressed={viewMode === "grid"}
                  aria-label="Grid view"
                >
                  <Icon.Grid />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-3 transition-all duration-200 ${
                    viewMode === "list" 
                      ? "bg-blue-500 text-white" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  aria-pressed={viewMode === "list"}
                  aria-label="List view"
                >
                  <Icon.List />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((s) => !s)}
                className={`p-3 rounded-xl border shadow-sm transition-all duration-200 ${
                  showFilters 
                    ? "bg-blue-500 text-white border-blue-500" 
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:shadow-md hover:text-gray-900 dark:hover:text-white"
                }`}
                aria-expanded={showFilters}
                title="Toggle filters (Ctrl + /)"
              >
                <Icon.Filter />
              </button>

              {owner && (
                <button
                  type="button"
                  onClick={exportData}
                  disabled={items.length === 0}
                  className="p-3 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export experience data"
                >
                  <Icon.Download />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Enhanced Search and Filters */}
        {showFilters && (
          <Reveal>
            <div className="mb-8 p-6 rounded-xl border shadow-sm bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="search-input" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                    Search
                  </label>
                  <div className="relative">
                    <Icon.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                    <input
                      id="search-input"
                      type="text"
                      placeholder="Search roles, companies, projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="filter-select" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                    Filter by Status
                  </label>
                  <select
                    id="filter-select"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  >
                    <option value="all">All Positions</option>
                    <option value="current">Current Roles</option>
                    <option value="past">Past Roles</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="sort-select" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                    Sort by
                  </label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  >
                    <option value="date">Date (Newest First)</option>
                    <option value="company">Company (A-Z)</option>
                    <option value="role">Role (A-Z)</option>
                  </select>
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                    Skills & Technologies
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag) 
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                        className={`px-3 py-1 text-xs rounded-full border transition-all ${
                          selectedTags.includes(tag)
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(searchTerm || filterBy !== "all" || selectedTags.length > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterBy("all");
                      setSelectedTags([]);
                    }}
                    className="text-sm hover:underline text-blue-600 dark:text-blue-400"
                  >
                    Clear all filters
                  </button>
                  <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                    Showing {filteredAndSortedItems.length} of {items.length} experiences
                  </span>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* Content */}
        {filteredAndSortedItems.length === 0 ? (
          <Reveal>
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                <Icon.Search className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                No experiences found
              </h3>
              <p className="mb-8 max-w-md mx-auto text-gray-600 dark:text-gray-400">
                {items.length === 0 
                  ? "Get started by adding your first professional experience."
                  : "Try adjusting your search criteria or filters."
                }
              </p>
              {owner && (
                <button
                  type="button"
                  onClick={() => navigate("/experience/new")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Icon.Plus className="w-5 h-5" />
                  Add Experience
                </button>
              )}
            </div>
          </Reveal>
        ) : (
          <main className={viewMode === "grid" ? "grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "space-y-4"}>
            {filteredAndSortedItems.map((item, idx) => (
              <Reveal key={item.id} delay={idx * 50}>
                {viewMode === "grid" ? (
                  /* Grid Card View */
                  <Card dark={darkMode} className="group relative p-6 h-full flex flex-col">
                    {owner && (
                      <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                        <button
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(`/experience/edit/${item.id}`); 
                          }}
                          className="p-2 rounded-lg border transition-all duration-200 bg-white/95 dark:bg-gray-700/95 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                          title="Edit experience"
                          aria-label={`Edit ${item.role} at ${item.company}`}
                        >
                          <Icon.Edit />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onDelete(item.id, `${item.role} at ${item.company}`); 
                          }}
                          className="p-2 rounded-lg border transition-all duration-200 bg-white/95 dark:bg-gray-700/95 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
                          title="Delete experience"
                          aria-label={`Delete ${item.role} at ${item.company}`}
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
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                          <Icon.Briefcase className="w-3 h-3" />
                          <span className="font-medium">{item.project}</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">
                        {item.role}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap text-gray-700 dark:text-gray-300">
                        <Icon.Building className="w-4 h-4" />
                        <span className="font-medium">{item.company}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon.Calendar className="w-4 h-4" />
                        <span>{fmtYM(item.startDate)} – {fmtYM(item.endDate)}</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
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

                    <div className="flex-grow mb-4 experience-content">
                      <div
                        dangerouslySetInnerHTML={{ __html: item.descriptionHtml }}
                      />
                    </div>

                    {Array.isArray(item.tools) && item.tools.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.tools.map((tool, i) => (
                          <span 
                            key={`${item.id}-tool-${i}`} 
                            className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            {String(tool)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ) : (
                  /* List View */
                  <Card dark={darkMode} className="group p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {item.role}
                          </h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.endDate 
                              ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" 
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          }`}>
                            {item.endDate ? "Completed" : "Current"}
                          </div>
                          {item.project && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                              <Icon.Briefcase className="w-3 h-3" />
                              {item.project}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm mb-3 text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-1">
                            <Icon.Building className="w-4 h-4" />
                            <span className="font-medium">{item.company}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Icon.Calendar className="w-4 h-4" />
                            <span>
                              {fmtYM(item.startDate)} – {fmtYM(item.endDate)} 
                              <span className="ml-1 font-medium text-blue-600 dark:text-blue-400">
                                ({humanDuration(item.startDate, item.endDate)})
                              </span>
                            </span>
                          </div>
                          {item.location && (
                            <div className="flex items-center gap-1">
                              <Icon.MapPin className="w-4 h-4" />
                              <span>{item.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="experience-content mb-3">
                          <div dangerouslySetInnerHTML={{ __html: item.descriptionHtml }} />
                        </div>

                        {Array.isArray(item.tools) && item.tools.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.tools.map((tool, i) => (
                              <span 
                                key={`${item.id}-tool-${i}`} 
                                className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              >
                                {String(tool)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {owner && (
                        <div className="flex gap-2 lg:flex-col lg:items-end shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                          <button
                            type="button"
                            onClick={() => navigate(`/experience/edit/${item.id}`)}
                            className="p-2 rounded-lg transition-all duration-200 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                            title="Edit experience"
                            aria-label={`Edit ${item.role} at ${item.company}`}
                          >
                            <Icon.Edit />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item.id, `${item.role} at ${item.company}`)}
                            className="p-2 rounded-lg transition-all duration-200 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                            title="Delete experience"
                            aria-label={`Delete ${item.role} at ${item.company}`}
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

            {/* Add New Experience Card for Grid View */}
            {owner && viewMode === "grid" && (
              <Reveal delay={filteredAndSortedItems.length * 50}>
                <button
                  type="button"
                  onClick={() => navigate("/experience/new")}
                  className="h-full min-h-[300px] w-full rounded-xl border-2 border-dashed p-8 transition-all duration-200 flex flex-col items-center justify-center gap-3 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  aria-label="Add new experience"
                >
                  <Icon.Plus className="w-8 h-8" />
                  <span className="font-medium">Add Experience</span>
                </button>
              </Reveal>
            )}
          </main>
        )}

        {/* Add New Experience Button for List View */}
        {owner && viewMode === "list" && filteredAndSortedItems.length > 0 && (
          <Reveal delay={300}>
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => navigate("/experience/new")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Icon.Plus className="w-5 h-5" />
                Add New Experience
              </button>
            </div>
          </Reveal>
        )}
      </div>

      {/* Fixed Dark Mode Text Visibility - ALL TEXT ELEMENTS */}
      <style>{`
        /* Base experience content styling */
        .experience-content {
          line-height: 1.6;
        }

        /* Light mode: Dark text for content */
        .experience-content,
        .experience-content *,
        .experience-content p,
        .experience-content div,
        .experience-content span,
        .experience-content li,
        .experience-content strong,
        .experience-content em,
        .experience-content .experience-paragraph,
        .experience-content .experience-text,
        .experience-content .experience-list-item {
          color: rgb(55 65 81) !important; /* gray-700 for light mode */
        }

        /* Dark mode: White text for ALL elements in experience cards */
        html.dark .experience-card,
        html.dark .experience-card *,
        html.dark .experience-card h1,
        html.dark .experience-card h2, 
        html.dark .experience-card h3,
        html.dark .experience-card h4,
        html.dark .experience-card h5,
        html.dark .experience-card h6,
        html.dark .experience-card p,
        html.dark .experience-card div,
        html.dark .experience-card span,
        html.dark .experience-card li,
        html.dark .experience-card strong,
        html.dark .experience-card em,
        html.dark .experience-card .text-lg,
        html.dark .experience-card .text-sm,
        html.dark .experience-card .text-xs,
        html.dark .experience-card .font-bold,
        html.dark .experience-card .font-medium,
        html.dark .experience-card .text-gray-900,
        html.dark .experience-card .text-gray-700,
        html.dark .experience-card .text-gray-600,
        html.dark .experience-card .text-gray-500,
        html.dark .experience-card .text-gray-400,
        html.dark .experience-card .text-gray-300,
        body.dark .experience-card,
        body.dark .experience-card *,
        body.dark .experience-card h1,
        body.dark .experience-card h2,
        body.dark .experience-card h3,
        body.dark .experience-card h4,
        body.dark .experience-card h5,
        body.dark .experience-card h6,
        body.dark .experience-card p,
        body.dark .experience-card div,
        body.dark .experience-card span,
        body.dark .experience-card li,
        body.dark .experience-card strong,
        body.dark .experience-card em,
        body.dark .experience-card .text-lg,
        body.dark .experience-card .text-sm,
        body.dark .experience-card .text-xs,
        body.dark .experience-card .font-bold,
        body.dark .experience-card .font-medium,
        body.dark .experience-card .text-gray-900,
        body.dark .experience-card .text-gray-700,
        body.dark .experience-card .text-gray-600,
        body.dark .experience-card .text-gray-500,
        body.dark .experience-card .text-gray-400,
        body.dark .experience-card .text-gray-300,
        .dark .experience-card,
        .dark .experience-card *,
        .dark .experience-card h1,
        .dark .experience-card h2,
        .dark .experience-card h3,
        .dark .experience-card h4,
        .dark .experience-card h5,
        .dark .experience-card h6,
        .dark .experience-card p,
        .dark .experience-card div,
        .dark .experience-card span,
        .dark .experience-card li,
        .dark .experience-card strong,
        .dark .experience-card em,
        .dark .experience-card .text-lg,
        .dark .experience-card .text-sm,
        .dark .experience-card .text-xs,
        .dark .experience-card .font-bold,
        .dark .experience-card .font-medium,
        .dark .experience-card .text-gray-900,
        .dark .experience-card .text-gray-700,
        .dark .experience-card .text-gray-600,
        .dark .experience-card .text-gray-500,
        .dark .experience-card .text-gray-400,
        .dark .experience-card .text-gray-300 {
          color: rgb(255 255 255) !important; /* white for dark mode */
        }

        /* Keep blue colors for duration and links in dark mode */
        html.dark .experience-card .text-blue-600,
        html.dark .experience-card .text-blue-400,
        body.dark .experience-card .text-blue-600,
        body.dark .experience-card .text-blue-400,
        .dark .experience-card .text-blue-600,
        .dark .experience-card .text-blue-400 {
          color: rgb(96 165 250) !important; /* keep blue-400 in dark mode */
        }

        /* Fix tool/skill tags in dark mode - make them visible */
        html.dark .experience-card .bg-gray-100,
        body.dark .experience-card .bg-gray-100,
        .dark .experience-card .bg-gray-100 {
          background-color: rgb(55 65 81) !important; /* gray-700 background */
          color: rgb(255 255 255) !important; /* white text */
        }

        html.dark .experience-card .text-gray-700,
        body.dark .experience-card .text-gray-700,
        .dark .experience-card .text-gray-700 {
          color: rgb(255 255 255) !important; /* white text */
        }

        /* Fix edit/delete buttons in dark mode */
        html.dark .owner-actions button,
        html.dark .owner-actions button *,
        body.dark .owner-actions button,
        body.dark .owner-actions button *,
        .dark .owner-actions button,
        .dark .owner-actions button * {
          color: rgb(255 255 255) !important;
        }

        html.dark .owner-actions .bg-white\/95,
        html.dark .owner-actions .bg-white,
        body.dark .owner-actions .bg-white\/95, 
        body.dark .owner-actions .bg-white,
        .dark .owner-actions .bg-white\/95,
        .dark .owner-actions .bg-white {
          background-color: rgb(55 65 81) !important; /* gray-700 */
          color: rgb(255 255 255) !important;
        }

        /* Status badges in dark mode */
        html.dark .bg-green-100,
        body.dark .bg-green-100,
        .dark .bg-green-100 {
          background-color: rgb(6 78 59) !important; /* green-900 */
          color: rgb(167 243 208) !important; /* green-200 */
        }

        html.dark .text-green-700,
        body.dark .text-green-700,
        .dark .text-green-700 {
          color: rgb(167 243 208) !important; /* green-200 */
        }

        /* Project badges in dark mode */
        html.dark .bg-indigo-50,
        body.dark .bg-indigo-50,
        .dark .bg-indigo-50 {
          background-color: rgb(49 46 129) !important; /* indigo-900 */
          color: rgb(196 181 253) !important; /* indigo-200 */
        }

        html.dark .text-indigo-700,
        body.dark .text-indigo-700,
        .dark .text-indigo-700 {
          color: rgb(196 181 253) !important; /* indigo-200 */
        }

        /* Completed status badges */
        html.dark .bg-gray-100.text-gray-700,
        body.dark .bg-gray-100.text-gray-700,
        .dark .bg-gray-100.text-gray-700 {
          background-color: rgb(55 65 81) !important; /* gray-700 */
          color: rgb(229 231 235) !important; /* gray-200 */
        }

        /* Additional color fixes for various text colors in dark mode */
        html.dark .text-gray-300,
        html.dark .text-gray-600,
        html.dark .text-gray-500,
        body.dark .text-gray-300,
        body.dark .text-gray-600, 
        body.dark .text-gray-500,
        .dark .text-gray-300,
        .dark .text-gray-600,
        .dark .text-gray-500 {
          color: rgb(255 255 255) !important; /* white for better visibility */
        }

        /* Links in dark mode */
        html.dark .experience-content a,
        body.dark .experience-content a,
        .dark .experience-content a {
          color: rgb(147 197 253) !important; /* blue-300 */
        }

        /* Emergency override for any remaining invisible text in dark mode */
        html.dark .experience-card .text-gray-900:not(.text-blue-600):not(.text-blue-400):not(.text-green-700):not(.text-indigo-700),
        body.dark .experience-card .text-gray-900:not(.text-blue-600):not(.text-blue-400):not(.text-green-700):not(.text-indigo-700),
        .dark .experience-card .text-gray-900:not(.text-blue-600):not(.text-blue-400):not(.text-green-700):not(.text-indigo-700) {
          color: rgb(255 255 255) !important;
        }

        /* Fix Light/Dark mode button text in dark mode */
        html.dark button .text-gray-700,
        body.dark button .text-gray-700,
        .dark button .text-gray-700,
        html.dark .text-gray-700,
        body.dark .text-gray-700,
        .dark .text-gray-700 {
          color: rgb(255 255 255) !important;
        }

        /* Fix all button icons and text in header controls */
        html.dark .flex.flex-wrap.gap-3 button,
        html.dark .flex.flex-wrap.gap-3 button *,
        body.dark .flex.flex-wrap.gap-3 button,
        body.dark .flex.flex-wrap.gap-3 button *,
        .dark .flex.flex-wrap.gap-3 button,
        .dark .flex.flex-wrap.gap-3 button * {
          color: rgb(255 255 255) !important;
        }

        /* Fix download button icon */
        html.dark button[title="Export experience data"] svg,
        html.dark button[aria-label="Export data"] svg,
        body.dark button[title="Export experience data"] svg,
        body.dark button[aria-label="Export data"] svg,
        .dark button[title="Export experience data"] svg,
        .dark button[aria-label="Export data"] svg {
          color: rgb(255 255 255) !important;
          stroke: rgb(255 255 255) !important;
        }

        /* Fix filter button icon */
        html.dark button[aria-expanded] svg,
        html.dark button[title="Toggle filters (Ctrl + /)"] svg,
        body.dark button[aria-expanded] svg,
        body.dark button[title="Toggle filters (Ctrl + /)"] svg,
        .dark button[aria-expanded] svg,
        .dark button[title="Toggle filters (Ctrl + /)"] svg {
          color: rgb(255 255 255) !important;
          stroke: rgb(255 255 255) !important;
        }

        /* Fix edit and delete button icons */
        html.dark .owner-actions button svg,
        body.dark .owner-actions button svg,
        .dark .owner-actions button svg {
          color: rgb(255 255 255) !important;
          stroke: rgb(255 255 255) !important;
        }

        /* Fix all SVG icons in dark mode */
        html.dark svg,
        body.dark svg,
        .dark svg {
          stroke: currentColor !important;
        }

        /* Ensure search input is functional and visible */
        html.dark input[type="text"],
        html.dark input[type="search"],
        html.dark select,
        body.dark input[type="text"],
        body.dark input[type="search"],
        body.dark select,
        .dark input[type="text"],
        .dark input[type="search"],
        .dark select {
          background-color: rgb(55 65 81) !important;
          color: rgb(255 255 255) !important;
          border-color: rgb(75 85 99) !important;
        }

        html.dark input[type="text"]::placeholder,
        html.dark input[type="search"]::placeholder,
        body.dark input[type="text"]::placeholder,
        body.dark input[type="search"]::placeholder,
        .dark input[type="text"]::placeholder,
        .dark input[type="search"]::placeholder {
          color: rgb(156 163 175) !important;
        }

        /* Fix search input focus and interaction */
        html.dark input:focus,
        body.dark input:focus,
        .dark input:focus {
          outline: none !important;
          ring: 2px solid rgb(59 130 246) !important;
          border-color: rgb(59 130 246) !important;
          background-color: rgb(55 65 81) !important;
          color: rgb(255 255 255) !important;
          z-index: 10 !important;
          position: relative !important;
        }

        /* Fix any remaining button text colors */
        html.dark button:not(.bg-blue-500):not(.bg-blue-600) *,
        body.dark button:not(.bg-blue-500):not(.bg-blue-600) *,
        .dark button:not(.bg-blue-500):not(.bg-blue-600) * {
          color: rgb(255 255 255) !important;
        }

        /* Fix theme toggle button specifically */
        html.dark button[aria-label*="mode"],
        body.dark button[aria-label*="mode"],
        .dark button[aria-label*="mode"] {
          color: rgb(255 255 255) !important;
        }

        /* Fix all text in buttons and controls */
        html.dark .container button,
        html.dark .container button *,
        body.dark .container button,
        body.dark .container button *,
        .dark .container button,
        .dark .container button * {
          color: rgb(255 255 255) !important;
        }

        /* Override any conflicting Tailwind classes */
        html.dark .text-gray-600,
        html.dark .text-gray-500,
        html.dark .text-gray-400,
        body.dark .text-gray-600,
        body.dark .text-gray-500,
        body.dark .text-gray-400,
        .dark .text-gray-600,
        .dark .text-gray-500,
        .dark .text-gray-400 {
          color: rgb(255 255 255) !important;
        }

        /* Ensure input elements are above other content */
        input[type="text"],
        input[type="search"],
        select {
          position: relative;
          z-index: 1;
        }

        /* List styling */
        .experience-content .experience-list {
          list-style-position: inside;
          margin: 1rem 0;
          padding-left: 1rem;
        }

        .experience-content .experience-list ul {
          list-style-type: disc;
        }

        .experience-content .experience-list ol {
          list-style-type: decimal;
        }

        .experience-content .experience-list-item {
          display: list-item;
          margin: 0.25rem 0;
          line-height: 1.5;
        }

        .experience-content .experience-paragraph {
          margin: 0.5rem 0;
        }

        /* Code blocks */
        .experience-content code {
          background: rgb(243 244 246);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace;
          font-size: 0.875em;
          color: rgb(55 65 81) !important;
        }

        html.dark .experience-content code,
        body.dark .experience-content code,
        .dark .experience-content code {
          background: rgb(55 65 81) !important;
          color: rgb(255 255 255) !important;
        }

        /* Links */
        .experience-content a {
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: opacity 0.2s ease;
          color: rgb(37 99 235) !important; /* blue-600 */
        }

        html.dark .experience-content a,
        body.dark .experience-content a,
        .dark .experience-content a {
          color: rgb(147 197 253) !important; /* blue-300 */
        }

        .experience-content a:hover {
          opacity: 0.8;
        }

        /* Focus states */
        .experience-card:focus-within {
          outline: 2px solid rgb(59 130 246);
          outline-offset: 2px;
        }

        /* Transitions */
        .experience-content * {
          transition: color 0.2s ease;
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .experience-content * {
            transition: none !important;
          }
        }

        /* Print styles */
        @media print {
          .experience-card {
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #ccc !important;
          }
          
          .owner-actions {
            display: none !important;
          }
          
          .experience-content,
          .experience-content * {
            color: black !important;
            background: transparent !important;
          }
        }
      `}</style>
    </section>
  );
}