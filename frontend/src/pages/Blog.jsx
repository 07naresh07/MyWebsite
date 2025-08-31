// src/pages/Blog.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPosts, deletePost } from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";
import Reveal from "../components/Reveal.jsx";

/* ---------------- Local store ---------------- */
const LS_KEY = "localBlogs";
const VIEW_PREFS_KEY = "blogViewPrefs";
const FILTERS_KEY = "blogFilters";
const THEME_KEY = "blog_theme";            // NEW: unified theme key ("dark" | "light")

const readLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const writeLocal = (rows) => localStorage.setItem(LS_KEY, JSON.stringify(rows));
const removeLocal = (id) => {
  writeLocal(readLocal().filter((r) => String(r.id) !== String(id)));
  return true;
};
const getViewPrefs = () => {
  try {
    const prefs = localStorage.getItem(VIEW_PREFS_KEY);
    return prefs ? JSON.parse(prefs) : {};
  } catch {
    return {};
  }
};
const setViewPrefs = (prefs) => {
  localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs));
};

/* Merge keys + local removal by id or slug */
const keyOf = (p) => String(p?.slug || p?.id);
const removeLocalBySlugOrId = (slugOrId) => {
  const rows = readLocal();
  const next = rows.filter(
    (r) => String(r.id) !== String(slugOrId) && String(r.slug) !== String(slugOrId)
  );
  writeLocal(next);
  return true;
};

/* ---------------- Helpers ---------------- */
const slugify = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const toHtml = (v) =>
  Array.isArray(v)
    ? v.map((p) => `<p>${p}</p>`).join("")
    : `<p>${String(v || "").replace(/\n{2,}/g, "</p><p>")}</p>`;

const clampAccent = (hex) =>
  /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex || "") ? hex : "#4f46e5";

/* Pick the saved theme immediately (prevents flash) */
function getInitialTheme() {
  try {
    const explicit = localStorage.getItem(THEME_KEY);
    if (explicit === "dark" || explicit === "light") return explicit;
    // Back-compat with old boolean key
    const legacy = localStorage.getItem("blogDarkMode");
    if (legacy === "true" || legacy === "false") return legacy === "true" ? "dark" : "light";
    // Fall back to system
    const mql = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return mql ? "dark" : "light";
  } catch {
    return "light";
  }
}

/* Enhanced snippet function with better truncation */
function snippetHtml(html, maxChars = 280) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
    const allowed = new Set(["P","UL","OL","LI","STRONG","EM","U","BR","SPAN","B","I","H1","H2","H3"]);
    const out = [];
    let count = 0;
    const walk = (node) => {
      for (const n of Array.from(node.childNodes)) {
        if (count >= maxChars) break;
        if (n.nodeType === 3) {
          const t = n.nodeValue || "";
          const space = Math.min(maxChars - count, t.length);
          out.push(t.slice(0, space));
          count += space;
        } else if (n.nodeType === 1 && allowed.has(n.tagName)) {
          const tag = n.tagName.toLowerCase();
          out.push(`<${tag}>`);
          walk(n);
          out.push(`</${tag}>`);
        } else if (n.nodeType === 1) {
          walk(n); // skip tag but keep children
        }
        if (count >= maxChars) break;
      }
    };
    walk(doc.body);
    const result = out.join("");
    return result.length >= maxChars ? result + "..." : result;
  } catch {
    const txt = (html || "").replace(/<[^>]+>/g, "");
    return txt.length > maxChars ? txt.slice(0, maxChars) + "..." : txt;
  }
}

/* Reading time estimator */
const estimateReadingTime = (html) => {
  const text = (html || "").replace(/<[^>]*>/g, "");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200)); // 200 WPM
};

/* Modern Icons */
const Icons = {
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Grid: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  List: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  Card: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Delete: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Tag: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Clear: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

export default function Blog() {
  const nav = useNavigate();
  const { owner } = useOwnerMode();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  /* ================= THEME: sticky and global ================= */
  const [theme, setTheme] = useState(getInitialTheme);   // "dark" | "light"
  const darkMode = theme === "dark";

  // Apply to <html> and persist (also update old boolean key for compatibility)
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem("blogDarkMode", theme === "dark" ? "true" : "false");
    } catch {}
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  /* ================= Filters (persist between visits) ================= */
  const initialFilters = (() => {
    try {
      return JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}");
    } catch {
      return {};
    }
  })();

  const [q, setQ] = useState(initialFilters.q || "");
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || "newest");
  const [selectedTag, setSelectedTag] = useState(initialFilters.selectedTag || "");

  useEffect(() => {
    try {
      localStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({ q, sortBy, selectedTag })
      );
    } catch {}
  }, [q, sortBy, selectedTag]);

  /* ================= View prefs (already persisted) ================= */
  const [viewMode, setViewMode] = useState(getViewPrefs().viewMode || "grid");
  const [gridCols, setGridCols] = useState(getViewPrefs().gridCols || 2);
  const [showFilters, setShowFilters] = useState(false);
  const [compactMode, setCompactMode] = useState(getViewPrefs().compactMode || false);

  const [openSug, setOpenSug] = useState(false);
  const sugWrapRef = useRef(null);

  const updateViewPrefs = useCallback((updates) => {
    const currentPrefs = getViewPrefs();
    const newPrefs = { ...currentPrefs, ...updates };
    setViewPrefs(newPrefs);
  }, []);
  useEffect(() => { updateViewPrefs({ viewMode }); }, [viewMode, updateViewPrefs]);
  useEffect(() => { updateViewPrefs({ gridCols }); }, [gridCols, updateViewPrefs]);
  useEffect(() => { updateViewPrefs({ compactMode }); }, [compactMode, updateViewPrefs]);

  // Close suggestions on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (sugWrapRef.current && !sugWrapRef.current.contains(e.target)) setOpenSug(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Load posts: API + local (local wins, dedupe by slug)
  const reloadPosts = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const api = await getPosts({ page: 1, pageSize: 100 }).catch(() => ({ items: [] }));
      const apiItems = (api?.items || []).map((x) => {
        const title = x.title || "Untitled";
        const bodyHtml = x.content || x.bodyHtml || x.body_html || x.body || (x.excerpt ? toHtml(x.excerpt) : "");
        return {
          id: x.id ?? x.slug ?? slugify(title),
          slug: x.slug || slugify(title),
          title,
          bodyHtml,
          content: bodyHtml,
          tags: Array.isArray(x.tags) ? x.tags : [],
          color: x.color || "#4f46e5",
          theme: x.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 },
          createdAt: x.createdAt || x.publishedAt || new Date().toISOString(),
        };
      });

      const local = readLocal();

      // Dedup by slug/id, local overrides API
      const map = new Map();
      apiItems.forEach((p) => map.set(keyOf(p), p));
      local.forEach((p) =>
        map.set(keyOf(p), {
          ...map.get(keyOf(p)),
          ...p,
          createdAt: p.createdAt || new Date().toISOString(),
        })
      );

      const merged = Array.from(map.values());
      setItems(merged);

      // Prune local drafts that now exist on server
      const apiSlugs = new Set(apiItems.map((p) => p.slug));
      const cleaned = local.filter((r) => !apiSlugs.has(r.slug));
      if (cleaned.length !== local.length) writeLocal(cleaned);
    } catch (e) {
      setErr(e?.message || "Failed to load blog");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    reloadPosts();
  }, [reloadPosts]);

  // Refresh when localStorage changes or when tab refocuses
  useEffect(() => {
    const onStorage = (e) => { if (e.key === LS_KEY) reloadPosts(); };
    const onFocus = () => reloadPosts();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [reloadPosts]);

  // Tags with counts
  const allTags = useMemo(() => {
    const tagCounts = {};
    items.forEach((p) => (p.tags || []).forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  // Filtered + sorted
  const processedItems = useMemo(() => {
    let filtered = items;
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        const hay = `${p.title} ${(p.tags || []).join(" ")}`.toLowerCase();
        return hay.includes(k);
      });
    }
    if (selectedTag) filtered = filtered.filter((p) => (p.tags || []).includes(selectedTag));
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "title":
          return a.title.localeCompare(b.title);
        case "newest":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    return filtered;
  }, [items, q, selectedTag, sortBy]);

  // Smart suggestions
  const suggestions = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return allTags.slice(0, 6).map((t) => ({ type: "tag", label: t.tag }));
    const titleHits = items
      .filter((p) => p.title.toLowerCase().includes(k))
      .slice(0, 3)
      .map((p) => ({ type: "title", label: p.title, slug: p.slug || p.id }));
    const tagHits = allTags
      .filter(({ tag }) => tag.toLowerCase().includes(k))
      .slice(0, 3)
      .map(({ tag }) => ({ type: "tag", label: tag }));
    return [...titleHits, ...tagHits].slice(0, 6);
  }, [q, items, allTags]);

  const onDelete = useCallback(
    async (idOrSlug) => {
      if (!owner) return;
      if (!confirm("Delete this blog post?")) return;
      try {
        await deletePost(idOrSlug).catch(() => {}); // 404 okay for local-only drafts
      } finally {
        removeLocalBySlugOrId(idOrSlug);
        setItems((prev) =>
          prev.filter(
            (p) => String(p.id) !== String(idOrSlug) && String(p.slug) !== String(idOrSlug)
          )
        );
      }
    },
    [owner]
  );

  const clearFilters = () => {
    setQ("");
    setSelectedTag("");
  };

  if (loading) {
    return (
      <section
        className={`min-h-screen transition-colors duration-300 ${
          darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-slate-50 to-blue-50"
        }`}
      >
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
              <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} animate-pulse`}>
                Loading amazing content...
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`min-h-screen transition-all duration-300 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-slate-50 to-blue-50"
      }`}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-3">
                <div className="relative">
                  <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                    Blog
                  </h1>
                  <div className="absolute -bottom-2 left-0 w-16 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                </div>
              </div>

              <div
                className={`flex flex-wrap items-center gap-4 text-sm ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Icons.Tag />
                  <span className="font-medium">
                    {items.length} {items.length === 1 ? "post" : "posts"}
                  </span>
                </div>
                {processedItems.length !== items.length && (
                  <div className="flex items-center space-x-1">
                    <Icons.Filter />
                    <span>{processedItems.length} filtered</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Icons.Calendar />
                  <span>Updated {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`px-4 py-2 rounded-full border transition-colors ${
                darkMode
                  ? "border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
                  : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
              }`}
              title="Toggle theme"
            >
              {darkMode ? "🌙 Dark" : "☀️ Light"} Mode
            </button>
          </div>

          {err && (
            <div
              className={`mb-6 p-4 rounded-2xl border ${
                darkMode
                  ? "bg-red-900/20 border-red-800 text-red-300"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">
                  !
                </div>
                <span className="font-medium">{err}</span>
              </div>
            </div>
          )}
        </div>

        {/* Search & Controls */}
        <div className="mb-8">
          <div
            className={`backdrop-blur-xl rounded-3xl border p-6 shadow-xl ${
              darkMode ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-gray-200"
            }`}
          >
            {/* Search Bar */}
            <div className="relative mb-6" ref={sugWrapRef}>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? "text-gray-300" : "text-gray-400"}`}>
                  <Icons.Search />
                </div>
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOpenSug(true);
                  }}
                  onFocus={() => setOpenSug(true)}
                  placeholder="Search posts, tags, or content..."
                  className={`w-full h-14 rounded-2xl border-2 pl-12 pr-4 text-lg font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white ${
                    darkMode
                      ? "border-gray-600 bg-gray-700 text-gray-100 focus:ring-indigo-900/50 focus:bg-gray-800"
                      : "border-gray-200 bg-gray-50 text-gray-800"
                  }`}
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                      darkMode ? "hover:bg-gray-600 text-gray-200" : "hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    <Icons.Clear />
                  </button>
                )}
              </div>

              {/* Suggestions */}
              {openSug && suggestions.length > 0 && (
                <div
                  className={`absolute z-30 mt-2 w-full rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl ${
                    darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}
                >
                  {suggestions.map((sug, i) => (
                    <button
                      key={i}
                      className={`w-full text-left px-6 py-4 flex items-center gap-3 transition-all duration-150 group ${
                        darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        if (sug.type === "title" && sug.slug) {
                          setOpenSug(false);
                          setQ("");
                          nav(`/blog/${sug.slug}`);
                        } else {
                          setQ(sug.label);
                          setOpenSug(false);
                        }
                      }}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform ${
                          darkMode ? "bg-indigo-900/50 text-indigo-400" : "bg-indigo-100"
                        }`}
                      >
                        {sug.type === "tag" ? <Icons.Tag /> : <Icons.ArrowRight />}
                      </div>
                      <div className="flex-1">
                        <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? "text-indigo-400" : "text-indigo-500"}`}>
                          {sug.type}
                        </div>
                        <div className={`font-medium truncate ${darkMode ? "text-gray-100" : "text-gray-800"}`}>{sug.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`appearance-none pr-9 pl-4 py-2 rounded-xl border font-medium text-sm transition-colors focus:border-indigo-500 focus:ring-2 ${
                      darkMode
                        ? "border-gray-600 bg-gray-700 text-gray-100 focus:ring-indigo-800"
                        : "border-gray-300 bg-gray-50 text-gray-800 focus:ring-indigo-200"
                    }`}
                  >
                    <option value="newest">🕐 Newest first</option>
                    <option value="oldest">📅 Oldest first</option>
                    <option value="title">🔤 By title</option>
                  </select>
                  <span
                    className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    <Icons.ChevronDown />
                  </span>
                </div>

                <div
                  className={`flex rounded-xl overflow-hidden ${
                    darkMode ? "border border-gray-600 bg-gray-700" : "border border-gray-300 bg-gray-50"
                  }`}
                >
                  {[
                    { mode: "grid", icon: Icons.Grid, label: "Grid" },
                    { mode: "list", icon: Icons.List, label: "List" },
                    { mode: "card", icon: Icons.Card, label: "Cards" },
                  ].map(({ mode, icon: IconComponent, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        viewMode === mode
                          ? "bg-indigo-600 text-white shadow-lg"
                          : darkMode
                          ? "text-gray-200 hover:bg-gray-600"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      title={label}
                    >
                      <IconComponent />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {viewMode === "grid" && (
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Columns:</span>
                    <div className={`flex rounded-lg overflow-hidden ${darkMode ? "border border-gray-600" : "border border-gray-300"}`}>
                      {[1, 2, 3, 4].map((cols) => (
                        <button
                          key={cols}
                          onClick={() => setGridCols(cols)}
                          className={`px-3 py-1 text-sm font-medium transition-colors ${
                            gridCols === cols
                              ? "bg-indigo-600 text-white"
                              : darkMode
                              ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {cols}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Compact</span>
                  <div
                    role="switch"
                    aria-checked={compactMode}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setCompactMode((v) => !v)}
                    className={`relative w-12 h-7 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      compactMode ? "bg-indigo-600" : darkMode ? "bg-gray-600" : "bg-gray-300"
                    }`}
                    onClick={() => setCompactMode((v) => !v)}
                  >
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 left-0.5 h-6 w-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        compactMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                    showFilters || selectedTag
                      ? "bg-indigo-600 text-white shadow-lg"
                      : darkMode
                      ? "bg-gray-700 text-gray-100 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  <Icons.Filter />
                  <span>Filters</span>
                  {allTags.length > 0 && (
                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{allTags.length}</span>
                  )}
                </button>

                {(q || selectedTag) && (
                  <button
                    onClick={clearFilters}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                      darkMode
                        ? "bg-red-900/30 text-red-300 hover:bg-red-900/50"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    <Icons.Clear />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {(showFilters || selectedTag) && allTags.length > 0 && (
              <div className={`mt-6 pt-6 ${darkMode ? "border-t border-gray-700" : "border-t border-gray-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold flex items-center space-x-2 ${darkMode ? "text-gray-100" : "text-gray-800"}`}>
                    <Icons.Tag />
                    <span>Filter by Tags</span>
                  </h3>
                  {selectedTag && (
                    <button
                      onClick={() => setSelectedTag("")}
                      className={`text-sm font-medium ${
                        darkMode
                          ? "text-indigo-400 hover:text-indigo-300"
                          : "text-indigo-600 hover:text-indigo-800"
                      }`}
                    >
                      Show all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 12).map(({ tag, count }) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                      className={`group relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedTag === tag
                          ? "bg-indigo-600 text-white shadow-lg scale-105"
                          : darkMode
                          ? "bg-gray-700 text-gray-100 hover:bg-indigo-900/50 hover:scale-105"
                          : "bg-gray-100 text-gray-800 hover:bg-indigo-100 hover:scale-105"
                      }`}
                    >
                      <span>{tag}</span>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                          selectedTag === tag
                            ? "bg-white/20"
                            : darkMode
                            ? "bg-gray-600 text-gray-200"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                  {allTags.length > 12 && (
                    <span className={`${darkMode ? "text-gray-300" : "text-gray-600"} px-4 py-2 text-sm`}>
                      +{allTags.length - 12} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Posts Display */}
        <div
          className={`transition-all duration-300 ${
            viewMode === "grid"
              ? `grid gap-6 ${
                  gridCols === 1
                    ? "grid-cols-1"
                    : gridCols === 2
                    ? "grid-cols-1 lg:grid-cols-2"
                    : gridCols === 3
                    ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                }`
              : viewMode === "list"
              ? "space-y-4"
              : "grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {processedItems.map((p) => {
            const tint = clampAccent(p.color);
            const fontFamily = p?.theme?.fontFamily || "";
            const basePx = p?.theme?.basePx || 16;
            const readingTime = estimateReadingTime(p.bodyHtml);

            return (
              <Reveal key={p.id}>
                <article
                  className={`group relative backdrop-blur-sm rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
                    darkMode
                      ? "bg-gray-800/80 border-gray-700 hover:border-indigo-600"
                      : "bg-white/80 border-gray-200 hover:border-indigo-300"
                  } ${viewMode === "list" ? "flex flex-col md:flex-row" : "flex flex-col"} ${
                    compactMode ? "p-4" : "p-6"
                  }`}
                >
                  <div className={`flex-1 ${viewMode === "list" ? "md:pr-6" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <Link
                        to={`/blog/${p.slug}`}
                        className={`group-hover:text-opacity-80 transition-all duration-200 ${
                          compactMode ? "text-lg" : "text-xl md:text-2xl"
                        } font-bold leading-tight`}
                        style={{ color: tint, fontFamily }}
                      >
                        {p.title}
                      </Link>

                      {owner && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            title="Edit post"
                            onClick={() => nav(`/blog/edit/${encodeURIComponent(p.id)}`)}
                            className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${
                              darkMode
                                ? "bg-gray-700 text-gray-200 hover:bg-indigo-900/50 hover:text-indigo-400"
                                : "bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-600"
                            }`}
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            title="Delete post"
                            onClick={() => onDelete(p.id)}
                            className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${
                              darkMode
                                ? "bg-gray-700 text-gray-200 hover:bg-red-900/50 hover:text-red-300"
                                : "bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-600"
                            }`}
                          >
                            <Icons.Delete />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={`flex flex-wrap items-center gap-4 mb-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                      <div className="flex items-center space-x-1">
                        <Icons.Clock />
                        <span>{readingTime} min read</span>
                      </div>
                      {p.createdAt && (
                        <div className="flex items-center space-x-1">
                          <Icons.Calendar />
                          <span>
                            {new Date(p.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {(p.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(p.tags || []).slice(0, compactMode ? 2 : 4).map((tag, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedTag(tag)}
                            className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 ${
                              darkMode
                                ? "bg-gray-700 text-gray-100 hover:bg-indigo-900/50 hover:text-indigo-300"
                                : "bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700"
                            }`}
                          >
                            <Icons.Tag />
                            <span>{tag}</span>
                          </button>
                        ))}
                        {(p.tags || []).length > (compactMode ? 2 : 4) && (
                          <span className={`${darkMode ? "text-gray-300" : "text-gray-600"} px-3 py-1 text-xs`}>
                            +{(p.tags || []).length - (compactMode ? 2 : 4)} more
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className={`prose prose-sm max-w-none mb-4 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      } ${viewMode === "list" ? "line-clamp-2" : compactMode ? "line-clamp-3" : "line-clamp-4"}`}
                      style={{ fontFamily, fontSize: Math.max(14, basePx - 2) }}
                      dangerouslySetInnerHTML={{
                        __html: snippetHtml(p.bodyHtml, viewMode === "list" ? 150 : compactMode ? 200 : 280),
                      }}
                    />

                    <Link
                      to={`/blog/${p.slug}`}
                      className={`inline-flex items-center space-x-2 font-semibold transition-all duration-200 group-hover:translate-x-1 ${
                        darkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-800"
                      }`}
                    >
                      <span>Read full article</span>
                      <Icons.ArrowRight />
                    </Link>
                  </div>

                  <div
                    className="absolute bottom-0 left-0 w-full h-1 rounded-b-3xl opacity-70"
                    style={{ background: `linear-gradient(90deg, ${tint}, transparent)` }}
                  />
                </article>
              </Reveal>
            );
          })}

          {/* Add New Post Card */}
          {owner && (
            <Reveal>
              <button
                onClick={() => nav("/blog/edit/new")}
                className={`group relative backdrop-blur-sm rounded-3xl border-2 border-dashed transition-all duration-300 hover:shadow-xl hover:-translate-y-1 p-8 min-h-[200px] flex flex-col items-center justify-center ${
                  darkMode
                    ? "bg-gray-800/50 border-gray-600 hover:border-indigo-500 text-gray-200 hover:bg-gray-800"
                    : "bg-white/50 border-gray-300 hover:border-indigo-400 text-gray-600 hover:bg-white"
                }`}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-200 shadow-lg">
                    <Icons.Plus />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg mb-1">Create New Post</div>
                    <div className="text-sm opacity-70">Share your thoughts with the world</div>
                  </div>
                </div>
              </button>
            </Reveal>
          )}
        </div>

        {/* Empty State */}
        {processedItems.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div
                className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                  darkMode ? "bg-indigo-900/30" : "bg-gradient-to-br from-indigo-100 to-purple-100"
                }`}
              >
                <div className={`${darkMode ? "text-gray-500" : "text-gray-400"} w-12 h-12`}>
                  <Icons.Search />
                </div>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? "text-gray-100" : "text-gray-800"}`}>
                {q || selectedTag ? "No posts match your filters" : "No blog posts yet"}
              </h3>
              <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} mb-6`}>
                {q || selectedTag
                  ? "Try adjusting your search terms or filters to find what you're looking for."
                  : "This is where amazing stories will live."}
              </p>
              {q || selectedTag ? (
                <button
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                  onClick={clearFilters}
                >
                  <Icons.Clear />
                  <span>Clear filters</span>
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Footer Stats */}
        {processedItems.length > 0 && (
          <div className={`mt-12 pt-8 ${darkMode ? "border-t border-gray-700" : "border-t border-gray-200"}`}>
            <div className={`flex flex-wrap items-center justify-between gap-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              <div className="flex items-center space-x-6">
                <span>
                  Showing {processedItems.length} of {items.length} posts
                </span>
                {allTags.length > 0 && <span>{allTags.length} unique tags</span>}
              </div>
              <div className="flex items-center space-x-2">
                <span>View:</span>
                <span className="font-medium capitalize">{viewMode}</span>
                {viewMode === "grid" && (
                  <span className={`${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                    ({gridCols} {gridCols === 1 ? "column" : "columns"})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx>{`
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
        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .prose li::marker { color: currentColor; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.5); }
      `}</style>
    </section>
  );
}
