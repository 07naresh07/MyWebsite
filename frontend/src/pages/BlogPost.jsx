// src/pages/BlogPost.jsx
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
// NOTE: no static import of getPost to avoid Vite error when it's not exported
import { useOwnerMode } from "../lib/owner.js";
import Reveal from "../components/Reveal.jsx";

/* ----------------------------- Local store ----------------------------- */
const LS_KEY = "localBlogs";
const THEME_KEY = "blogTheme";
const READING_PROGRESS_KEY = "readingProgress";
const READING_PREFERENCES_KEY = "readingPreferences";

const readLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getLocalById = (id) =>
  readLocal().find(
    (p) => String(p.id) === String(id) || String(p.slug) === String(id)
  );

const removeLocal = (id) => {
  const all = readLocal();
  const filtered = all.filter((r) => String(r.id) !== String(id));
  localStorage.setItem(LS_KEY, JSON.stringify(filtered));
  return true;
};

// Reading progress tracking
const saveReadingProgress = (postId, progress) => {
  const data = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY) || "{}");
  data[postId] = { progress, timestamp: Date.now() };
  localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(data));
};

const getReadingProgress = (postId) => {
  const data = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY) || "{}");
  return data[postId]?.progress || 0;
};

// Reading preferences
const saveReadingPreferences = (prefs) => {
  localStorage.setItem(READING_PREFERENCES_KEY, JSON.stringify(prefs));
};

const getReadingPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem(READING_PREFERENCES_KEY) || "{}");
  } catch {
    return {};
  }
};

/* ----------------------------- Utilities ----------------------------- */
const slugify = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const clampAccent = (hex) =>
  /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex || "") ? hex : "#6366f1";

// Reading time estimator with better accuracy
const estimateReadingTime = (html) => {
  const text = (html || "").replace(/<[^>]*>/g, "");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const codeBlocks = (html || "").match(/<pre[^>]*>[\s\S]*?<\/pre>/g) || [];
  const codeWords = codeBlocks.length * 50; // Code takes longer to read
  return Math.max(1, Math.ceil((words + codeWords) / 200));
};

// Generate a TOC model from raw HTML (without mutating original)
const generateTableOfContents = (html) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");

    return Array.from(headings).map((heading, index) => ({
      id: `heading-${index}`,
      text: heading.textContent || "",
      level: parseInt(heading.tagName.charAt(1), 10),
      slug: slugify(heading.textContent || ""),
    }));
  } catch {
    return [];
  }
};

// Add deterministic IDs to headings to enable TOC scroll
const processContent = (html) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((heading, index) => {
      heading.id = `heading-${index}`;
    });
    return doc.body.innerHTML;
  } catch {
    return html || "";
  }
};

// Social sharing utilities
const sharePost = (platform, post, url) => {
  const title = encodeURIComponent(post.title || "");
  const text = encodeURIComponent(`Check out this blog post: ${post.title || ""}`);
  const encodedUrl = encodeURIComponent(url);

  const urls = {
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${title}`,
    copy: url,
  };

  if (platform === "copy") {
    navigator.clipboard?.writeText(url).then(() => {
      // Better feedback for copy action
      const button = document.querySelector('[data-copy-feedback]');
      if (button) {
        button.textContent = "Copied!";
        setTimeout(() => {
          button.textContent = "Copy Link";
        }, 2000);
      }
    });
  } else {
    window.open(urls[platform], "_blank", "width=600,height=400");
  }
};

// Modern icons as React components
const Icons = {
  ArrowLeft: ({ size = 20, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M19 12H5m7-7l-7 7 7 7" />
    </svg>
  ),
  Clock: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  Calendar: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Menu: ({ size = 20, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  Share: ({ size = 20, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  Edit: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  Delete: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  Settings: ({ size = 20, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Sun: ({ size = 18, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: ({ size = 18, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  ZoomIn: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  ZoomOut: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  BookOpen: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Type: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="4,7 4,4 20,4 20,7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  Eye: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Bookmark: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

export default function BlogPost() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { owner } = useOwnerMode();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // UI State
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem(THEME_KEY) === "dark" || 
    (!localStorage.getItem(THEME_KEY) && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Reading State
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Reading Preferences
  const [fontSize, setFontSize] = useState(100);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [readingMode, setReadingMode] = useState(false); // Focus mode
  const [serifFont, setSerifFont] = useState(false);

  const shareRef = useRef(null);
  const settingsRef = useRef(null);

  // Load reading preferences
  useEffect(() => {
    const prefs = getReadingPreferences();
    if (prefs.fontSize) setFontSize(prefs.fontSize);
    if (prefs.lineHeight) setLineHeight(prefs.lineHeight);
    if (prefs.serifFont !== undefined) setSerifFont(prefs.serifFont);
    if (prefs.readingMode !== undefined) setReadingMode(prefs.readingMode);
  }, []);

  // Save reading preferences
  useEffect(() => {
    saveReadingPreferences({
      fontSize,
      lineHeight,
      serifFont,
      readingMode,
    });
  }, [fontSize, lineHeight, serifFont, readingMode]);

  // Generate table of contents
  const tableOfContents = useMemo(() => {
    if (!post?.bodyHtml) return [];
    return generateTableOfContents(post.bodyHtml);
  }, [post?.bodyHtml]);

  // Process content with heading IDs
  const processedContent = useMemo(() => {
    if (!post?.bodyHtml) return "";
    return processContent(post.bodyHtml);
  }, [post?.bodyHtml]);

  // Theme toggle with system preference detection
  const toggleTheme = useCallback(() => {
    const newTheme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    localStorage.setItem(THEME_KEY, newTheme);
    document.documentElement.classList.toggle("dark", !darkMode);
  }, [darkMode]);

  // Safe, optional API load helper (no hard dependency on getPost export)
  const tryLoadFromApi = useCallback(async (slugLike) => {
    try {
      const mod = await import("../lib/api.js"); // dynamic import
      const fn = mod?.getPost;
      if (typeof fn !== "function") return null;
      const apiPost = await fn(slugLike);
      if (!apiPost) return null;
      return {
        id: apiPost.id || slugLike,
        slug: apiPost.slug || slugify(apiPost.title || slugLike),
        title: apiPost.title || "Untitled",
        bodyHtml: apiPost.content || apiPost.bodyHtml || "",
        tags: Array.isArray(apiPost.tags) ? apiPost.tags : [],
        color: apiPost.color || "#6366f1",
        theme: apiPost.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 },
        createdAt: apiPost.createdAt || new Date().toISOString(),
        updatedAt: apiPost.updatedAt,
      };
    } catch {
      return null;
    }
  }, []);

  // Load post
  useEffect(() => {
    let mounted = true;

    const loadPost = async () => {
      try {
        setLoading(true);
        setError("");

        // Try local storage first
        let foundPost = getLocalById(slug);

        // If not found locally, try API dynamically (only if getPost exists)
        if (!foundPost) {
          const apiCandidate = await tryLoadFromApi(slug);
          if (apiCandidate) {
            foundPost = apiCandidate;
          }
        }

        if (!foundPost) {
          if (mounted) setError("Blog post not found");
          return;
        }

        if (mounted) {
          setPost(foundPost);

          // Load related posts (simple tag overlap, local only)
          const allPosts = readLocal();
          const related = allPosts
            .filter(
              (p) =>
                String(p.id) !== String(foundPost.id) &&
                (p.tags || []).some((tag) => (foundPost.tags || []).includes(tag))
            )
            .slice(0, 3);
          setRelatedPosts(related);

          // Restore reading progress
          const savedProgress = getReadingProgress(foundPost.id);
          setReadingProgress(savedProgress);

          // Check if bookmarked
          const bookmarks = JSON.parse(localStorage.getItem("bookmarkedPosts") || "[]");
          setIsBookmarked(bookmarks.includes(foundPost.id));

          // Set document title
          document.title = `${foundPost.title} — Blog`;
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Failed to load post");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPost();
    return () => {
      mounted = false;
    };
  }, [slug, tryLoadFromApi]);

  // Initialize theme with system preference
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Enhanced reading progress tracker with active heading detection
  useEffect(() => {
    if (!post) return;

    const handleScroll = () => {
      const article = document.querySelector("[data-article-content]");
      if (!article) return;

      const rect = article.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollTop = window.scrollY;

      const progress = Math.min(
        100,
        Math.max(0, ((scrollTop + windowHeight - articleTop) / articleHeight) * 100)
      );

      setReadingProgress(progress);

      // Save progress periodically (only after user starts)
      if (progress > 5) saveReadingProgress(post.id, progress);

      // Detect active heading for TOC
      const headings = document.querySelectorAll("[id^='heading-']");
      let currentActive = "";
      
      for (const heading of headings) {
        const headingRect = heading.getBoundingClientRect();
        if (headingRect.top <= 100) {
          currentActive = heading.id;
        }
      }
      
      setActiveHeading(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [post]);

  // Close menus on outside click or ESC
  useEffect(() => {
    const onDocClick = (e) => {
      if (showShareMenu && shareRef.current && !shareRef.current.contains(e.target)) {
        setShowShareMenu(false);
      }
      if (showSettings && settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setShowShareMenu(false);
        setShowSettings(false);
        setShowToc(false);
      }
    };
    
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showShareMenu, showSettings]);

  // Delete post handler
  const handleDelete = useCallback(() => {
    if (!owner || !post) return;
    if (!confirm("Are you sure you want to delete this post?")) return;

    removeLocal(post.id);
    nav("/blog");
  }, [owner, post, nav]);

  // Font size controls
  const adjustFontSize = useCallback((change) => {
    setFontSize((prev) => Math.max(75, Math.min(150, prev + change)));
  }, []);

  // Line height controls
  const adjustLineHeight = useCallback((change) => {
    setLineHeight((prev) => Math.max(1.2, Math.min(2.0, prev + change)));
  }, []);

  // Toggle bookmark
  const toggleBookmark = useCallback(() => {
    if (!post) return;
    
    const bookmarks = JSON.parse(localStorage.getItem("bookmarkedPosts") || "[]");
    const newBookmarks = isBookmarked
      ? bookmarks.filter(id => id !== post.id)
      : [...bookmarks, post.id];
    
    localStorage.setItem("bookmarkedPosts", JSON.stringify(newBookmarks));
    setIsBookmarked(!isBookmarked);
  }, [post, isBookmarked]);

  // Smooth scroll to heading
  const scrollToHeading = useCallback((headingId) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setShowToc(false);
    }
  }, []);

  if (loading) {
    return (
      <section className="container py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-800"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent absolute top-0"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !post) {
    return (
      <section className="container py-10">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="text-red-600 dark:text-red-400 mb-4 text-lg font-semibold">
              {error || "Post not found"}
            </div>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Icons.ArrowLeft size={16} />
              Back to Blog
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const tint = clampAccent(post.color);
  const fontFamily = serifFont 
    ? post.theme?.fontFamily || "Georgia, serif" 
    : post.theme?.fontFamily || "";
  const basePx = post.theme?.basePx || 16;
  const headingScale = post.theme?.headingScale || 1.15;
  const readingTime = estimateReadingTime(post.bodyHtml);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      readingMode 
        ? "bg-yellow-50 dark:bg-gray-950" 
        : "bg-gray-50 dark:bg-gray-900"
    }`}>
      {/* Enhanced Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 shadow-sm"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Enhanced Navigation bar */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
              >
                <Icons.ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Blog</span>
              </Link>

              {/* Reading stats */}
              <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Icons.Clock size={14} />
                  <span>{readingTime} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icons.BookOpen size={14} />
                  <span>{Math.round(readingProgress)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick actions */}
              <div className="flex items-center gap-1">
                {/* Bookmark toggle */}
                <button
                  onClick={toggleBookmark}
                  className={`p-2 rounded-lg transition-colors ${
                    isBookmarked
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                  title={isBookmarked ? "Remove bookmark" : "Bookmark post"}
                >
                  <Icons.Bookmark size={16} className={isBookmarked ? "fill-current" : ""} />
                </button>

                {/* Font size controls */}
                <div className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => adjustFontSize(-10)}
                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    title="Decrease font size"
                  >
                    <Icons.ZoomOut size={14} />
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[2.5rem] text-center font-medium">
                    {fontSize}%
                  </span>
                  <button
                    onClick={() => adjustFontSize(10)}
                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    title="Increase font size"
                  >
                    <Icons.ZoomIn size={14} />
                  </button>
                </div>

                {/* Table of contents toggle */}
                {tableOfContents.length > 0 && (
                  <button
                    onClick={() => setShowToc((s) => !s)}
                    className={`p-2 rounded-lg transition-colors ${
                      showToc
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                    title="Table of contents"
                  >
                    <Icons.Menu size={18} />
                  </button>
                )}

                {/* Settings menu */}
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setShowSettings((s) => !s)}
                    className={`p-2 rounded-lg transition-colors ${
                      showSettings
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                    title="Reading settings"
                  >
                    <Icons.Settings size={18} />
                  </button>

                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-3 z-50">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Reading Settings</h3>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {/* Font size */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Font Size: {fontSize}%
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjustFontSize(-10)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Icons.ZoomOut size={14} />
                            </button>
                            <input
                              type="range"
                              min="75"
                              max="150"
                              value={fontSize}
                              onChange={(e) => setFontSize(Number(e.target.value))}
                              className="flex-1"
                            />
                            <button
                              onClick={() => adjustFontSize(10)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Icons.ZoomIn size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Line height */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Line Height: {lineHeight.toFixed(1)}
                          </label>
                          <input
                            type="range"
                            min="1.2"
                            max="2.0"
                            step="0.1"
                            value={lineHeight}
                            onChange={(e) => setLineHeight(Number(e.target.value))}
                            className="w-full"
                          />
                        </div>

                        {/* Typography toggles */}
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={serifFont}
                              onChange={(e) => setSerifFont(e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Serif font</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={readingMode}
                              onChange={(e) => setReadingMode(e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Focus mode</span>
                          </label>
                        </div>

                        {/* Reset button */}
                        <button
                          onClick={() => {
                            setFontSize(100);
                            setLineHeight(1.6);
                            setSerifFont(false);
                            setReadingMode(false);
                          }}
                          className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Reset to defaults
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Share menu */}
                <div className="relative" ref={shareRef}>
                  <button
                    onClick={() => setShowShareMenu((s) => !s)}
                    className={`p-2 rounded-lg transition-colors ${
                      showShareMenu
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                    title="Share post"
                  >
                    <Icons.Share size={18} />
                  </button>

                  {showShareMenu && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-2 z-50">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">Share this post</h4>
                      </div>
                      {[
                        { key: "twitter", label: "Twitter", icon: "🐦", color: "text-blue-500" },
                        { key: "facebook", label: "Facebook", icon: "📘", color: "text-blue-600" },
                        { key: "linkedin", label: "LinkedIn", icon: "💼", color: "text-blue-700" },
                        { key: "reddit", label: "Reddit", icon: "🤖", color: "text-orange-500" },
                        { key: "copy", label: "Copy Link", icon: "🔗", color: "text-gray-600" },
                      ].map(({ key, label, icon, color }) => (
                        <button
                          key={key}
                          onClick={() => {
                            sharePost(key, post, currentUrl);
                            setShowShareMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                          data-copy-feedback={key === "copy" ? "true" : undefined}
                        >
                          <span className="text-lg">{icon}</span>
                          <span className={`text-sm font-medium ${color}`}>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
                  title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
                >
                  {darkMode ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
                </button>

                {/* Owner controls */}
                {owner && (
                  <div className="flex items-center gap-1 pl-2 border-l border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => nav(`/blog/edit/${post.id}`)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
                      title="Edit post"
                    >
                      <Icons.Edit size={16} />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                      title="Delete post"
                    >
                      <Icons.Delete size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Table of contents sidebar */}
      {showToc && tableOfContents.length > 0 && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-20 lg:hidden"
            onClick={() => setShowToc(false)}
          />
          
          <div className="fixed top-20 right-4 z-30 w-80 max-h-[75vh] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Icons.Menu size={16} />
                  Table of Contents
                </h3>
                <button
                  onClick={() => setShowToc(false)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <nav className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-1">
                {tableOfContents.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => scrollToHeading(heading.id)}
                    className={`block w-full text-left text-sm transition-all py-2 px-3 rounded-lg ${
                      activeHeading === heading.id
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    style={{ 
                      paddingLeft: `${(heading.level - 1) * 0.75 + 0.75}rem`,
                      borderLeft: heading.level > 2 ? "2px solid rgba(99, 102, 241, 0.2)" : "none",
                      marginLeft: heading.level > 2 ? `${(heading.level - 2) * 0.5}rem` : "0"
                    }}
                  >
                    <span className="block truncate">{heading.text}</span>
                    {heading.level <= 2 && (
                      <div className="w-full h-px bg-gray-200 dark:bg-gray-600 mt-1 opacity-50" />
                    )}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Main content */}
      <main className={`transition-all duration-300 ${
        readingMode ? "max-w-4xl mx-auto px-6" : "container"
      } py-8`}>
        <Reveal>
          <article
            className={`mx-auto transition-all duration-300 ${
              readingMode ? "max-w-2xl" : "max-w-4xl"
            }`}
            data-article-content
            style={{ 
              fontSize: `${fontSize}%`,
              lineHeight: lineHeight,
            }}
          >
            {/* Enhanced Post header */}
            <header className="mb-12 text-center">
              <div className="relative">
                {/* Category badge */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mb-6">
                    <span 
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border"
                      style={{ 
                        backgroundColor: `${tint}15`,
                        borderColor: `${tint}30`,
                        color: tint
                      }}
                    >
                      <Icons.Eye size={12} />
                      {post.tags[0]}
                    </span>
                  </div>
                )}

                <h1
                  className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight"
                  style={{
                    color: darkMode ? "white" : tint,
                    fontFamily: serifFont ? "Georgia, serif" : fontFamily,
                    fontSize: `${headingScale * 2.5}em`,
                  }}
                >
                  {post.title}
                </h1>

                {/* Enhanced meta information */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-8">
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
                    <Icons.Clock size={14} />
                    <span className="font-medium">{readingTime} min read</span>
                  </div>

                  {post.createdAt && (
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
                      <Icons.Calendar size={14} />
                      <span className="font-medium">
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}

                  {post.updatedAt && post.updatedAt !== post.createdAt && (
                    <div className="flex items-center gap-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full px-3 py-1">
                      <span>Updated: {new Date(post.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Enhanced tags */}
                {post.tags && post.tags.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {post.tags.slice(1).map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 text-sm font-medium rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Reading progress indicator */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${readingProgress}%`,
                      background: `linear-gradient(90deg, ${tint}, ${tint}80)`
                    }}
                  />
                </div>
              </div>
            </header>

            {/* Enhanced Post content */}
            <div
              className={`prose prose-lg max-w-none dark:prose-invert prose-headings:scroll-mt-20 transition-all duration-300 ${
                readingMode ? "prose-xl" : ""
              }`}
              style={{
                fontFamily: serifFont ? "Georgia, serif" : fontFamily,
                fontSize: basePx,
                "--tw-prose-body": readingMode 
                  ? (darkMode ? "#f3f4f6" : "#374151")
                  : "inherit",
                "--tw-prose-headings": tint,
                "--tw-prose-links": tint,
                "--tw-prose-counters": tint,
                "--tw-prose-bullets": tint,
                "--tw-prose-hr": `${tint}40`,
                "--tw-prose-quotes": tint,
                "--tw-prose-quote-borders": tint,
                "--tw-prose-captions": `${tint}80`,
              }}
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {/* Floating reading progress */}
            {readingProgress > 10 && readingProgress < 95 && (
              <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-2xl border border-gray-200 dark:border-gray-700 z-20">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke={tint}
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 45 * (1 - readingProgress / 100)
                      }`}
                      className="transition-all duration-300 filter drop-shadow-sm"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {Math.round(readingProgress)}%
                    </span>
                    <Icons.BookOpen size={12} className="text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              </div>
            )}
          </article>
        </Reveal>

        {/* Enhanced Related posts */}
        {relatedPosts.length > 0 && (
          <Reveal>
            <section className="max-w-4xl mx-auto mt-20 pt-12 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Related Articles
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Continue your reading journey with these related posts
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => {
                  const relatedTint = clampAccent(relatedPost.color);
                  const relatedReadingTime = estimateReadingTime(relatedPost.bodyHtml);
                  
                  return (
                    <Link
                      key={relatedPost.id}
                      to={`/blog/${relatedPost.slug || relatedPost.id}`}
                      className="group block"
                    >
                      <article className="h-full p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800 hover:scale-[1.02] hover:border-gray-300 dark:hover:border-gray-600">
                        {/* Category */}
                        {relatedPost.tags && relatedPost.tags.length > 0 && (
                          <div className="mb-3">
                            <span 
                              className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                              style={{ 
                                backgroundColor: `${relatedTint}15`,
                                color: relatedTint
                              }}
                            >
                              {relatedPost.tags[0]}
                            </span>
                          </div>
                        )}

                        <h3
                          className="font-bold text-lg mb-3 group-hover:opacity-80 transition-opacity leading-tight"
                          style={{ color: relatedTint }}
                        >
                          {relatedPost.title}
                        </h3>

                        {/* Excerpt */}
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed line-clamp-3">
                          {(relatedPost.bodyHtml || "").replace(/<[^>]*>/g, "").slice(0, 120)}...
                        </p>

                        {/* Meta */}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Icons.Clock size={12} />
                              {relatedReadingTime} min
                            </span>
                            {relatedPost.createdAt && (
                              <span>{new Date(relatedPost.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                          <div className="text-indigo-500 group-hover:translate-x-1 transition-transform">
                            →
                          </div>
                        </div>

                        {/* Additional tags */}
                        {relatedPost.tags && relatedPost.tags.length > 1 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {relatedPost.tags.slice(1, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          </Reveal>
        )}
      </main>

      {/* Enhanced Custom styles */}
      <style>{`
        .prose li::marker { color: ${tint}; }
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

        /* Enhanced prose styles */
        .prose {
          --tw-prose-headings: ${tint};
          --tw-prose-links: ${tint};
          --tw-prose-counters: ${tint};
          --tw-prose-bullets: ${tint};
          --tw-prose-hr: ${tint}40;
          --tw-prose-quotes: ${tint};
          --tw-prose-quote-borders: ${tint};
        }

        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          font-family: ${serifFont ? "Georgia, serif" : fontFamily};
          scroll-margin-top: 6rem;
          position: relative;
        }

        .prose h1 { font-size: ${headingScale * 2.2}em; }
        .prose h2 { font-size: ${headingScale * 1.8}em; }
        .prose h3 { font-size: ${headingScale * 1.5}em; }
        .prose h4 { font-size: ${headingScale * 1.3}em; }
        .prose h5 { font-size: ${headingScale * 1.15}em; }
        .prose h6 { font-size: ${headingScale * 1.05}em; }

        .prose blockquote {
          border-left: 4px solid ${tint};
          background: ${tint}08;
          padding: 1.5rem 2rem;
          margin: 2rem 0;
          border-radius: 0.75rem;
          position: relative;
          font-style: italic;
        }

        .prose blockquote::before {
          content: '"';
          position: absolute;
          top: -0.5rem;
          left: 1rem;
          font-size: 3rem;
          color: ${tint};
          font-family: Georgia, serif;
        }

        .prose a {
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 2px;
          transition: all 0.2s ease;
        }

        .prose a:hover {
          text-decoration-thickness: 3px;
          text-underline-offset: 4px;
        }

        .prose pre {
          background: ${darkMode ? "#1f2937" : "#f8fafc"} !important;
          border: 1px solid ${darkMode ? "#374151" : "#e2e8f0"};
          border-radius: 0.75rem;
          padding: 1.5rem;
          overflow-x: auto;
        }

        .prose code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          background: ${darkMode ? "#374151" : "#f1f5f9"};
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.875em;
        }

        .prose pre code {
          background: none;
          padding: 0;
          border-radius: 0;
        }

        .prose img {
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .prose img:hover {
          transform: scale(1.02);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 15px -5px rgba(0, 0, 0, 0.1);
        }

        .prose table {
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid ${darkMode ? "#374151" : "#e2e8f0"};
        }

        .prose thead {
          background: ${tint}10;
        }

        .prose th {
          color: ${tint};
          font-weight: 600;
          padding: 1rem;
        }

        .prose td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid ${darkMode ? "#374151" : "#f1f5f9"};
        }

        .prose ul, .prose ol {
          padding-left: 1.5rem;
        }

        .prose li {
          margin: 0.5rem 0;
          line-height: 1.7;
        }

        .prose hr {
          border: none;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${tint}40, transparent);
          margin: 3rem 0;
          border-radius: 1px;
        }

        /* Custom scrollbar */
        .prose::-webkit-scrollbar,
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .prose::-webkit-scrollbar-track,
        .overflow-y-auto::-webkit-scrollbar-track {
          background: ${darkMode ? "#374151" : "#f1f5f9"};
          border-radius: 3px;
        }

        .prose::-webkit-scrollbar-thumb,
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: ${tint};
          border-radius: 3px;
        }

        .prose::-webkit-scrollbar-thumb:hover,
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: ${tint}cc;
        }

        /* Reading mode enhancements */
        ${readingMode ? `
          .prose {
            max-width: 65ch;
            margin: 0 auto;
            padding: 2rem;
            background: ${darkMode ? "#111827" : "#fffef7"};
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          body {
            background: ${darkMode ? "#0f172a" : "#f7f3e9"} !important;
          }
        ` : ''}

        /* Smooth transitions */
        * {
          transition: color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
        }

        /* Focus styles */
        button:focus-visible,
        input:focus-visible,
        [role="menuitem"]:focus-visible {
          outline: 2px solid ${tint};
          outline-offset: 2px;
          border-radius: 0.375rem;
        }

        /* Animation for progress indicator */
        @keyframes pulse-progress {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .animate-pulse-progress {
          animation: pulse-progress 2s ease-in-out infinite;
        }

        /* Dark mode specific adjustments */
        ${darkMode ? `
          .prose strong { color: #f9fafb; }
          .prose em { color: #e5e7eb; }
          .prose code { color: #f472b6; }
        ` : ''}

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .prose h1 { font-size: ${headingScale * 1.8}em; }
          .prose h2 { font-size: ${headingScale * 1.5}em; }
          .prose h3 { font-size: ${headingScale * 1.3}em; }
          
          .prose blockquote {
            margin: 1.5rem 0;
            padding: 1rem 1.5rem;
          }
          
          .prose img {
            margin: 1.5rem 0;
          }
        }
      `}</style>
    </div>
  );
}