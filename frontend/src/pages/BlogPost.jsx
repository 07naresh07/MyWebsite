// src/pages/BlogPost.jsx
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useOwnerMode } from "../lib/owner.js";
import Reveal from "../components/Reveal.jsx";

/* ----------------------------- Local store ----------------------------- */
const LS_KEY = "localBlogs";
const THEME_KEY = "blog_theme"; // unified; still respects legacy below
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

const getLocalByIdOrSlug = (idOrSlug) => {
  const needle = String(idOrSlug || "").toLowerCase();
  return readLocal().find(
    (p) =>
      String(p.id || "").toLowerCase() === needle ||
      String(p.slug || "").toLowerCase() === needle
  );
};

const removeLocalByIdOrSlug = (idOrSlug) => {
  const needle = String(idOrSlug || "").toLowerCase();
  const all = readLocal();
  localStorage.setItem(
    LS_KEY,
    JSON.stringify(
      all.filter(
        (r) =>
          String(r.id || "").toLowerCase() !== needle &&
          String(r.slug || "").toLowerCase() !== needle
      )
    )
  );
  return true;
};

// Reading progress
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

const estimateReadingTime = (html) => {
  const text = (html || "").replace(/<[^>]*>/g, " ");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const codeBlocks = (html || "").match(/<pre[^>]*>[\s\S]*?<\/pre>/g) || [];
  const codeWords = codeBlocks.length * 50;
  return Math.max(1, Math.ceil((words + codeWords) / 200));
};

const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(String(s || ""));

/** Tiny, tolerant Markdown → HTML converter with support for :::align-* blocks */
function mdToHtml(md) {
  if (!md) return "";
  let src = String(md).replace(/\r\n?/g, "\n");

  // Normalize messy tokens
  src = src
    .replace(/^\s*[-*]?\s*:::\s*$/gm, ":::")
    .replace(/^\s*[-*]?\s*::\s*$/gm, ":::")
    .replace(/(?:[a-z0-9_-]+)?:::\s*align-(left|center|right|justify)/gi, ":::align-$1");

  // Convert :::align-* blocks
  src = src.replace(
    /:::align-(left|center|right|justify)\s*\n([\s\S]*?)(?:\n:::\s*(?:\n|$)|$)/gi,
    (_, where, inner) => `<div style="text-align:${where}">${inner.trim().replace(/\n/g, "<br/>")}</div>\n`
  );
  // Single-line :::align-*
  src = src.replace(
    /:::align-(left|center|right|justify)\s+([^\n]+)(?:\n|$)/gi,
    (_, where, inner) => `<div style="text-align:${where}">${inner}</div>\n`
  );
  // Remove bare :::
  src = src.replace(/(^|\s):::($|\s)/g, " ");

  const inline = (s) =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Headings
  src = src
    .split("\n")
    .map((line) => {
      if (/^######\s+/.test(line)) return line.replace(/^######\s+(.+)$/, "<h6>$1</h6>");
      if (/^#####\s+/.test(line)) return line.replace(/^#####\s+(.+)$/, "<h5>$1</h5>");
      if (/^####\s+/.test(line)) return line.replace(/^####\s+(.+)$/, "<h4>$1</h4>");
      if (/^###\s+/.test(line)) return line.replace(/^###\s+(.+)$/, "<h3>$1</h3>");
      if (/^##\s+/.test(line)) return line.replace(/^##\s+(.+)$/, "<h2>$1</h2>");
      if (/^#\s+/.test(line)) return line.replace(/^#\s+(.+)$/, "<h1>$1</h1>");
      return line;
    })
    .join("\n");

  // Paragraphs & lists
  const blocks = src.split(/\n{2,}/);
  const htmlBlocks = blocks.map((block) => {
    const hasHtml =
      /<\/?(div|h[1-6]|ul|ol|li|pre|blockquote|table|thead|tbody|tr|td|th|p|img|code|span)/i.test(
        block
      );

    const lines = block.split("\n");
    const isUL = lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l));
    const isOL = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));

    if (isUL) {
      const items = lines
        .map((l) => l.replace(/^\s*[-*]\s+/, ""))
        .map((li) => `<li>${inline(li)}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    if (isOL) {
      const items = lines
        .map((l) => l.replace(/^\s*\d+\.\s+/, ""))
        .map((li) => `<li>${inline(li)}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }

    if (hasHtml) return block;
    return `<p>${inline(block).replace(/\n/g, "<br/>")}</p>`;
  });

  return htmlBlocks.join("");
}

/* -------------------------- Robust body pickers -------------------------- */
/** Draft.js (very basic) -> HTML */
function draftToHtml(draft) {
  try {
    if (!draft || !Array.isArray(draft.blocks)) return "";
    return draft.blocks
      .map((b) => {
        const t = (b.text || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        switch (b.type) {
          case "header-one":
            return `<h1>${t}</h1>`;
          case "header-two":
            return `<h2>${t}</h2>`;
          case "header-three":
            return `<h3>${t}</h3>`;
          case "blockquote":
            return `<blockquote>${t}</blockquote>`;
          case "unordered-list-item":
            return `<ul><li>${t}</li></ul>`;
          case "ordered-list-item":
            return `<ol><li>${t}</li></ol>`;
          default:
            return `<p>${t}</p>`;
        }
      })
      .join("\n")
      .replace(/<\/ul>\s*<ul>/g, "")
      .replace(/<\/ol>\s*<ol>/g, "");
  } catch {
    return "";
  }
}

/** Quill Delta (very basic) -> HTML */
function quillToHtml(delta) {
  try {
    const ops = Array.isArray(delta?.ops) ? delta.ops : [];
    return ops
      .map((op) => {
        const s = typeof op.insert === "string" ? op.insert : "";
        if (!s) return "";
        return s
          .split("\n")
          .map((line) => (line.trim() ? `<p>${line}</p>` : ""))
          .join("");
      })
      .join("");
  } catch {
    return "";
  }
}

/** Deep fallback: find the longest string-like field in any object/array */
function deepFindLongestText(v, best = "") {
  if (!v) return best;
  if (typeof v === "string") {
    const s = v.trim();
    return s.length > best.length ? s : best;
  }
  if (Array.isArray(v)) {
    return v.reduce((acc, item) => deepFindLongestText(item, acc), best);
  }
  if (typeof v === "object") {
    return Object.values(v).reduce((acc, val) => deepFindLongestText(val, acc), best);
  }
  return best;
}

/** Normalize/choose body HTML from various API shapes (tolerant) */
function pickBodyRaw(src) {
  if (!src) return "";

  // 1) Common straight string fields
  const cands = [
    "content",
    "bodyHtml",
    "bodyHTML",
    "body",
    "content_html",
    "body_html",
    "html",
    "markdown",
    "md",
    "contentMd",
    "content_markdown",
    "bodyMarkdown",
    "text",
    "full",
    "fullText",
    "article",
  ];
  for (const k of cands) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) return v;
    if (v && typeof v === "object") {
      if (typeof v.html === "string" && v.html.trim()) return v.html;
      if (typeof v.content === "string" && v.content.trim()) return v.content;
      if (typeof v.markdown === "string" && v.markdown.trim()) return v.markdown;
    }
  }

  // 2) Draft.js shape
  if (src.blocks && Array.isArray(src.blocks)) {
    const html = draftToHtml(src);
    if (html.trim()) return html;
  }

  // 3) Quill Delta
  if (src.ops && Array.isArray(src.ops)) {
    const html = quillToHtml(src);
    if (html.trim()) return html;
  }
  if (src.delta && Array.isArray(src.delta?.ops)) {
    const html = quillToHtml(src.delta);
    if (html.trim()) return html;
  }

  // 4) TipTap-like content (simple text join)
  if (Array.isArray(src.content)) {
    const text = deepFindLongestText(src.content);
    if (text.trim()) return text;
  }

  // 5) Final fallback: longest string anywhere in the object
  const longest = deepFindLongestText(src);
  return longest || "";
}

/** Convert legacy alignment markers to proper HTML (safe to call on HTML) */
function normalizeAlignmentTokens(html) {
  if (!html) return "";
  let out = String(html);

  out = out.replace(/(?:[a-zA-Z0-9_-]+)?:::\s*align-(left|center|right|justify)/g, ":::align-$1");

  out = out.replace(
    /:::\s*align-(left|center|right|justify)\s*\n([\s\S]*?)\n:::\s*/g,
    (_m, side, inner) => `<div style="text-align:${side}">${inner}</div>\n`
  );
  out = out.replace(
    /:::\s*align-(left|center|right|justify)\s+([^\n]+)(?:\n|$)/g,
    (_m, side, inner) => `<div style="text-align:${side}">${inner}</div>\n`
  );

  out = out.replace(/(^|\s):::($|\s)/g, " ");
  return out;
}

/** UPDATED: strip pasted highlights AND inline text colors that might interfere with theming */
function stripCopyHighlights(html) {
  try {
    const doc = new DOMParser().parseFromString(html || "", "text/html");

    // unwrap <mark> while keeping children
    doc.querySelectorAll("mark").forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      el.remove();
    });

    // remove inline background AND color styles that might interfere with theming
    doc.querySelectorAll("[style]").forEach((el) => {
      const style = el.getAttribute("style") || "";
      const cleaned = style
        .replace(/background(?:-color)?\s*:\s*[^;]+;?/gi, "")
        .replace(/color\s*:\s*[^;]+;?/gi, "") // ADDED: remove inline text colors
        .replace(/\s*;\s*$/g, "");
      if (cleaned.trim()) el.setAttribute("style", cleaned);
      else el.removeAttribute("style");
    });

    // legacy attributes
    doc.querySelectorAll("[bgcolor],[background],[color]").forEach((el) => {
      el.removeAttribute("bgcolor");
      el.removeAttribute("background");
      el.removeAttribute("color"); // ADDED: remove color attribute
    });

    return doc.body.innerHTML;
  } catch {
    return html || "";
  }
}

/** Add deterministic IDs to headings to power TOC links */
function addHeadingIds(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((h, i) => (h.id = `heading-${i}`));
    return doc.body.innerHTML;
  } catch {
    return html || "";
  }
}

/** Build a TOC from HTML (after normalization) */
function buildTOC(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
    return Array.from(headings).map((h, i) => ({
      id: `heading-${i}`,
      text: h.textContent || "",
      level: Number(h.tagName[1]) || 1,
      slug: slugify(h.textContent || ""),
    }));
  } catch {
    return [];
  }
}

/** Strip HTML to create a short excerpt */
function stripHtml(html) {
  try {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || div.innerText || "").trim();
  } catch {
    return "";
  }
}

/* ----------------------------- Icons ----------------------------- */
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

/* ----------------------------- Component ----------------------------- */
export default function BlogPost() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { owner } = useOwnerMode();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem(THEME_KEY) === "dark" ||
      (localStorage.getItem(THEME_KEY) == null &&
        (localStorage.getItem("blogTheme") === "dark" || // legacy compatibility
         (!localStorage.getItem("blogTheme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)))
  );
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Reading
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Preferences
  const [fontSize, setFontSize] = useState(100);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [readingMode, setReadingMode] = useState(false);
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
    saveReadingPreferences({ fontSize, lineHeight, serifFont, readingMode });
  }, [fontSize, lineHeight, serifFont, readingMode]);

  // Try API helpers
  const tryLoadFromApi = useCallback(async (slugLike) => {
    if (!slugLike) return null;
    try {
      const mod = await import("../lib/api.js");
      if (typeof mod.getPost === "function") {
        const apiPost = await mod.getPost(slugLike);
        if (apiPost) {
          return {
            id: apiPost.id || slugLike,
            slug: apiPost.slug || slugify(apiPost.title || slugLike),
            title: apiPost.title || "Untitled",
            rawBody: pickBodyRaw(apiPost),
            tags: Array.isArray(apiPost.tags) ? apiPost.tags : [],
            color: apiPost.color || "#6366f1",
            theme: apiPost.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 },
            createdAt:
              apiPost.createdAt ||
              apiPost.publishedAt ||
              apiPost.created_at ||
              apiPost.published_at ||
              new Date().toISOString(),
            updatedAt: apiPost.updatedAt || apiPost.updated_at,
            coverImageUrl: apiPost.coverImageUrl || apiPost.cover_image_url || "",
            status: apiPost.status || "",
            excerpt: apiPost.excerpt || "",
          };
        }
      }
      if (typeof mod.getPosts === "function") {
        const list = await mod.getPosts({ page: 1, pageSize: 200 });
        const items = Array.isArray(list?.items) ? list.items : Array.isArray(list) ? list : [];
        const lower = String(slugLike).toLowerCase();
        const found =
          items.find((x) => String(x.slug || "").toLowerCase() === lower) ||
          items.find((x) => String(x.id || "").toLowerCase() === lower);
        if (found) {
          return {
            id: found.id || slugLike,
            slug: found.slug || slugify(found.title || slugLike),
            title: found.title || "Untitled",
            rawBody: pickBodyRaw(found),
            tags: Array.isArray(found.tags) ? found.tags : [],
            color: found.color || "#6366f1",
            theme: found.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 },
            createdAt:
              found.createdAt ||
              found.publishedAt ||
              found.created_at ||
              found.published_at ||
              new Date().toISOString(),
            updatedAt: found.updatedAt || found.updated_at,
            coverImageUrl: found.coverImageUrl || found.cover_image_url || "",
            status: found.status || "",
            excerpt: found.excerpt || "",
          };
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  // Build HTML from raw (Markdown or HTML) + IDs, and strip highlights + colors
  const normalizedHtml = useMemo(() => {
    if (!post?.rawBody && !post?.bodyHtml) return "";
    let htmlCandidate = post?.bodyHtml || post?.rawBody || "";
    if (!looksLikeHtml(htmlCandidate)) {
      htmlCandidate = mdToHtml(htmlCandidate);
    }
    const withAlign = normalizeAlignmentTokens(htmlCandidate);
    const withoutHighlights = stripCopyHighlights(withAlign); // <- UPDATED: now removes both highlights and text colors
    return addHeadingIds(withoutHighlights);
  }, [post?.rawBody, post?.bodyHtml]);

  const tableOfContents = useMemo(() => {
    return normalizedHtml ? buildTOC(normalizedHtml) : [];
  }, [normalizedHtml]);

  // Enhanced theme application for entire interface
  const applyThemeToDocument = useCallback(
    (isDark) => {
      const root = document.documentElement;
      root.classList.toggle("dark", isDark);
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

      // Apply theme to entire document (helps non-Tailwind areas)
      if (isDark) {
        document.body.style.backgroundColor = "#0b1220";
        document.body.style.color = "#e5e7eb";
        document.body.classList.add("dark");
      } else {
        document.body.style.backgroundColor = "#f8fafc";
        document.body.style.color = "#111827";
        document.body.classList.remove("dark");
      }
    },
    []
  );

  useEffect(() => applyThemeToDocument(darkMode), [darkMode, applyThemeToDocument]);
  const toggleTheme = useCallback(() => setDarkMode((d) => !d), []);

  // Load post (prefer local first for full content)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        let found = null;
        const local = getLocalByIdOrSlug(slug);

        if (local) {
          // Use local data as primary source
          const localBody = pickBodyRaw(local);
          found = {
            id: local.id || slug,
            slug: local.slug || slugify(local.title || slug),
            title: local.title || "Untitled",
            rawBody: localBody,
            bodyHtml: local.bodyHtml || "",
            tags: Array.isArray(local.tags) ? local.tags : [],
            color: local.color || "#6366f1",
            theme: local.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 },
            createdAt: local.createdAt || local.publishedAt || local.created_at || local.published_at,
            updatedAt: local.updatedAt || local.updated_at,
            coverImageUrl: local.coverImageUrl || "",
            status: local.status || "",
            excerpt: local.excerpt || "",
          };
        } else {
          // Try API if no local data
          const api = await tryLoadFromApi(slug);
          if (api) {
            found = api;
          }
        }

        if (!mounted) return;

        if (!found) {
          setError("Blog post not found");
          return;
        }

        setPost(found);

        // Related (local only, best-effort)
        const all = readLocal();
        const related = all
          .filter(
            (p) =>
              String(p.id) !== String(found.id || slug) &&
              (p.tags || []).some((t) => (found.tags || []).includes(t))
          )
          .slice(0, 3);
        setRelatedPosts(related);

        // Restore progress/bookmark
        setReadingProgress(getReadingProgress(found.id || slug));
        const bookmarks = JSON.parse(localStorage.getItem("bookmarkedPosts") || "[]");
        setIsBookmarked(bookmarks.includes(found.id || slug));

        // Title
        document.title = `${found.title || "Untitled"} — Blog`;
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load post");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug, tryLoadFromApi]);

  // Reading progress + active heading
  useEffect(() => {
    if (!post) return;
    const onScroll = () => {
      const article = document.querySelector("[data-article-content]");
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const articleHeight = article.offsetHeight;
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;

      const percent = Math.min(
        100,
        Math.max(0, ((scrollTop + windowHeight - articleTop) / articleHeight) * 100)
      );
      setReadingProgress(percent);
      if (percent > 5) saveReadingProgress(post.id, percent);

      // Active heading
      const headings = document.querySelectorAll("[id^='heading-']");
      let current = "";
      for (const h of headings) {
        const r = h.getBoundingClientRect();
        if (r.top <= 100) current = h.id;
      }
      setActiveHeading(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [post]);

  // Close menus on click/ESC
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

  // Delete (API + local best-effort)
  const handleDelete = useCallback(async () => {
    if (!owner || !post) return;
    if (!confirm("Delete this post?")) return;
    try {
      const mod = await import("../lib/api.js");
      if (typeof mod.deletePost === "function" && post.id) {
        await mod.deletePost(post.id).catch(() => {});
      }
    } finally {
      removeLocalByIdOrSlug(post.id);
      removeLocalByIdOrSlug(post.slug);
      nav("/blog");
    }
  }, [owner, post, nav]);

  // Font/line controls
  const adjustFontSize = useCallback((delta) => {
    setFontSize((p) => Math.max(75, Math.min(150, p + delta)));
  }, []);
  const adjustLineHeight = useCallback((delta) => {
    setLineHeight((p) => Math.max(1.2, Math.min(2.0, Number((p + delta).toFixed(1)))));
  }, []);

  // Bookmark
  const toggleBookmark = useCallback(() => {
    if (!post) return;
    const store = JSON.parse(localStorage.getItem("bookmarkedPosts") || "[]");
    const next = isBookmarked ? store.filter((x) => x !== post.id) : [...store, post.id];
    localStorage.setItem("bookmarkedPosts", JSON.stringify(next));
    setIsBookmarked(!isBookmarked);
  }, [post, isBookmarked]);

  // Share
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const sharePost = (platform) => {
    const title = encodeURIComponent(post?.title || "");
    const text = encodeURIComponent(`Check out this blog post: ${post?.title || ""}`);
    const encodedUrl = encodeURIComponent(currentUrl);
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${title}`,
      copy: currentUrl,
    };
    if (platform === "copy") {
      navigator.clipboard?.writeText(currentUrl).then(() => {
        const btn = document.querySelector('[data-copy-feedback]');
        if (btn) {
          btn.textContent = "Copied!";
          setTimeout(() => (btn.textContent = "Copy Link"), 2000);
        }
      });
    } else {
      window.open(urls[platform], "_blank", "width=600,height=400");
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <section className="container py-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="relative">
              <div className={`animate-spin rounded-full h-12 w-12 border-4 ${darkMode ? 'border-indigo-800' : 'border-indigo-200'}`}></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent absolute top-0"></div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <section className="container py-10">
          <div className="max-w-md mx-auto text-center">
            <div className={`border rounded-xl p-6 ${
              darkMode 
                ? 'bg-red-900/20 border-red-800 text-red-400' 
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              <div className="mb-4 text-lg font-semibold">
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
      </div>
    );
  }

  const tint = clampAccent(post.color);
  const fontFamily = serifFont
    ? post.theme?.fontFamily || "Georgia, serif"
    : post.theme?.fontFamily || "";
  const basePx = post.theme?.basePx || 16;
  const headingScale = post.theme?.headingScale || 1.15;
  const readingTime = estimateReadingTime(normalizedHtml);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        readingMode 
          ? (darkMode ? "bg-gray-950 text-gray-100" : "bg-yellow-50 text-gray-900")
          : (darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900")
      }`}
    >
      {/* Reading progress bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 h-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 shadow-sm"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Nav */}
      <nav className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-sm ${
        darkMode 
          ? 'bg-gray-900/90 border-gray-700' 
          : 'bg-white/90 border-gray-200'
      }`}>
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/blog"
                className={`inline-flex items-center gap-2 transition-colors group ${
                  darkMode 
                    ? 'text-gray-400 hover:text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icons.ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Blog</span>
              </Link>

              <div className={`hidden sm:flex items-center gap-4 text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
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
              {/* Bookmark */}
              <BookmarkButton
                isBookmarked={isBookmarked}
                toggleBookmark={toggleBookmark}
                darkMode={darkMode}
              />

              {/* Font size */}
              <div className={`hidden md:flex items-center gap-1 rounded-lg p-1 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <button
                  onClick={() => adjustFontSize(-10)}
                  className={`p-1.5 rounded-md transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-white'
                  }`}
                  title="Decrease font size"
                >
                  <Icons.ZoomOut size={14} />
                </button>
                <span className={`text-xs min-w-[2.5rem] text-center font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {fontSize}%
                </span>
                <button
                  onClick={() => adjustFontSize(10)}
                  className={`p-1.5 rounded-md transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-white'
                  }`}
                  title="Increase font size"
                >
                  <Icons.ZoomIn size={14} />
                </button>
              </div>

              {/* TOC */}
              {tableOfContents.length > 0 && (
                <button
                  onClick={() => setShowToc((s) => !s)}
                  className={`p-2 rounded-lg transition-colors ${
                    showToc
                      ? (darkMode 
                          ? "bg-indigo-900/30 text-indigo-400" 
                          : "bg-indigo-100 text-indigo-600")
                      : (darkMode 
                          ? "hover:bg-gray-800 text-gray-400" 
                          : "hover:bg-gray-100 text-gray-600")
                  }`}
                  title="Table of contents"
                >
                  <Icons.Menu size={18} />
                </button>
              )}

              {/* Settings */}
              <ReadingSettings
                refEl={settingsRef}
                show={showSettings}
                setShow={setShowSettings}
                fontSize={fontSize}
                setFontSize={setFontSize}
                lineHeight={lineHeight}
                setLineHeight={setLineHeight}
                serifFont={serifFont}
                setSerifFont={setSerifFont}
                readingMode={readingMode}
                setReadingMode={setReadingMode}
                adjustFontSize={adjustFontSize}
                darkMode={darkMode}
              />

              {/* Share */}
              <ShareMenu
                refEl={shareRef}
                show={showShareMenu}
                setShow={setShowShareMenu}
                onShare={sharePost}
                darkMode={darkMode}
              />

              {/* Theme */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-800 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={`Switch to ${darkMode ? "light" : "dark"} mode`}
              >
                {darkMode ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
              </button>

              {/* Owner controls */}
              {owner && (
                <div className={`flex items-center gap-1 pl-2 border-l ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <button
                    onClick={() =>
                      nav(`/blog/edit/${post.slug || post.id}`, {
                        state: {
                          prefill: {
                            id: post.id,
                            slug: post.slug,
                            title: post.title,
                            bodyHtml: post.bodyHtml || post.rawBody || "",
                            tags: post.tags || [],
                            coverImageUrl: post.coverImageUrl || "",
                            status: post.status || "draft",
                            publishedAt: post.createdAt || null,
                            excerpt: post.excerpt || "",
                            color: post.color || "#6366f1",
                            theme: post.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 }
                          },
                        },
                      })
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode 
                        ? 'hover:bg-gray-800 text-gray-400' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Edit post"
                  >
                    <Icons.Edit size={16} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode 
                        ? 'hover:bg-red-900/20 text-red-400' 
                        : 'hover:bg-red-50 text-red-600'
                    }`}
                    title="Delete post"
                  >
                    <Icons.Delete size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* TOC sidebar */}
      {showToc && tableOfContents.length > 0 && (
        <>
          <div
            className={`fixed inset-0 z-20 lg:hidden ${
              darkMode ? 'bg-black/40' : 'bg-black/20'
            }`}
            onClick={() => setShowToc(false)}
          />
          <div className={`fixed top-20 right-4 z-30 w-80 max-h-[75vh] overflow-hidden rounded-xl border shadow-2xl ${
            darkMode 
              ? 'border-gray-700 bg-gray-800' 
              : 'border-gray-200 bg-white'
          }`}>
            <div className={`p-4 border-b ${
              darkMode 
                ? 'border-gray-700 bg-gray-800' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold flex items-center gap-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <Icons.Menu size={16} />
                  Table of Contents
                </h3>
                <button
                  onClick={() => setShowToc(false)}
                  className={`p-1 rounded transition-colors ${
                    darkMode 
                      ? 'hover:bg-gray-600 text-gray-500' 
                      : 'hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>
            <nav className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-1">
                {tableOfContents.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      const el = document.getElementById(h.id);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      setShowToc(false);
                    }}
                    className={`block w-full text-left text-sm transition-all py-2 px-3 rounded-lg ${
                      activeHeading === h.id
                        ? (darkMode 
                            ? "bg-indigo-900/30 text-indigo-300 font-medium" 
                            : "bg-indigo-100 text-indigo-700 font-medium")
                        : (darkMode 
                            ? "text-gray-400 hover:text-white hover:bg-gray-700" 
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")
                    }`}
                    style={{
                      paddingLeft: `${(h.level - 1) * 0.75 + 0.75}rem`,
                      borderLeft: h.level > 2 ? "2px solid rgba(99, 102, 241, 0.2)" : "none",
                      marginLeft: h.level > 2 ? `${(h.level - 2) * 0.5}rem` : "0",
                    }}
                  >
                    <span className="block truncate">{h.text}</span>
                    {h.level <= 2 && <div className={`w-full h-px mt-1 opacity-50 ${
                      darkMode ? 'bg-gray-600' : 'bg-gray-200'
                    }`} />}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Content */}
      <main className="container py-8 transition-all duration-300">
        <Reveal>
          <article
            className="mx-auto max-w-4xl transition-all duration-300"
            data-article-content
            style={{ fontSize: `${fontSize}%`, lineHeight }}
          >
            <header className="mb-12 text-center">
              <div className="relative">
                {post.tags && post.tags.length > 0 && (
                  <div className="mb-6">
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border"
                      style={{
                        backgroundColor: `${tint}15`,
                        borderColor: `${tint}30`,
                        color: tint,
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

                <div className={`flex flex-wrap items-center justify-center gap-6 text-sm mb-8 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    <Icons.Clock size={14} />
                    <span className="font-medium">{readingTime} min read</span>
                  </div>
                  {post.createdAt && (
                    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
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
                    <div className={`flex items-center gap-2 text-xs rounded-full px-3 py-1 ${
                      darkMode 
                        ? 'bg-amber-900/30 text-amber-300' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span>Updated: {new Date(post.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Optional cover */}
                {post.coverImageUrl && (
                  <img
                    src={post.coverImageUrl}
                    alt=""
                    className="mx-auto mb-8 rounded-2xl shadow-lg max-h-[420px] object-cover w-full"
                  />
                )}

                <div className={`w-full rounded-full h-2 mb-8 ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${readingProgress}%`, background: `linear-gradient(90deg, ${tint}, ${tint}80)` }}
                  />
                </div>
              </div>
            </header>

            {/* Body - UPDATED: ensure text is always visible in both modes */}
            <div
              className={`article-content ${
                darkMode ? 'dark-mode-article' : 'light-mode-article'
              }`}
              style={{
                fontFamily: serifFont ? "Georgia, serif" : fontFamily,
                fontSize: basePx,
                background: readingMode ? (darkMode ? "#111827" : "#fffef7") : "transparent",
                borderRadius: readingMode ? "1rem" : "0",
                padding: readingMode ? "2rem" : "0",
                boxShadow: readingMode ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
                // UPDATED: Force text color inheritance for all child elements
                color: darkMode ? "#ffffff" : "#1f2937",
              }}
              dangerouslySetInnerHTML={{ __html: normalizedHtml || "<p><em>No content available</em></p>" }}
            />

            {/* UPDATED CSS - Force text colors to be visible in both modes */}
            <style jsx>{`
              .article-content img { max-width: 100%; height: auto; }
              .article-content table { width: 100%; border-collapse: collapse; }
              .article-content pre { overflow: auto; }
              
              /* ADDED: Force all text to be visible in dark mode */
              .dark-mode-article,
              .dark-mode-article * {
                color: #ffffff !important;
              }
              
              .dark-mode-article h1,
              .dark-mode-article h2,
              .dark-mode-article h3,
              .dark-mode-article h4,
              .dark-mode-article h5,
              .dark-mode-article h6 {
                color: #ffffff !important;
              }
              
              .dark-mode-article p,
              .dark-mode-article div,
              .dark-mode-article span,
              .dark-mode-article li,
              .dark-mode-article td,
              .dark-mode-article th {
                color: #ffffff !important;
              }
              
              /* Ensure light mode text remains visible */
              .light-mode-article,
              .light-mode-article * {
                color: #1f2937 !important;
              }
              
              .light-mode-article h1,
              .light-mode-article h2,
              .light-mode-article h3,
              .light-mode-article h4,
              .light-mode-article h5,
              .light-mode-article h6 {
                color: #1f2937 !important;
              }
              
              /* Special handling for code blocks and pre tags */
              .dark-mode-article pre,
              .dark-mode-article code {
                background-color: #374151 !important;
                color: #e5e7eb !important;
              }
              
              .light-mode-article pre,
              .light-mode-article code {
                background-color: #f3f4f6 !important;
                color: #374151 !important;
              }
            `}</style>

            {/* Floating progress donut */}
            {readingProgress > 10 && readingProgress < 95 && (
              <div className={`fixed bottom-6 right-6 rounded-2xl p-4 shadow-2xl border z-20 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="45" 
                      stroke="currentColor" 
                      strokeWidth="4" 
                      fill="transparent" 
                      className={darkMode ? 'text-gray-700' : 'text-gray-200'} 
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke={tint}
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - readingProgress / 100)}`}
                      className="transition-all duration-300 filter drop-shadow-sm"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-sm font-bold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {Math.round(readingProgress)}%
                    </span>
                    <Icons.BookOpen size={12} className={
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    } />
                  </div>
                </div>
              </div>
            )}
          </article>
        </Reveal>

        {/* Related */}
        {relatedPosts.length > 0 && (
          <Reveal>
            <section className={`max-w-4xl mx-auto mt-20 pt-12 border-t ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="text-center mb-8">
                <h2 className={`text-3xl font-bold mb-3 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Related Articles
                </h2>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Continue your reading journey with these related posts
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {relatedPosts.map((rp) => {
                  const rt = clampAccent(rp.color);
                  const rtRaw = pickBodyRaw(rp);
                  const rtHtml = looksLikeHtml(rtRaw) ? normalizeAlignmentTokens(stripCopyHighlights(rtRaw)) : mdToHtml(rtRaw);
                  const rtTime = estimateReadingTime(rtHtml);
                  const excerpt = stripHtml(rtHtml).slice(0, 120);
                  return (
                    <Link key={rp.id} to={`/blog/${rp.slug || rp.id}`} className="group block">
                      <article className={`h-full p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                        darkMode 
                          ? 'border-gray-700 bg-gray-800 hover:border-gray-600' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <div className="flex items-start gap-3 mb-4">
                          <div 
                            className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: rt }}
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-semibold text-lg mb-2 line-clamp-2 group-hover:underline ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {rp.title}
                            </h3>
                            {excerpt && (
                              <p className={`text-sm mb-3 line-clamp-3 ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {excerpt}...
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={`flex items-center justify-between text-xs ${
                          darkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Icons.Clock size={12} />
                              {rtTime} min
                            </span>
                            {rp.createdAt && (
                              <span>
                                {new Date(rp.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {rp.tags && rp.tags.length > 0 && (
                            <span 
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${rt}15`,
                                color: rt,
                              }}
                            >
                              {rp.tags[0]}
                            </span>
                          )}
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          </Reveal>
        )}
      </main>
    </div>
  );
}

/* ----------------------------- Helper Components ----------------------------- */

function BookmarkButton({ isBookmarked, toggleBookmark, darkMode }) {
  return (
    <button
      onClick={toggleBookmark}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isBookmarked
          ? (darkMode 
              ? "bg-yellow-900/30 text-yellow-400" 
              : "bg-yellow-100 text-yellow-600")
          : (darkMode 
              ? "hover:bg-gray-800 text-gray-400" 
              : "hover:bg-gray-100 text-gray-600")
      }`}
      title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <Icons.Bookmark 
        size={18} 
        className={isBookmarked ? "fill-current" : ""} 
      />
    </button>
  );
}

function ReadingSettings({ 
  refEl, show, setShow, fontSize, setFontSize, lineHeight, setLineHeight, 
  serifFont, setSerifFont, readingMode, setReadingMode, adjustFontSize, darkMode 
}) {
  return (
    <div ref={refEl} className="relative">
      <button
        onClick={() => setShow(!show)}
        className={`p-2 rounded-lg transition-colors ${
          show
            ? (darkMode 
                ? "bg-indigo-900/30 text-indigo-400" 
                : "bg-indigo-100 text-indigo-600")
            : (darkMode 
                ? "hover:bg-gray-800 text-gray-400" 
                : "hover:bg-gray-100 text-gray-600")
        }`}
        title="Reading preferences"
      >
        <Icons.Settings size={18} />
      </button>

      {show && (
        <div className={`absolute top-full right-0 mt-2 w-80 rounded-xl border shadow-xl z-30 ${
          darkMode 
            ? 'border-gray-700 bg-gray-800' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className={`p-4 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h3 className={`font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Reading Preferences
            </h3>
          </div>
          <div className="p-4 space-y-6">
            {/* Font Size */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Font Size: {fontSize}%
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustFontSize(-10)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  -
                </button>
                <input
                  type="range"
                  min="75"
                  max="150"
                  step="5"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <button
                  onClick={() => adjustFontSize(10)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Line Height: {lineHeight}
              </label>
              <input
                type="range"
                min="1.2"
                max="2.0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Serif Font
                </span>
                <input
                  type="checkbox"
                  checked={serifFont}
                  onChange={(e) => setSerifFont(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-11 h-6 rounded-full transition-colors ${
                  serifFont 
                    ? 'bg-indigo-600' 
                    : (darkMode ? 'bg-gray-600' : 'bg-gray-200')
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    serifFont ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Reading Mode
                </span>
                <input
                  type="checkbox"
                  checked={readingMode}
                  onChange={(e) => setReadingMode(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-11 h-6 rounded-full transition-colors ${
                  readingMode 
                    ? 'bg-indigo-600' 
                    : (darkMode ? 'bg-gray-600' : 'bg-gray-200')
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    readingMode ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareMenu({ refEl, show, setShow, onShare, darkMode }) {
  const shareOptions = [
    { key: 'twitter', label: 'Twitter', icon: '𝕏' },
    { key: 'facebook', label: 'Facebook', icon: '📘' },
    { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { key: 'reddit', label: 'Reddit', icon: '🤖' },
    { key: 'copy', label: 'Copy Link', icon: '🔗' },
  ];

  return (
    <div ref={refEl} className="relative">
      <button
        onClick={() => setShow(!show)}
        className={`p-2 rounded-lg transition-colors ${
          show
            ? (darkMode 
                ? "bg-indigo-900/30 text-indigo-400" 
                : "bg-indigo-100 text-indigo-600")
            : (darkMode 
                ? "hover:bg-gray-800 text-gray-400" 
                : "hover:bg-gray-100 text-gray-600")
        }`}
        title="Share post"
      >
        <Icons.Share size={18} />
      </button>

      {show && (
        <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl border shadow-xl z-30 ${
          darkMode 
            ? 'border-gray-700 bg-gray-800' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className="p-2">
            {shareOptions.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => {
                  onShare(key);
                  setShow(false);
                }}
                data-copy-feedback={key === 'copy' ? 'true' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}