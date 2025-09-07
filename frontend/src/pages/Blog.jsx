import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPosts, deletePost } from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";
import Reveal from "../components/Reveal.jsx";

/* ---------------- Local Storage Keys ---------------- */
const LS_KEY = "localBlogs";
const THEME_KEY = "blog_theme";
const VIEW_MODE_KEY = "blog_view_mode";
const BOOKMARKS_KEY = "blog_bookmarks";
const READING_PROGRESS_KEY = "blog_reading_progress";
const RECENT_READS_KEY = "blog_recent_reads";

/* ---------------- Helper Functions ---------------- */
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

const keyOf = (p) => String(p?.slug || p?.id);

const removeLocalBySlugOrId = (slugOrId) => {
  const rows = readLocal();
  const next = rows.filter(
    (r) => String(r.id) !== String(slugOrId) && String(r.slug) !== String(slugOrId)
  );
  writeLocal(next);
  return true;
};

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
  /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex || "") ? hex : "#6366f1";

/* Smart Reading Utilities */
const getReadingProgress = () => {
  try {
    return JSON.parse(localStorage.getItem(READING_PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
};

const setReadingProgress = (postId, progress) => {
  const current = getReadingProgress();
  localStorage.setItem(
    READING_PROGRESS_KEY,
    JSON.stringify({ ...current, [postId]: { progress, timestamp: Date.now() } })
  );
};

const getBookmarks = () => {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
  } catch {
    return [];
  }
};

const toggleBookmark = (postId) => {
  const bookmarks = getBookmarks();
  const updated = bookmarks.includes(postId)
    ? bookmarks.filter(id => id !== postId)
    : [...bookmarks, postId];
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  return updated.includes(postId);
};

const getRecentReads = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_READS_KEY) || "[]");
  } catch {
    return [];
  }
};

const addToRecentReads = (postId) => {
  const recent = getRecentReads().filter(id => id !== postId);
  const updated = [postId, ...recent].slice(0, 5);
  localStorage.setItem(RECENT_READS_KEY, JSON.stringify(updated));
};

function getInitialTheme() {
  try {
    const explicit = localStorage.getItem(THEME_KEY);
    if (explicit === "dark" || explicit === "light") return explicit;
    const legacy = localStorage.getItem("blogDarkMode");
    if (legacy === "true" || legacy === "false") return legacy === "true" ? "dark" : "light";
    const mql = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return mql ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getInitialViewMode() {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved && ["grid", "list", "magazine"].includes(saved)) return saved;
    return "grid";
  } catch {
    return "grid";
  }
}

function createSnippet(html, maxChars = 200) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
    const text = doc.body.textContent || "";
    return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
  } catch {
    const text = (html || "").replace(/<[^>]+>/g, "");
    return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
  }
}

const estimateReadingTime = (html) => {
  const text = (html || "").replace(/<[^>]*>/g, "");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
};

const getTimeAgo = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/* Modern Icons */
const Icons = {
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  BookmarkEmpty: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  ),
  BookmarkFilled: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
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
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
  Magazine: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  History: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Clear: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Pencil: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
};

export default function Blog() {
  const nav = useNavigate();
  const { owner } = useOwnerMode();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(false);

  /* Theme Management */
  const [theme, setTheme] = useState(getInitialTheme);
  const darkMode = theme === "dark";

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem("blogDarkMode", theme === "dark" ? "true" : "false");
    } catch {}
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Persist view mode
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  /* Smart State Management */
  const [bookmarks, setBookmarks] = useState(getBookmarks);
  const [recentReads, setRecentReads] = useState(getRecentReads);
  const [readingProgress] = useState(getReadingProgress);

  // Load posts: API + local (restored from original)
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
          color: x.color || "#6366f1",
          theme: x.theme || { fontFamily: "Inter", basePx: 16, headingScale: 1.15 },
          createdAt: x.createdAt || x.publishedAt || new Date().toISOString(),
        };
      });

      const local = readLocal();

      // Dedup by slug/id, local overrides API (restored from original)
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

      // Prune local drafts that now exist on server (restored from original)
      const apiSlugs = new Set(apiItems.map((p) => p.slug));
      const cleaned = local.filter((r) => !apiSlugs.has(r.slug));
      if (cleaned.length !== local.length) writeLocal(cleaned);
    } catch (e) {
      setErr(e?.message || "Failed to load blog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadPosts();
  }, [reloadPosts]);

  // Refresh when localStorage changes or when tab refocuses (restored from original)
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

  // Smart filtering and sorting
  const processedItems = useMemo(() => {
    let filtered = items;

    // Apply search
    if (searchQuery.trim()) {
      const k = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        const searchText = `${p.title} ${(p.tags || []).join(" ")} ${createSnippet(p.bodyHtml, 500)}`.toLowerCase();
        return searchText.includes(k);
      });
    }

    // Apply bookmarks filter
    if (showBookmarksOnly) {
      filtered = filtered.filter(p => bookmarks.includes(String(p.id)));
    }

    // Apply recent reads filter
    if (showRecentOnly) {
      filtered = filtered.filter(p => recentReads.includes(String(p.id)));
    }

    // Smart sorting: prioritize recent reads and bookmarked posts
    filtered.sort((a, b) => {
      const aBookmarked = bookmarks.includes(String(a.id));
      const bBookmarked = bookmarks.includes(String(b.id));
      const aRecent = recentReads.includes(String(a.id));
      const bRecent = recentReads.includes(String(b.id));
      
      // Bookmarked posts first
      if (aBookmarked && !bBookmarked) return -1;
      if (!aBookmarked && bBookmarked) return 1;
      
      // Then recent reads
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;
      
      // Finally by date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return filtered;
  }, [items, searchQuery, showBookmarksOnly, showRecentOnly, bookmarks, recentReads]);

  // Calculate reading stats based on actual data
  const readingStats = useMemo(() => {
    const totalReadTime = items.reduce((acc, post) => acc + estimateReadingTime(post.bodyHtml), 0);
    const postsRead = recentReads.length;
    
    return {
      totalPosts: items.length,
      totalReadTime,
      postsRead,
      streak: Math.min(postsRead, 7) // Simple streak calculation
    };
  }, [items, recentReads]);

  // Smart suggestions for empty states
  const smartSuggestions = useMemo(() => {
    if (showBookmarksOnly && bookmarks.length === 0) {
      return { type: "no-bookmarks", message: "No bookmarked posts yet", suggestion: "Start bookmarking posts you want to read later!" };
    }
    if (showRecentOnly && recentReads.length === 0) {
      return { type: "no-recent", message: "No recent reads", suggestion: "Start reading to build your reading history!" };
    }
    if (searchQuery && processedItems.length === 0) {
      return { type: "no-search", message: "No posts found", suggestion: "Try different search terms or browse all posts" };
    }
    if (items.length === 0) {
      return { type: "no-posts", message: "No blog posts yet", suggestion: "Create your first post to get started!" };
    }
    return null;
  }, [showBookmarksOnly, showRecentOnly, searchQuery, processedItems.length, bookmarks.length, recentReads.length, items.length]);

  const handlePostClick = useCallback((post) => {
    addToRecentReads(String(post.id));
    setRecentReads(getRecentReads());
    nav(`/blog/${post.slug}`);
  }, [nav]);

  const handleBookmarkToggle = useCallback((postId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const isBookmarked = toggleBookmark(String(postId));
    setBookmarks(getBookmarks());
    return isBookmarked;
  }, []);

  const handleCreateNew = useCallback(() => {
    // Add a confirmation parameter to help prevent accidental empty posts
    nav("/blog/edit/new?intent=create");
  }, [nav]);

  const onDelete = useCallback(
    async (idOrSlug) => {
      if (!owner) return;
      if (!confirm("Delete this blog post?")) return;
      
      // Check if this is a local-only post
      const isLocalPost = String(idOrSlug).startsWith('local-');
      
      try {
        // Only call API for server posts, skip for local posts
        if (!isLocalPost) {
          await deletePost(idOrSlug);
        }
      } catch (error) {
        // Log error but continue with local removal
        console.warn('Failed to delete from server:', error);
      } finally {
        // Always remove from local storage
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

  if (loading) {
    return (
      <div className={`min-h-screen transition-all duration-500 ${
        darkMode 
          ? "bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900" 
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
      }`}>
        <div className="container mx-auto px-6 py-16">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-8">
              <div className="relative">
                <div className={`w-20 h-20 mx-auto rounded-full border-4 border-transparent ${
                  darkMode ? "border-t-blue-400" : "border-t-indigo-600"
                } animate-spin`}></div>
                <div className={`absolute inset-0 w-20 h-20 mx-auto rounded-full border-4 border-transparent ${
                  darkMode ? "border-r-slate-400" : "border-r-blue-500"
                } animate-spin animate-reverse`} style={{ animationDelay: '0.3s' }}></div>
              </div>
              <div className="space-y-3">
                <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                  Loading Your Stories
                </h2>
                <p className={`${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Preparing amazing content for you...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 relative overflow-hidden ${
      darkMode 
        ? "bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900" 
        : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
    }`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-20 w-72 h-72 rounded-full opacity-20 blur-3xl animate-pulse ${
          darkMode ? "bg-blue-500" : "bg-blue-400"
        }`} style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className={`absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse ${
          darkMode ? "bg-slate-500" : "bg-indigo-400"
        }`} style={{ animationDelay: '2s', animationDuration: '6s' }}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5 blur-3xl animate-spin ${
          darkMode ? "bg-gradient-conic from-blue-400 via-slate-400 to-blue-400" : "bg-gradient-conic from-blue-300 via-indigo-300 to-blue-300"
        }`} style={{ animationDuration: '20s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="mb-16">
          <div className="flex items-start justify-between mb-8">
            <div className="space-y-6">
              <div className="relative">
                <h1 className={`text-5xl md:text-7xl font-black tracking-tight ${
                  darkMode 
                    ? "bg-gradient-to-r from-white via-blue-200 to-slate-300 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-slate-900 via-indigo-800 to-purple-700 bg-clip-text text-transparent"
                }`}>
                  Stories
                </h1>
                <div className={`absolute -bottom-2 left-0 h-1.5 w-24 rounded-full ${
                  darkMode 
                    ? "bg-gradient-to-r from-blue-400 to-slate-600"
                    : "bg-gradient-to-r from-indigo-500 to-purple-600"
                }`}></div>
              </div>
              <p className={`text-lg md:text-xl ${
                darkMode ? "text-slate-300" : "text-slate-600"
              } max-w-2xl leading-relaxed`}>
                Discover ideas, insights, and inspirations through thoughtfully crafted narratives
              </p>

              {/* Reading Stats */}
              <div className={`flex flex-wrap gap-6 ${
                darkMode ? "text-slate-300" : "text-slate-600"
              }`}>
                <div className="flex items-center space-x-2">
                  <Icons.Sparkles />
                  <span className="font-medium">{readingStats.totalPosts} Stories</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icons.Clock />
                  <span className="font-medium">{readingStats.totalReadTime} min total</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icons.TrendingUp />
                  <span className="font-medium">{readingStats.postsRead} read</span>
                </div>
                {readingStats.streak > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-orange-500">🔥</span>
                    <span className="font-medium">{readingStats.streak} day streak</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className={`group relative overflow-hidden px-6 py-3 rounded-2xl transition-all duration-300 hover:scale-105 ${
                darkMode
                  ? "bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20"
                  : "bg-white/70 backdrop-blur-xl border border-white/40 text-slate-800 hover:bg-white/90"
              } shadow-2xl`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{darkMode ? "🌙" : "☀️"}</span>
                <span className="font-medium">{darkMode ? "Dark" : "Light"}</span>
              </div>
            </button>
          </div>

          {err && (
            <div className={`mb-8 p-6 rounded-2xl border backdrop-blur-xl ${
              darkMode
                ? "bg-red-900/30 border-red-700/50 text-red-300"
                : "bg-red-50/80 border-red-200/60 text-red-700"
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
                  !
                </div>
                <span className="font-medium">{err}</span>
              </div>
            </div>
          )}
        </header>

        {/* Smart Search and Controls */}
        <div className="mb-12">
          <div className={`backdrop-blur-xl rounded-3xl border p-8 shadow-2xl ${
            darkMode 
              ? "bg-white/5 border-white/10" 
              : "bg-white/60 border-white/20"
          }`}>
            {/* Enhanced Search */}
            <div className="relative mb-8">
              <div className="relative group">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                  darkMode ? "text-slate-400 group-focus-within:text-blue-400" : "text-slate-500 group-focus-within:text-indigo-600"
                }`}>
                  <Icons.Search />
                </div>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stories, ideas, and inspirations..."
                  className={`w-full h-16 rounded-2xl border-2 pl-14 pr-16 text-lg font-medium transition-all duration-300 focus:scale-[1.02] ${
                    darkMode
                      ? "border-white/20 bg-white/10 text-white placeholder-slate-400 focus:border-blue-400 focus:bg-white/20"
                      : "border-slate-200 bg-white/80 text-slate-800 placeholder-slate-500 focus:border-indigo-500 focus:bg-white"
                  } focus:outline-none focus:ring-4 ${
                    darkMode ? "focus:ring-blue-500/20" : "focus:ring-indigo-500/20"
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={`absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                      darkMode ? "hover:bg-white/20 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icons.Clear />
                  </button>
                )}
              </div>
            </div>

            {/* Smart Controls */}
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* View Mode */}
                <div className={`flex rounded-xl overflow-hidden border ${
                  darkMode ? "border-white/20 bg-white/10" : "border-slate-200 bg-slate-100"
                }`}>
                  {[
                    { mode: "grid", icon: Icons.Grid, label: "Grid" },
                    { mode: "list", icon: Icons.List, label: "List" },
                    { mode: "magazine", icon: Icons.Magazine, label: "Magazine" },
                  ].map(({ mode, icon: IconComponent, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        viewMode === mode
                          ? darkMode
                            ? "bg-blue-500 text-white shadow-lg"
                            : "bg-indigo-600 text-white shadow-lg"
                          : darkMode
                          ? "text-slate-200 hover:bg-white/20"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      <IconComponent />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Smart Filters */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 ${
                      showBookmarksOnly
                        ? darkMode
                          ? "bg-blue-500 text-white"
                          : "bg-indigo-600 text-white"
                        : darkMode
                        ? "bg-white/10 text-slate-200 hover:bg-white/20"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Icons.BookmarkFilled />
                    <span>Bookmarks</span>
                    {bookmarks.length > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        showBookmarksOnly ? "bg-white/20" : darkMode ? "bg-white/20" : "bg-slate-200"
                      }`}>
                        {bookmarks.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setShowRecentOnly(!showRecentOnly)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 ${
                      showRecentOnly
                        ? darkMode
                          ? "bg-blue-500 text-white"
                          : "bg-indigo-600 text-white"
                        : darkMode
                        ? "bg-white/10 text-slate-200 hover:bg-white/20"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Icons.History />
                    <span>Recent</span>
                    {recentReads.length > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        showRecentOnly ? "bg-white/20" : darkMode ? "bg-white/20" : "bg-slate-200"
                      }`}>
                        {recentReads.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-3">
                {(showBookmarksOnly || showRecentOnly || searchQuery) && (
                  <button
                    onClick={() => {
                      setShowBookmarksOnly(false);
                      setShowRecentOnly(false);
                      setSearchQuery("");
                    }}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 ${
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
          </div>
        </div>

        {/* Content Area */}
        {smartSuggestions ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto space-y-8">
              <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${
                darkMode 
                  ? "bg-gradient-to-br from-blue-500/20 to-slate-600/20" 
                  : "bg-gradient-to-br from-indigo-100 to-purple-100"
              }`}>
                <Icons.Sparkles className={`w-16 h-16 ${
                  darkMode ? "text-blue-400" : "text-indigo-500"
                }`} />
              </div>
              <div className="space-y-4">
                <h3 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                  {smartSuggestions.message}
                </h3>
                <p className={`text-lg ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {smartSuggestions.suggestion}
                </p>
                {(showBookmarksOnly || showRecentOnly || searchQuery) && (
                  <button
                    onClick={() => {
                      setShowBookmarksOnly(false);
                      setShowRecentOnly(false);
                      setSearchQuery("");
                    }}
                    className={`inline-flex items-center space-x-2 px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 ${
                      darkMode
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    } shadow-lg hover:shadow-2xl`}
                  >
                    <span>Show All Stories</span>
                    <Icons.ArrowRight />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Create New Button for List Mode - Moved to Top */}
            {owner && viewMode === "list" && (
              <div className="mb-8">
                <Reveal>
                  <button
                    onClick={handleCreateNew}
                    className={`group w-full relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-xl p-6 ${
                      darkMode
                        ? "bg-gradient-to-r from-blue-600/10 to-slate-600/10 border-white/10 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-slate-600/20 hover:border-white/20"
                        : "bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border-white/40 hover:bg-gradient-to-r hover:from-indigo-100/90 hover:to-blue-100/90 hover:border-white/60"
                    }`}
                  >
                    <div className="flex items-center space-x-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                        darkMode 
                          ? "bg-gradient-to-br from-blue-500 to-slate-600"
                          : "bg-gradient-to-br from-indigo-500 to-blue-600"
                      } shadow-lg group-hover:shadow-xl`}>
                        <Icons.Pencil className="text-white w-7 h-7" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className={`text-xl font-bold mb-2 ${darkMode ? "text-white" : "text-slate-800"}`}>
                          Create New Story
                        </h3>
                        <p className={`text-base ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          Share your thoughts, ideas, and inspirations with the world
                        </p>
                      </div>
                      <div className={`transition-all duration-300 group-hover:translate-x-2 ${
                        darkMode ? "text-blue-400" : "text-indigo-600"
                      }`}>
                        <Icons.ArrowRight className="w-6 h-6" />
                      </div>
                    </div>
                  </button>
                </Reveal>
              </div>
            )}

            <div className={`space-y-8 ${
              viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                : viewMode === "list"
                ? "space-y-6"
                : "grid grid-cols-1 lg:grid-cols-2 gap-8"
            }`}>
              {processedItems.map((post, index) => {
                const isBookmarked = bookmarks.includes(String(post.id));
                const isRecent = recentReads.includes(String(post.id));
                const readingTime = estimateReadingTime(post.bodyHtml);
                const progress = readingProgress[String(post.id)]?.progress || 0;
                const tint = clampAccent(post.color);

                return (
                  <Reveal key={post.id} delay={index * 100}>
                    <article
                      className={`group relative overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl cursor-pointer ${
                        darkMode
                          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                          : "bg-white/60 border-white/20 hover:bg-white/80 hover:border-white/40"
                      } ${viewMode === "list" ? "flex flex-col md:flex-row" : "flex flex-col"} ${
                        viewMode === "magazine" ? "h-96" : ""
                      }`}
                      onClick={() => handlePostClick(post)}
                    >
                      {/* Progress Bar */}
                      {progress > 0 && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-black/10">
                          <div 
                            className="h-full transition-all duration-300"
                            style={{ width: `${progress}%`, backgroundColor: tint }}
                          />
                        </div>
                      )}

                      <div className={`flex-1 p-8 ${viewMode === "list" ? "md:pr-6" : ""}`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <h2 className={`text-2xl font-bold leading-tight transition-all duration-300 group-hover:text-opacity-80 mb-3 ${
                              darkMode ? "text-white" : "text-slate-800"
                            }`}>
                              {post.title}
                            </h2>
                            <div className={`flex items-center space-x-4 text-sm ${
                              darkMode ? "text-slate-400" : "text-slate-600"
                            }`}>
                              <div className="flex items-center space-x-1">
                                <Icons.Clock />
                                <span>{readingTime} min read</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Icons.Calendar />
                                <span>{getTimeAgo(post.createdAt)}</span>
                              </div>
                              {progress > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Icons.Eye />
                                  <span>{progress}% read</span>
                                </div>
                              )}
                              {isRecent && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  darkMode ? "bg-blue-500/20 text-blue-300" : "bg-indigo-100 text-indigo-700"
                                }`}>
                                  Recent
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={(e) => handleBookmarkToggle(post.id, e)}
                              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                                isBookmarked
                                  ? darkMode
                                    ? "text-blue-400 hover:bg-blue-500/20"
                                    : "text-indigo-600 hover:bg-indigo-100"
                                  : darkMode
                                  ? "text-slate-400 hover:bg-white/10 hover:text-blue-400"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                              }`}
                            >
                              {isBookmarked ? <Icons.BookmarkFilled /> : <Icons.BookmarkEmpty />}
                            </button>

                            {owner && (
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    nav(`/blog/edit/${encodeURIComponent(post.id)}`);
                                  }}
                                  className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                                    darkMode
                                      ? "text-slate-400 hover:bg-white/10 hover:text-blue-400"
                                      : "text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                                  }`}
                                >
                                  <Icons.Edit />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(post.id);
                                  }}
                                  className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                                    darkMode
                                      ? "text-slate-400 hover:bg-white/10 hover:text-red-400"
                                      : "text-slate-500 hover:bg-slate-100 hover:text-red-600"
                                  }`}
                                >
                                  <Icons.Delete />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content Preview */}
                        <p className={`text-lg leading-relaxed mb-6 ${
                          darkMode ? "text-slate-300" : "text-slate-700"
                        } ${viewMode === "list" ? "line-clamp-2" : "line-clamp-4"}`}>
                          {createSnippet(post.bodyHtml, viewMode === "list" ? 120 : 200)}
                        </p>

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {post.tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                                  darkMode
                                    ? "bg-white/10 text-slate-300 hover:bg-white/20"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                            {post.tags.length > 3 && (
                              <span className={`px-3 py-1 text-sm ${
                                darkMode ? "text-slate-400" : "text-slate-500"
                              }`}>
                                +{post.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Read More */}
                        <div className={`inline-flex items-center space-x-2 font-semibold transition-all duration-300 group-hover:translate-x-2`}
                             style={{ color: tint }}>
                          <span>Continue reading</span>
                          <Icons.ArrowRight />
                        </div>
                      </div>

                      {/* Accent Border */}
                      <div
                        className="absolute bottom-0 left-0 w-full h-1 opacity-60 transition-all duration-300 group-hover:opacity-100"
                        style={{ backgroundColor: tint }}
                      />
                    </article>
                  </Reveal>
                );
              })}

              {/* Create New Post for Grid/Magazine Mode */}
              {owner && viewMode !== "list" && (
                <Reveal delay={processedItems.length * 100}>
                  <button
                    onClick={handleCreateNew}
                    className={`group relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl p-12 min-h-[300px] flex flex-col items-center justify-center ${
                      darkMode
                        ? "bg-white/5 border-white/20 hover:bg-white/10 hover:border-slate-400 text-slate-300"
                        : "bg-white/40 border-slate-300 hover:bg-white/70 hover:border-indigo-400 text-slate-600"
                    }`}
                  >
                    <div className="text-center space-y-6">
                      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                        darkMode 
                          ? "bg-gradient-to-br from-blue-500 to-slate-600"
                          : "bg-gradient-to-br from-indigo-500 to-purple-600"
                      } shadow-2xl`}>
                        <Icons.Plus className="text-white" />
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold mb-2 ${darkMode ? "text-white" : "text-slate-800"}`}>
                          Create New Story
                        </h3>
                        <p className="text-lg opacity-80">
                          Share your thoughts with the world
                        </p>
                      </div>
                    </div>
                  </button>
                </Reveal>
              )}
            </div>
          </>
        )}
      </div>

      {/* Enhanced Styles */}
      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .animate-reverse {
          animation-direction: reverse;
        }
        .bg-gradient-conic {
          background: conic-gradient(var(--tw-gradient-stops));
        }
        html {
          scroll-behavior: smooth;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}