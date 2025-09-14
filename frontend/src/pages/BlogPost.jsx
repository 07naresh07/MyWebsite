import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useOwnerMode } from "../lib/owner.js";

/* ----------------------------- Local Storage & Utilities ----------------------------- */
const LS_KEY = "localBlogs";
const THEME_KEY = "blog_theme";
const READING_PROGRESS_KEY = "readingProgress";
const READING_PREFERENCES_KEY = "readingPreferences";
const READING_STATS_KEY = "readingStats";
const READING_PROFILES_KEY = "readingProfiles";

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

const saveReadingPreferences = (prefs) => {
  try {
    localStorage.setItem(READING_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {}
};

const getReadingPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem(READING_PREFERENCES_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveReadingProfile = (name, profile) => {
  try {
    const profiles = getReadingProfiles();
    profiles[name] = profile;
    localStorage.setItem(READING_PROFILES_KEY, JSON.stringify(profiles));
  } catch {}
};

const getReadingProfiles = () => {
  try {
    return JSON.parse(localStorage.getItem(READING_PROFILES_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveReadingProgress = (postId, progress, wordsRead = 0) => {
  try {
    const data = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY) || "{}");
    data[postId] = { progress, wordsRead, timestamp: Date.now() };
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(data));
  } catch {}
};

const getReadingProgress = (postId) => {
  try {
    const data = JSON.parse(localStorage.getItem(READING_PROGRESS_KEY) || "{}");
    return data[postId] || { progress: 0, wordsRead: 0 };
  } catch {
    return { progress: 0, wordsRead: 0 };
  }
};

const updateReadingStats = (wordsRead, timeSpent) => {
  try {
    const stats = JSON.parse(localStorage.getItem(READING_STATS_KEY) || "{}");
    const today = new Date().toDateString();
    
    if (!stats[today]) {
      stats[today] = { wordsRead: 0, timeSpent: 0, sessions: 0 };
    }
    
    stats[today].wordsRead += wordsRead;
    stats[today].timeSpent += timeSpent;
    stats[today].sessions += 1;
    
    localStorage.setItem(READING_STATS_KEY, JSON.stringify(stats));
  } catch {}
};

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

const countWords = (html) => {
  const text = (html || "").replace(/<[^>]*>/g, " ");
  return text.trim() ? text.trim().split(/\s+/).length : 0;
};

const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(String(s || ""));

/* ----------------------------- Reading Themes ----------------------------- */
const READING_THEMES = {
  default: {
    name: "Default",
    light: { background: "#ffffff", text: "#1f2937", accent: "#6366f1", secondary: "#6b7280", border: "#e5e7eb", code: "#f3f4f6" },
    dark: { background: "#111827", text: "#ffffff", accent: "#818cf8", secondary: "#9ca3af", border: "#374151", code: "#374151" }
  },
  sepia: {
    name: "Sepia",
    light: { background: "#f4f1ea", text: "#5d4e37", accent: "#8b4513", secondary: "#8b7765", border: "#d4c4a0", code: "#e8e0d0" },
    dark: { background: "#2c2416", text: "#d4c4a0", accent: "#cd853f", secondary: "#a0956b", border: "#4a3f2a", code: "#3d3425" }
  },
  forest: {
    name: "Forest",
    light: { background: "#f0f8f0", text: "#2d5016", accent: "#22c55e", secondary: "#65a30d", border: "#bbf7d0", code: "#dcfce7" },
    dark: { background: "#1a2e1a", text: "#b8d8b8", accent: "#4ade80", secondary: "#84cc16", border: "#166534", code: "#14532d" }
  },
  ocean: {
    name: "Ocean",
    light: { background: "#f0f9ff", text: "#0c4a6e", accent: "#0ea5e9", secondary: "#0284c7", border: "#bae6fd", code: "#e0f2fe" },
    dark: { background: "#0c1e2e", text: "#bae6fd", accent: "#38bdf8", secondary: "#7dd3fc", border: "#1e40af", code: "#1e3a8a" }
  },
  highContrast: {
    name: "High Contrast",
    light: { background: "#ffffff", text: "#000000", accent: "#0000ff", secondary: "#333333", border: "#000000", code: "#f5f5f5" },
    dark: { background: "#000000", text: "#ffffff", accent: "#00ffff", secondary: "#cccccc", border: "#ffffff", code: "#1a1a1a" }
  },
  vintage: {
    name: "Vintage",
    light: { background: "#fdf6e3", text: "#8b4513", accent: "#b8860b", secondary: "#a0522d", border: "#deb887", code: "#f5deb3" },
    dark: { background: "#2b1810", text: "#deb887", accent: "#daa520", secondary: "#cd853f", border: "#8b4513", code: "#3c2414" }
  }
};

const FONT_FAMILIES = {
  default: { name: "System Default", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  serif: { name: "Classic Serif", value: "Georgia, 'Times New Roman', serif" },
  modern: { name: "Modern Sans", value: "'Inter', 'Helvetica Neue', Arial, sans-serif" },
  monospace: { name: "Monospace", value: "'Fira Code', 'Monaco', 'Consolas', monospace" },
  literata: { name: "Literata", value: "'Literata', Georgia, serif" },
  crimson: { name: "Crimson Text", value: "'Crimson Text', Georgia, serif" },
  openSans: { name: "Open Sans", value: "'Open Sans', Arial, sans-serif" },
  sourceSerif: { name: "Source Serif Pro", value: "'Source Serif Pro', Georgia, serif" }
};

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
      <line x1="11" y1="8" x2="11" y2="14" />
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
  Bookmark: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Focus: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M5.05 5.05l4.24 4.24m5.66 5.66l4.24 4.24M1 12h6m6 0h6M5.05 18.95l4.24-4.24m5.66-5.66l4.24-4.24" />
    </svg>
  ),
  Type: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="4,7 4,4 20,4 20,7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  Play: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  ),
  Pause: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  Target: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Zap: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  ),
  Eye: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
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
  Brain: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
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
  Palette: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  X: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
};

/* ----------------------------- Enhanced Markdown Converter ----------------------------- */
function mdToHtml(md) {
  if (!md) return "";
  let src = String(md).replace(/\r\n?/g, "\n");

  // Enhanced inline formatting
  const inline = (s) =>
    s
      // Handle images first - ![alt](url) or ![alt](url "title")
      .replace(/!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g, '<img src="$2" alt="$1" title="$3" loading="lazy" />')
      // Handle links - [text](url) or [text](url "title")
      .replace(/\[([^\]]+)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g, '<a href="$2" title="$3">$1</a>')
      // Handle inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Handle bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Handle italic text
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Handle strikethrough
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      // Handle highlighting/mark
      .replace(/==(.+?)==/g, '<mark>$1</mark>');

  // Handle code blocks first (to avoid processing them as other elements)
  src = src.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // Split into lines for processing
  src = src
    .split("\n")
    .map((line) => {
      // Handle headers
      if (/^######\s+/.test(line)) return line.replace(/^######\s+(.+)$/, "<h6>$1</h6>");
      if (/^#####\s+/.test(line)) return line.replace(/^#####\s+(.+)$/, "<h5>$1</h5>");
      if (/^####\s+/.test(line)) return line.replace(/^####\s+(.+)$/, "<h4>$1</h4>");
      if (/^###\s+/.test(line)) return line.replace(/^###\s+(.+)$/, "<h3>$1</h3>");
      if (/^##\s+/.test(line)) return line.replace(/^##\s+(.+)$/, "<h2>$1</h2>");
      if (/^#\s+/.test(line)) return line.replace(/^#\s+(.+)$/, "<h1>$1</h1>");
      
      // Handle blockquotes
      if (/^>\s+/.test(line)) return line.replace(/^>\s+(.+)$/, "<blockquote>$1</blockquote>");
      
      // Handle horizontal rules
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) return "<hr>";
      
      return line;
    })
    .join("\n");

  // Split into blocks for paragraph processing
  const blocks = src.split(/\n{2,}/);
  const htmlBlocks = blocks.map((block) => {
    if (!block.trim()) return "";
    
    // Skip if already HTML
    const hasHtml = /<\/?(div|h[1-6]|ul|ol|li|pre|blockquote|table|p|img|code|span|hr)/i.test(block);
    if (hasHtml) return block;
    
    const lines = block.split("\n");
    
    // Handle unordered lists (-, *, +)
    const isUL = lines.length > 0 && lines.every((l) => /^\s*[-*+]\s+/.test(l));
    if (isUL) {
      const items = lines
        .map((l) => l.replace(/^\s*[-*+]\s+/, ""))
        .map((li) => `<li>${inline(li)}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    
    // Handle ordered lists (1., 2., etc.)
    const isOL = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));
    if (isOL) {
      const items = lines
        .map((l) => l.replace(/^\s*\d+\.\s+/, ""))
        .map((li) => `<li>${inline(li)}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }

    // Handle table detection (basic)
    if (lines.some(l => l.includes("|"))) {
      const tableLines = lines.filter(l => l.includes("|"));
      if (tableLines.length >= 2) {
        let tableHtml = "<table>";
        tableLines.forEach((line, index) => {
          if (index === 1 && line.match(/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/)) {
            return; // Skip separator line
          }
          const cells = line.split("|").map(cell => cell.trim()).filter(cell => cell !== "");
          const tag = index === 0 ? "th" : "td";
          const row = cells.map(cell => `<${tag}>${inline(cell)}</${tag}>`).join("");
          tableHtml += `<tr>${row}</tr>`;
        });
        tableHtml += "</table>";
        return tableHtml;
      }
    }

    // Regular paragraph
    return `<p>${inline(block).replace(/\n/g, "<br/>")}</p>`;
  });

  return htmlBlocks.filter(block => block.trim()).join("");
}

function pickBodyRaw(src) {
  if (!src) return "";
  const cands = ["content", "bodyHtml", "body", "html", "markdown", "text"];
  for (const k of cands) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function stripCopyHighlights(html) {
  try {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    
    // Only remove specific copy-related highlights, not all styling
    doc.querySelectorAll("mark[data-copy-highlight]").forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      el.remove();
    });
    
    // Only remove copy-related background colors, preserve intentional styling
    doc.querySelectorAll("[style]").forEach((el) => {
      const style = el.getAttribute("style") || "";
      const cleaned = style
        .replace(/background(?:-color)?\s*:\s*rgba?\(255,\s*255,\s*0[^)]*\);?/gi, "")  // Only yellow highlights
        .replace(/\s*;\s*$/g, "");
      if (cleaned.trim()) el.setAttribute("style", cleaned);
      else if (cleaned !== style) el.removeAttribute("style");
    });
    
    return doc.body.innerHTML;
  } catch {
    return html || "";
  }
}

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

function stripHtml(html) {
  try {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || div.innerText || "").trim();
  } catch {
    return "";
  }
}

/* ----------------------------- Main Component ----------------------------- */
export default function BlogPost() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { owner } = useOwnerMode();

  // Safe theme calculation
  const getThemeColors = useCallback((isDark, themeName) => {
    const theme = READING_THEMES[themeName] || READING_THEMES.default;
    return theme[isDark ? 'dark' : 'light'];
  }, []);

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Basic theme state
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" || 
             (!localStorage.getItem(THEME_KEY) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch {
      return false;
    }
  });

  // Enhanced reading preferences
  const [readingTheme, setReadingTheme] = useState("default");
  const [fontSize, setFontSize] = useState(100);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [fontFamily, setFontFamily] = useState("default");
  const [readingMode, setReadingMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [blueLight, setBlueLight] = useState(0);
  const [wordSpacing, setWordSpacing] = useState(0);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [paragraphSpacing, setParagraphSpacing] = useState(1);
  const [margins, setMargins] = useState(1);
  const [currentProfile, setCurrentProfile] = useState("default");

  // Smart features
  const [autoNightMode, setAutoNightMode] = useState(false);
  const [binocularView, setBinocularView] = useState(false);

  // UI state
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [activeTab, setActiveTab] = useState("typography");

  // Reading tracking
  const [readingProgress, setReadingProgress] = useState(0);
  const [wordsRead, setWordsRead] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(200);
  const [timeSpent, setTimeSpent] = useState(0);
  const [sessionStart] = useState(Date.now());

  const settingsRef = useRef(null);
  const profilesRef = useRef(null);
  const shareRef = useRef(null);

  // rAF-based auto scroll refs
  const autoScrollRafRef = useRef(null);
  const lastTsRef = useRef(0);
  const pauseUntilRef = useRef(0);

  // Always safe theme colors
  const themeColors = getThemeColors(darkMode, readingTheme);

  // Load preferences
  useEffect(() => {
    try {
      const prefs = getReadingPreferences();
      if (prefs.readingTheme && READING_THEMES[prefs.readingTheme]) setReadingTheme(prefs.readingTheme);
      if (typeof prefs.fontSize === 'number') setFontSize(prefs.fontSize);
      if (typeof prefs.lineHeight === 'number') setLineHeight(prefs.lineHeight);
      if (prefs.fontFamily && FONT_FAMILIES[prefs.fontFamily]) setFontFamily(prefs.fontFamily);
      if (typeof prefs.readingMode === 'boolean') setReadingMode(prefs.readingMode);
      if (typeof prefs.focusMode === 'boolean') setFocusMode(prefs.focusMode);
      if (typeof prefs.blueLight === 'number') setBlueLight(prefs.blueLight);
      if (typeof prefs.wordSpacing === 'number') setWordSpacing(prefs.wordSpacing);
      if (typeof prefs.letterSpacing === 'number') setLetterSpacing(prefs.letterSpacing);
      if (typeof prefs.paragraphSpacing === 'number') setParagraphSpacing(prefs.paragraphSpacing);
      if (typeof prefs.margins === 'number') setMargins(prefs.margins);
      if (typeof prefs.autoNightMode === 'boolean') setAutoNightMode(prefs.autoNightMode);
      if (typeof prefs.binocularView === 'boolean') setBinocularView(prefs.binocularView);
    } catch {}
  }, []);

  // Save preferences
  useEffect(() => {
    saveReadingPreferences({
      readingTheme, fontSize, lineHeight, fontFamily, readingMode, focusMode, 
      blueLight, wordSpacing, letterSpacing, paragraphSpacing, margins,
      autoNightMode, binocularView
    });
  }, [readingTheme, fontSize, lineHeight, fontFamily, readingMode, focusMode, 
      blueLight, wordSpacing, letterSpacing, paragraphSpacing, margins,
      autoNightMode, binocularView]);

  // Auto night mode
  useEffect(() => {
    if (!autoNightMode) return;
    const checkTime = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour < 6 || hour > 20;
      if (shouldBeDark !== darkMode) {
        setDarkMode(shouldBeDark);
      }
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [autoNightMode, darkMode]);

  // Smooth Auto Scroll with user override
  useEffect(() => {
    const pauseFor = (ms) => { pauseUntilRef.current = Date.now() + ms; };
    const handleWheel = () => pauseFor(2000);
    const handleTouch = () => pauseFor(2000);
    const handleKey = (e) => {
      // Common scroll/navigation keys
      const keys = ["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "];
      if (keys.includes(e.key)) pauseFor(2000);
    };

    if (autoScroll) {
      window.addEventListener("wheel", handleWheel, { passive: true });
      window.addEventListener("touchstart", handleTouch, { passive: true });
      window.addEventListener("touchmove", handleTouch, { passive: true });
      window.addEventListener("keydown", handleKey);

      const step = (ts) => {
        if (!autoScroll) return; // bail if toggled off
        if (!lastTsRef.current) lastTsRef.current = ts;

        const now = Date.now();
        if (now < pauseUntilRef.current) {
          autoScrollRafRef.current = requestAnimationFrame(step);
          return;
        }

        // Convert slider (0.5–5) to px/sec (30–300)
        const pxPerSec = Math.max(0.5, Number(scrollSpeed)) * 60;
        const dt = (ts - lastTsRef.current) / 1000; // seconds
        lastTsRef.current = ts;

        const dy = pxPerSec * dt;
        window.scrollBy(0, dy);

        autoScrollRafRef.current = requestAnimationFrame(step);
      };

      autoScrollRafRef.current = requestAnimationFrame(step);

      return () => {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchstart", handleTouch);
        window.removeEventListener("touchmove", handleTouch);
        window.removeEventListener("keydown", handleKey);
        if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
        lastTsRef.current = 0;
        pauseUntilRef.current = 0;
      };
    } else {
      // ensure listeners are off if toggled off
      return () => {};
    }
  }, [autoScroll, scrollSpeed]);

  // Apply theme
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("dark", darkMode);
      localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
      document.body.style.backgroundColor = themeColors.background;
      document.body.style.color = themeColors.text;
      document.body.style.filter = blueLight > 0 ? `sepia(${blueLight}%) saturate(90%)` : 'none';
      document.body.style.transition = "all 0.3s ease";
    } catch {}
  }, [darkMode, themeColors, blueLight]);

  // Load post
  const tryLoadFromApi = useCallback(async (slugLike) => {
    try {
      const mod = await import("../lib/api.js");
      if (typeof mod.getPost === "function") {
        return await mod.getPost(slugLike);
      }
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        let found = null;
        const local = getLocalByIdOrSlug(slug);

        if (local) {
          found = {
            id: local.id || slug,
            slug: local.slug || slugify(local.title || slug),
            title: local.title || "Untitled",
            rawBody: pickBodyRaw(local),
            bodyHtml: local.bodyHtml || "",
            tags: Array.isArray(local.tags) ? local.tags : [],
            color: local.color || "#6366f1",
            createdAt: local.createdAt || new Date().toISOString(),
            coverImageUrl: local.coverImageUrl || "",
          };
        } else {
          const api = await tryLoadFromApi(slug);
          if (api) {
            found = {
              id: api.id || slug,
              slug: api.slug || slugify(api.title || slug),
              title: api.title || "Untitled",
              rawBody: pickBodyRaw(api),
              tags: Array.isArray(api.tags) ? api.tags : [],
              color: api.color || "#6366f1",
              createdAt: api.createdAt || api.publishedAt || new Date().toISOString(),
              coverImageUrl: api.coverImageUrl || "",
            };
          }
        }

        if (!mounted) return;

        if (!found) {
          setError("Blog post not found");
          return;
        }

        setPost(found);

        // Related posts
        const all = readLocal();
        const related = all
          .filter(p => String(p.id) !== String(found.id || slug) && 
                      (p.tags || []).some(t => (found.tags || []).includes(t)))
          .slice(0, 3);
        setRelatedPosts(related);

        const progress = getReadingProgress(found.id || slug);
        setReadingProgress(progress.progress);
        setWordsRead(progress.wordsRead);
        
        const bookmarks = JSON.parse(localStorage.getItem("bookmarkedPosts") || "[]");
        setIsBookmarked(bookmarks.includes(found.id || slug));

        document.title = `${found.title || "Untitled"} — Blog`;
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load post");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug, tryLoadFromApi]);

  // Build HTML
  const normalizedHtml = useMemo(() => {
    if (!post?.rawBody && !post?.bodyHtml) return "";
    let htmlCandidate = post?.bodyHtml || post?.rawBody || "";
    if (!looksLikeHtml(htmlCandidate)) {
      htmlCandidate = mdToHtml(htmlCandidate);
    }
    const withoutHighlights = stripCopyHighlights(htmlCandidate);
    return addHeadingIds(withoutHighlights);
  }, [post?.rawBody, post?.bodyHtml]);

  const tableOfContents = useMemo(() => {
    return normalizedHtml ? buildTOC(normalizedHtml) : [];
  }, [normalizedHtml]);

  const totalWords = useMemo(() => {
    return countWords(normalizedHtml);
  }, [normalizedHtml]);

  // Enhanced reading progress tracking
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

      const percent = Math.min(100, Math.max(0, ((scrollTop + windowHeight - articleTop) / articleHeight) * 100));
      setReadingProgress(percent);
      
      const newWordsRead = Math.floor((totalWords * percent) / 100);
      setWordsRead(newWordsRead);
      
      if (percent > 5) {
        saveReadingProgress(post.id, percent, newWordsRead);
      }

      // Update reading speed
      const timeElapsed = (Date.now() - sessionStart) / 60000;
      if (timeElapsed > 0 && newWordsRead > 0) {
        setReadingSpeed(Math.round(newWordsRead / timeElapsed));
      }

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
  }, [post, totalWords, sessionStart]);

  // Track time spent
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearInterval(interval);
      if (timeSpent > 30) {
        updateReadingStats(wordsRead, timeSpent);
      }
    };
  }, [wordsRead, timeSpent]);

  // Close menus on click outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (showSettings && settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
      if (showProfiles && profilesRef.current && !profilesRef.current.contains(e.target)) {
        setShowProfiles(false);
      }
      if (showShareMenu && shareRef.current && !shareRef.current.contains(e.target)) {
        setShowShareMenu(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setShowSettings(false);
        setShowProfiles(false);
        setShowShareMenu(false);
        setShowToc(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showSettings, showProfiles, showShareMenu]);

  // Handlers
  const toggleTheme = useCallback(() => setDarkMode(d => !d), []);
  const adjustFontSize = useCallback((delta) => setFontSize(p => Math.max(50, Math.min(200, p + delta))), []);
  const adjustLineHeight = useCallback((delta) => setLineHeight(p => Math.max(1.0, Math.min(3.0, Number((p + delta).toFixed(1))))), []);
  
  const toggleBookmark = useCallback(() => {
    if (!post) return;
    const store = JSON.parse(localStorage.getItem("bookmarkedPosts") || "[]");
    const next = isBookmarked ? store.filter(x => x !== post.id) : [...store, post.id];
    localStorage.setItem("bookmarkedPosts", JSON.stringify(next));
    setIsBookmarked(!isBookmarked);
  }, [post, isBookmarked]);

  const handleDelete = useCallback(async () => {
    if (!owner || !post) return;
    if (!confirm("Delete this post?")) return;
    try {
      const mod = await import("../lib/api.js");
      if (typeof mod.deletePost === "function") {
        await mod.deletePost(post.id).catch(() => {});
      }
    } finally {
      removeLocalByIdOrSlug(post.id);
      nav("/blog");
    }
  }, [owner, post, nav]);

  // Profile management (no highlight flag anymore)
  const saveProfile = useCallback((name) => {
    const profile = {
      readingTheme, fontSize, lineHeight, fontFamily, readingMode, focusMode,
      blueLight, wordSpacing, letterSpacing, paragraphSpacing, margins,
      binocularView
    };
    saveReadingProfile(name, profile);
  }, [readingTheme, fontSize, lineHeight, fontFamily, readingMode, focusMode,
      blueLight, wordSpacing, letterSpacing, paragraphSpacing, margins,
      binocularView]);

  const loadProfile = useCallback((name) => {
    const profiles = getReadingProfiles();
    const profile = profiles[name];
    if (!profile) return;
    
    setReadingTheme(profile.readingTheme || "default");
    setFontSize(profile.fontSize || 100);
    setLineHeight(profile.lineHeight || 1.6);
    setFontFamily(profile.fontFamily || "default");
    setReadingMode(profile.readingMode || false);
    setFocusMode(profile.focusMode || false);
    setBlueLight(profile.blueLight || 0);
    setWordSpacing(profile.wordSpacing || 0);
    setLetterSpacing(profile.letterSpacing || 0);
    setParagraphSpacing(profile.paragraphSpacing || 1);
    setMargins(profile.margins || 1);
    setBinocularView(profile.binocularView || false);
    setCurrentProfile(name);
  }, []);

  // Share functionality
  const sharePost = (platform) => {
    const currentUrl = window.location.href;
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
      <div style={{ backgroundColor: themeColors.background, color: themeColors.text, minHeight: "100vh" }}>
        <div className="container py-10 flex items-center justify-center min-h-[400px]">
          <div className="relative">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-4"
              style={{ borderColor: `${themeColors.accent}30`, borderTopColor: themeColors.accent }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ backgroundColor: themeColors.background, color: themeColors.text, minHeight: "100vh" }}>
        <div className="container py-10">
          <div className="max-w-md mx-auto text-center">
            <div 
              className="border rounded-xl p-6"
              style={{ 
                backgroundColor: `${themeColors.accent}15`,
                borderColor: `${themeColors.accent}30`
              }}
            >
              <div className="mb-4 text-lg font-semibold">{error || "Post not found"}</div>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: themeColors.accent, color: themeColors.background }}
              >
                <Icons.ArrowLeft size={16} />
                Back to Blog
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tint = clampAccent(post.color);
  const selectedFont = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.default;
  const readingTime = estimateReadingTime(normalizedHtml);
  const remainingTime = Math.max(0, readingTime - Math.floor((wordsRead / totalWords) * readingTime));

  return (
    <div style={{ 
      backgroundColor: focusMode ? (darkMode ? "#000000" : "#ffffff") : themeColors.background, 
      color: themeColors.text, 
      minHeight: "100vh" 
    }}>
      {/* Enhanced progress bar */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 h-1"
        style={{ backgroundColor: `${themeColors.accent}20` }}
      >
        <div
          className="h-full transition-all duration-300 shadow-sm"
          style={{ 
            width: `${readingProgress}%`, 
            background: `linear-gradient(90deg, ${themeColors.accent}, ${tint})`
          }}
        />
      </div>

      {/* Enhanced navigation */}
      <nav 
        className="sticky top-0 z-40 backdrop-blur-md border-b shadow-sm"
        style={{ 
          backgroundColor: `${themeColors.background}90`, 
          borderColor: themeColors.border 
        }}
      >
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 transition-all duration-200 group hover:scale-105"
                style={{ color: themeColors.secondary }}
              >
                <Icons.ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Blog</span>
              </Link>

              <div 
                className="hidden sm:flex items-center gap-4 text-sm"
                style={{ color: themeColors.secondary }}
              >
                <div className="flex items-center gap-1">
                  <Icons.Clock size={14} />
                  <span>{remainingTime}m left</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icons.BookOpen size={14} />
                  <span>{Math.round(readingProgress)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icons.Zap size={14} />
                  <span>{readingSpeed} WPM</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Bookmark */}
              <button
                onClick={toggleBookmark}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: isBookmarked ? `${themeColors.accent}20` : "transparent",
                  color: isBookmarked ? themeColors.accent : themeColors.secondary
                }}
                title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              >
                <Icons.Bookmark size={18} className={isBookmarked ? "fill-current" : ""} />
              </button>

              {/* Focus mode toggle */}
              <button
                onClick={() => setFocusMode(!focusMode)}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: focusMode ? `${themeColors.accent}20` : "transparent",
                  color: focusMode ? themeColors.accent : themeColors.secondary
                }}
                title="Focus mode"
              >
                <Icons.Focus size={18} />
              </button>

              {/* Auto scroll control */}
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: autoScroll ? `${themeColors.accent}20` : "transparent",
                  color: autoScroll ? themeColors.accent : themeColors.secondary
                }}
                title="Auto scroll"
              >
                {autoScroll ? <Icons.Pause size={18} /> : <Icons.Play size={18} />}
              </button>

              {/* Font size controls */}
              <div 
                className="hidden md:flex items-center gap-1 rounded-lg p-1"
                style={{ backgroundColor: `${themeColors.accent}10` }}
              >
                <button
                  onClick={() => adjustFontSize(-10)}
                  className="p-1.5 rounded-md transition-all duration-200 hover:scale-110"
                  style={{ 
                    backgroundColor: `${themeColors.accent}20`,
                    color: themeColors.text
                  }}
                  title="Decrease font size"
                >
                  <Icons.ZoomOut size={14} />
                </button>
                <span 
                  className="text-xs min-w-[2.5rem] text-center font-medium"
                  style={{ color: themeColors.secondary }}
                >
                  {fontSize}%
                </span>
                <button
                  onClick={() => adjustFontSize(10)}
                  className="p-1.5 rounded-md transition-all duration-200 hover:scale-110"
                  style={{ 
                    backgroundColor: `${themeColors.accent}20`,
                    color: themeColors.text
                  }}
                  title="Increase font size"
                >
                  <Icons.ZoomIn size={14} />
                </button>
              </div>

              {/* TOC */}
              {tableOfContents.length > 0 && (
                <button
                  onClick={() => setShowToc(!showToc)}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                  style={{
                    backgroundColor: showToc ? `${themeColors.accent}20` : "transparent",
                    color: showToc ? themeColors.accent : themeColors.secondary
                  }}
                  title="Table of contents"
                >
                  <Icons.Menu size={18} />
                </button>
              )}

              {/* Reading profiles */}
              <ReadingProfiles
                refEl={profilesRef}
                show={showProfiles}
                setShow={setShowProfiles}
                currentProfile={currentProfile}
                onSave={saveProfile}
                onLoad={loadProfile}
                themeColors={themeColors}
              />

              {/* Enhanced settings */}
              <EnhancedReadingSettings
                refEl={settingsRef}
                show={showSettings}
                setShow={setShowSettings}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                // Theme settings
                readingTheme={readingTheme}
                setReadingTheme={setReadingTheme}
                // Typography
                fontSize={fontSize}
                setFontSize={setFontSize}
                lineHeight={lineHeight}
                setLineHeight={setLineHeight}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                wordSpacing={wordSpacing}
                setWordSpacing={setWordSpacing}
                letterSpacing={letterSpacing}
                setLetterSpacing={setLetterSpacing}
                paragraphSpacing={paragraphSpacing}
                setParagraphSpacing={setParagraphSpacing}
                margins={margins}
                setMargins={setMargins}
                // Reading modes
                readingMode={readingMode}
                setReadingMode={setReadingMode}
                focusMode={focusMode}
                setFocusMode={setFocusMode}
                binocularView={binocularView}
                setBinocularView={setBinocularView}
                // Comfort
                blueLight={blueLight}
                setBlueLight={setBlueLight}
                autoNightMode={autoNightMode}
                setAutoNightMode={setAutoNightMode}
                // Auto scroll
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
                scrollSpeed={scrollSpeed}
                setScrollSpeed={setScrollSpeed}
                // Helpers
                adjustFontSize={adjustFontSize}
                themeColors={themeColors}
              />

              {/* Share menu */}
              <ShareMenu
                refEl={shareRef}
                show={showShareMenu}
                setShow={setShowShareMenu}
                onShare={sharePost}
                themeColors={themeColors}
              />

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                style={{ color: themeColors.secondary }}
                title={`Switch to ${darkMode ? "light" : "dark"} mode`}
              >
                {darkMode ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
              </button>

              {/* Owner controls */}
              {owner && (
                <div 
                  className="flex items-center gap-1 pl-2 border-l"
                  style={{ borderColor: themeColors.border }}
                >
                  <button
                    onClick={() => nav(`/blog/edit/${post.slug || post.id}`)}
                    className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                    style={{ color: themeColors.secondary }}
                    title="Edit post"
                  >
                    <Icons.Edit size={16} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                    style={{ color: "#ef4444" }}
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

      {/* Enhanced TOC sidebar */}
      {showToc && tableOfContents.length > 0 && (
        <EnhancedTOC
          tableOfContents={tableOfContents}
          activeHeading={activeHeading}
          onClose={() => setShowToc(false)}
          themeColors={themeColors}
        />
      )}

      {/* Focus Mode Stats - widened and clearer layout */}
      {focusMode && (
        <div 
          className="fixed top-32 left-4 sm:left-6 lg:top-36 lg:left-8 rounded-xl p-3 sm:p-4 shadow-2xl border z-30 transition-all duration-300 hover:scale-105"
          style={{ 
            backgroundColor: `${themeColors.background}98`,
            borderColor: `${themeColors.accent}30`,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 20px 40px ${themeColors.accent}15, 0 0 0 1px ${themeColors.accent}20`,
            minWidth: "240px"
          }}
        >
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-center mb-2">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: themeColors.accent }}
              />
              <span className="ml-2 font-semibold" style={{ color: themeColors.accent }}>Focus Mode</span>
            </div>
            
            <div className="space-y-2">
              {/* Each row now uses a 2-col grid with gap */}
              <div
                className="grid items-center"
                style={{ gridTemplateColumns: "1fr auto", columnGap: "12px", color: themeColors.secondary }}
              >
                <div className="flex items-center gap-2" style={{ minWidth: 110 }}>
                  <Icons.Zap size={14} />
                  <span>Speed</span>
                </div>
                <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                  style={{ color: themeColors.text, backgroundColor: `${themeColors.accent}10` }}>
                  {readingSpeed} WPM
                </span>
              </div>
              
              <div
                className="grid items-center"
                style={{ gridTemplateColumns: "1fr auto", columnGap: "12px", color: themeColors.secondary }}
              >
                <div className="flex items-center gap-2" style={{ minWidth: 110 }}>
                  <Icons.Clock size={14} />
                  <span>Time</span>
                </div>
                <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                  style={{ color: themeColors.text, backgroundColor: `${themeColors.accent}10` }}>
                  {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              <div
                className="grid items-center"
                style={{ gridTemplateColumns: "1fr auto", columnGap: "12px", color: themeColors.secondary }}
              >
                <div className="flex items-center gap-2" style={{ minWidth: 110 }}>
                  <Icons.Target size={14} />
                  <span>Left</span>
                </div>
                <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                  style={{ color: themeColors.text, backgroundColor: `${themeColors.accent}10` }}>
                  {remainingTime}m
                </span>
              </div>
              
              <div
                className="grid items-center"
                style={{ gridTemplateColumns: "1fr auto", columnGap: "12px", color: themeColors.secondary }}
              >
                <div className="flex items-center gap-2" style={{ minWidth: 110 }}>
                  <Icons.BookOpen size={14} />
                  <span>Progress</span>
                </div>
                <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                  style={{ color: themeColors.text, backgroundColor: `${themeColors.accent}10` }}>
                  {Math.round(readingProgress)}%
                </span>
              </div>
            </div>
            
            {/* Mini progress bar */}
            <div className="mt-3">
              <div 
                className="w-full h-1 rounded-full"
                style={{ backgroundColor: `${themeColors.accent}20` }}
              >
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${readingProgress}%`, 
                    backgroundColor: themeColors.accent
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container py-8 transition-all duration-300">
        <article
          className={`mx-auto transition-all duration-300 ${binocularView ? '' : 'max-w-4xl'}`}
          data-article-content
          style={{
            maxWidth: binocularView ? "80ch" : "65rem",
            backgroundColor: readingMode ? themeColors.background : "transparent",
            borderRadius: readingMode ? "1rem" : "0",
            padding: readingMode ? `${2 * margins}rem` : "0",
            boxShadow: readingMode ? "0 8px 32px rgba(0,0,0,0.12)" : "none",
            fontFamily: selectedFont.value,
            fontSize: `${fontSize}%`,
            lineHeight,
            wordSpacing: `${wordSpacing}px`,
            letterSpacing: `${letterSpacing}px`,
            color: themeColors.text,
            margin: binocularView ? "0 auto" : "0 auto",
            filter: blueLight > 0 ? `sepia(${blueLight}%) saturate(90%) hue-rotate(15deg)` : 'none'
          }}
        >
          {/* Header */}
          <header className="mb-12 text-center">
            <div className="relative">
              {post.tags && post.tags.length > 0 && (
                <div className="mb-6">
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border transition-all duration-200 hover:scale-105"
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
                className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight transition-all duration-300"
                style={{
                  color: themeColors.text,
                  fontFamily: selectedFont.value,
                  fontSize: `${2.5 * (fontSize / 100)}em`,
                }}
              >
                {post.title}
              </h1>

              <div 
                className="flex flex-wrap items-center justify-center gap-6 text-sm mb-8"
                style={{ color: themeColors.secondary }}
              >
                <div 
                  className="flex items-center gap-2 rounded-full px-3 py-1 transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: `${themeColors.accent}10` }}
                >
                  <Icons.Clock size={14} />
                  <span className="font-medium">{readingTime} min read</span>
                </div>
                {post.createdAt && (
                  <div 
                    className="flex items-center gap-2 rounded-full px-3 py-1 transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: `${themeColors.accent}10` }}
                  >
                    <Icons.Target size={14} />
                    <span className="font-medium">{wordsRead} / {totalWords} words</span>
                  </div>
                )}
              </div>

              {post.coverImageUrl && (
                <img
                  src={post.coverImageUrl}
                  alt=""
                  className="mx-auto mb-8 rounded-2xl shadow-lg max-h-[420px] object-cover w-full transition-all duration-300 hover:scale-[1.02]"
                />
              )}

              <div 
                className="w-full rounded-full h-2 mb-8"
                style={{ backgroundColor: `${themeColors.accent}20` }}
              >
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${readingProgress}%`, 
                    background: `linear-gradient(90deg, ${themeColors.accent}, ${tint})` 
                  }}
                />
              </div>
            </div>
          </header>

          {/* Enhanced article body */}
          <div
            className="article-content"
            style={{
              color: themeColors.text,
              fontSize: "inherit",
              lineHeight: "inherit",
            }}
            dangerouslySetInnerHTML={{ 
              __html: normalizedHtml || "<p><em>No content available</em></p>" 
            }}
          />

          {/* Floating progress indicator */}
          {readingProgress > 10 && readingProgress < 95 && (
            <div 
              className="fixed bottom-6 right-6 rounded-2xl p-4 shadow-2xl border z-20 transition-all duration-300 hover:scale-105"
              style={{ 
                backgroundColor: themeColors.background,
                borderColor: themeColors.border
              }}
            >
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    stroke={themeColors.border}
                    strokeWidth="4" 
                    fill="transparent" 
                  />
                  <circle
                    cx="50" cy="50" r="45"
                    stroke={themeColors.accent}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - readingProgress / 100)}`}
                    className="transition-all duration-300 filter drop-shadow-sm"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span 
                    className="text-sm font-bold"
                    style={{ color: themeColors.text }}
                  >
                    {Math.round(readingProgress)}%
                  </span>
                  <Icons.BookOpen size={12} style={{ color: themeColors.secondary }} />
                </div>
              </div>
            </div>
          )}
        </article>

        {/* Enhanced related posts */}
        {relatedPosts.length > 0 && (
          <section 
            className="max-w-4xl mx-auto mt-20 pt-12 border-t"
            style={{ borderColor: themeColors.border }}
          >
            <div className="text-center mb-8">
              <h2 
                className="text-3xl font-bold mb-3"
                style={{ color: themeColors.text }}
              >
                Related Articles
              </h2>
              <p style={{ color: themeColors.secondary }}>
                Continue your reading journey with these related posts
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((rp) => {
                const rt = clampAccent(rp.color);
                const rtRaw = pickBodyRaw(rp);
                const rtHtml = looksLikeHtml(rtRaw) ? stripCopyHighlights(rtRaw) : mdToHtml(rtRaw);
                const rtTime = estimateReadingTime(rtHtml);
                const excerpt = stripHtml(rtHtml).slice(0, 120);
                return (
                  <Link key={rp.id} to={`/blog/${rp.slug || rp.id}`} className="group block">
                    <article 
                      className="h-full p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                      style={{ 
                        borderColor: themeColors.border,
                        backgroundColor: `${themeColors.accent}05`
                      }}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div 
                          className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: rt }}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 
                            className="font-semibold text-lg mb-2 line-clamp-2 group-hover:underline"
                            style={{ color: themeColors.text }}
                          >
                            {rp.title}
                          </h3>
                          {excerpt && (
                            <p 
                              className="text-sm mb-3 line-clamp-3"
                              style={{ color: themeColors.secondary }}
                            >
                              {excerpt}...
                            </p>
                          )}
                        </div>
                      </div>
                      <div 
                        className="flex items-center justify-between text-xs"
                        style={{ color: themeColors.secondary }}
                      >
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
        )}
      </main>

      {/* Enhanced styles with better content rendering support */}
      <style jsx>{`
        .article-content {
          transition: all 0.3s ease;
        }
        
        .article-content * {
          color: ${themeColors.text} !important;
        }
        
        /* Better text selection styling */
        .article-content ::selection {
          background-color: ${themeColors.accent}30 !important;
          color: ${themeColors.text} !important;
        }
        
        .article-content ::-moz-selection {
          background-color: ${themeColors.accent}30 !important;
          color: ${themeColors.text} !important;
        }
        
        /* Enhanced image gallery support */
        .article-content img { 
          max-width: 100%; 
          height: auto; 
          border-radius: 0.75rem;
          margin: 2rem auto;
          display: block;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          position: relative;
          z-index: 1;
        }
        
        .article-content img:hover {
          transform: scale(1.03) translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.2);
          z-index: 2;
        }
        
        /* Support for multiple images in sequence */
        .article-content img + img {
          margin-top: 1rem;
        }
        
        /* Image gallery grid */
        .article-content p > img:only-child {
          margin: 2rem auto;
        }
        
        .article-content p:has(> img) + p:has(> img) img {
          margin-top: 1rem;
        }
        
        .article-content table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 2rem 0;
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          background-color: ${themeColors.background} !important;
        }
        
        .article-content th,
        .article-content td {
          padding: 1rem 0.75rem;
          border-bottom: 1px solid ${themeColors.border} !important;
          text-align: left;
        }
        
        .article-content th {
          background-color: ${themeColors.accent}15 !important;
          font-weight: 700;
          color: ${themeColors.text} !important;
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .article-content tr:hover {
          background-color: ${themeColors.accent}08 !important;
        }
        
        .article-content pre { 
          overflow: auto; 
          background-color: ${themeColors.code} !important;
          color: ${themeColors.text} !important;
          padding: 1.5rem;
          border-radius: 0.75rem;
          margin: 2rem 0;
          border-left: 4px solid ${themeColors.accent};
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace !important;
          font-size: 0.9em;
          line-height: 1.6;
        }
        
        .article-content code {
          background-color: ${themeColors.code} !important;
          color: ${themeColors.text} !important;
          padding: 0.3rem 0.6rem;
          border-radius: 0.4rem;
          font-size: 0.88em;
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace !important;
          font-weight: 500;
        }
        
        .article-content pre code {
          background: none !important;
          padding: 0;
          border-radius: 0;
        }
        
        .article-content blockquote {
          border-left: 4px solid ${themeColors.accent};
          margin: 2rem 0;
          padding: 1.5rem 2rem;
          background-color: ${themeColors.accent}08;
          border-radius: 0 0.75rem 0.75rem 0;
          font-style: italic;
          position: relative;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        
        .article-content blockquote::before {
          content: '"';
          font-size: 4rem;
          color: ${themeColors.accent}40;
          position: absolute;
          top: -0.5rem;
          left: 1rem;
          font-family: Georgia, serif;
        }
        
        .article-content h1,
        .article-content h2,
        .article-content h3,
        .article-content h4,
        .article-content h5,
        .article-content h6 {
          color: ${themeColors.text} !important;
          margin: 3rem 0 1.5rem 0;
          font-weight: 700;
          line-height: 1.3;
          scroll-margin-top: 6rem;
          position: relative;
        }
        
        .article-content h1 { font-size: 2.5rem; margin-top: 4rem; }
        .article-content h2 { 
          font-size: 2rem; 
          border-bottom: 2px solid ${themeColors.border};
          padding-bottom: 0.75rem;
          margin-bottom: 2rem;
        }
        .article-content h3 { font-size: 1.75rem; }
        .article-content h4 { font-size: 1.5rem; }
        .article-content h5 { font-size: 1.25rem; }
        .article-content h6 { font-size: 1.1rem; }
        
        .article-content h1:first-child,
        .article-content h2:first-child,
        .article-content h3:first-child {
          margin-top: 0;
        }
        
        .article-content p {
          margin-bottom: ${paragraphSpacing}em;
          line-height: ${lineHeight};
          color: ${themeColors.text} !important;
          text-align: justify;
          hyphens: auto;
          word-wrap: break-word;
        }
        
        .article-content ul,
        .article-content ol {
          margin: 1.5rem 0;
          padding-left: 2rem;
        }
        
        .article-content ul {
          list-style-type: none;
          position: relative;
        }
        
        .article-content ul li {
          position: relative;
          margin-bottom: 0.75rem;
          padding-left: 1.5rem;
          color: ${themeColors.text} !important;
          line-height: 1.6;
        }
        
        .article-content ul li::before {
          content: '•';
          color: inherit; /* Inherit color from parent/list item instead of forcing accent color */
          font-size: 1.2em;
          font-weight: bold;
          position: absolute;
          left: 0;
          top: 0;
        }
        
        /* Only apply accent color to bullets if no specific color is set */
        .article-content ul:not([style*="color"]) li:not([style*="color"]) li::before {
          color: ${themeColors.accent};
        }
        
        .article-content ol li {
          margin-bottom: 0.75rem;
          color: ${themeColors.text} !important;
          line-height: 1.6;
        }
        
        .article-content ol {
          counter-reset: custom-counter;
        }
        
        .article-content ol li {
          counter-increment: custom-counter;
          position: relative;
          padding-left: 1rem;
        }
        
        .article-content ol li::marker {
          color: ${themeColors.accent};
          font-weight: bold;
        }
        
        .article-content a {
          color: ${themeColors.accent} !important;
          text-decoration: underline;
          text-decoration-color: ${themeColors.accent}40;
          text-underline-offset: 3px;
          text-decoration-thickness: 2px;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        
        .article-content a:hover {
          text-decoration-color: ${themeColors.accent};
          background-color: ${themeColors.accent}15;
          padding: 0.2rem 0.4rem;
          border-radius: 0.4rem;
          transform: translateY(-1px);
        }
        
        .article-content hr {
          border: none;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${themeColors.accent}40, transparent);
          margin: 3rem 0;
        }
        
        .article-content mark {
          background-color: ${themeColors.accent}25 !important;
          color: ${themeColors.text} !important;
          padding: 0.2rem 0.4rem;
          border-radius: 0.3rem;
          font-weight: 500;
        }
        
        .article-content del {
          color: ${themeColors.secondary} !important;
          text-decoration: line-through;
          opacity: 0.7;
        }
        
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
        
        html {
          scroll-behavior: smooth;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${themeColors.background};
        }
        ::-webkit-scrollbar-thumb {
          background: ${themeColors.accent}40;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${themeColors.accent}60;
        }
      `}</style>
    </div>
  );
}

/* ----------------------------- Enhanced Helper Components ----------------------------- */

function EnhancedTOC({ tableOfContents, activeHeading, onClose, themeColors }) {
  return (
    <>
      <div
        className="fixed inset-0 z-20 lg:hidden"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div 
        className="fixed top-20 right-4 z-30 w-80 max-h-[75vh] overflow-hidden rounded-xl border shadow-2xl"
        style={{ 
          borderColor: themeColors.border,
          backgroundColor: themeColors.background
        }}
      >
        <div 
          className="p-4 border-b"
          style={{ 
            borderColor: themeColors.border,
            backgroundColor: `${themeColors.accent}05`
          }}
        >
          <div className="flex items-center justify-between">
            <h3 
              className="font-semibold flex items-center gap-2"
              style={{ color: themeColors.text }}
            >
              <Icons.Menu size={16} />
              Table of Contents
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded transition-all duration-200 hover:scale-110"
              style={{ 
                color: themeColors.secondary,
                backgroundColor: `${themeColors.accent}10`
              }}
            >
              <Icons.X size={16} />
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
                  onClose();
                }}
                className="block w-full text-left text-sm transition-all py-2 px-3 rounded-lg hover:scale-[1.02]"
                style={{
                  paddingLeft: `${(h.level - 1) * 0.75 + 0.75}rem`,
                  borderLeft: h.level > 2 ? `2px solid ${themeColors.accent}30` : "none",
                  marginLeft: h.level > 2 ? `${(h.level - 2) * 0.5}rem` : "0",
                  backgroundColor: activeHeading === h.id ? `${themeColors.accent}20` : "transparent",
                  color: activeHeading === h.id ? themeColors.accent : themeColors.secondary
                }}
              >
                <span className="block truncate font-medium">{h.text}</span>
                {h.level <= 2 && (
                  <div 
                    className="w-full h-px mt-1 opacity-50"
                    style={{ backgroundColor: themeColors.border }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}

function ReadingProfiles({ refEl, show, setShow, currentProfile, onSave, onLoad, themeColors }) {
  const [newProfileName, setNewProfileName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const profiles = getReadingProfiles();

  return (
    <div ref={refEl} className="relative">
      <button
        onClick={() => setShow(!show)}
        className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: show ? `${themeColors.accent}20` : "transparent",
          color: show ? themeColors.accent : themeColors.secondary
        }}
        title="Reading profiles"
      >
        <Icons.Brain size={18} />
      </button>

      {show && (
        <div 
          className="absolute top-full right-0 mt-2 w-72 rounded-xl border shadow-xl z-30"
          style={{ 
            borderColor: themeColors.border,
            backgroundColor: themeColors.background
          }}
        >
          <div 
            className="p-4 border-b"
            style={{ borderColor: themeColors.border }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 
                className="font-semibold"
                style={{ color: themeColors.text }}
              >
                Reading Profiles
              </h3>
              <button
                onClick={() => setShowSaveDialog(!showSaveDialog)}
                className="text-sm px-3 py-1 rounded-lg transition-all duration-200 hover:scale-105"
                style={{ 
                  backgroundColor: `${themeColors.accent}20`,
                  color: themeColors.accent
                }}
              >
                Save Current
              </button>
            </div>
            
            {showSaveDialog && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Profile name..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: `${themeColors.accent}05`,
                    color: themeColors.text
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newProfileName.trim()) {
                        onSave(newProfileName.trim());
                        setNewProfileName("");
                        setShowSaveDialog(false);
                      }
                    }}
                    className="flex-1 px-3 py-1 text-sm rounded-lg transition-all duration-200 hover:scale-105"
                    style={{ 
                      backgroundColor: themeColors.accent,
                      color: themeColors.background
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="flex-1 px-3 py-1 text-sm rounded-lg transition-all duration-200 hover:scale-105"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}20`,
                      color: themeColors.secondary
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
            {Object.keys(profiles).length === 0 ? (
              <p 
                className="text-sm text-center py-4"
                style={{ color: themeColors.secondary }}
              >
                No saved profiles yet
              </p>
            ) : (
              Object.keys(profiles).map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    onLoad(name);
                    setShow(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] flex items-center justify-between"
                  style={{
                    backgroundColor: currentProfile === name ? `${themeColors.accent}20` : `${themeColors.accent}05`,
                    color: currentProfile === name ? themeColors.accent : themeColors.text
                  }}
                >
                  <span className="font-medium">{name}</span>
                  {currentProfile === name && (
                    <Icons.Target size={14} style={{ color: themeColors.accent }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancedReadingSettings({ 
  refEl, show, setShow, activeTab, setActiveTab, readingTheme, setReadingTheme, 
  fontSize, setFontSize, lineHeight, setLineHeight, fontFamily, setFontFamily, 
  wordSpacing, setWordSpacing, letterSpacing, setLetterSpacing, paragraphSpacing, setParagraphSpacing, 
  margins, setMargins, readingMode, setReadingMode, focusMode, setFocusMode,
  binocularView, setBinocularView,
  blueLight, setBlueLight, autoNightMode, setAutoNightMode, autoScroll, setAutoScroll,
  scrollSpeed, setScrollSpeed, adjustFontSize, themeColors 
}) {
  const tabs = [
    { id: "typography", label: "Typography", icon: Icons.Type },
    { id: "themes", label: "Themes", icon: Icons.Palette },
    { id: "comfort", label: "Comfort", icon: Icons.Eye },
    { id: "focus", label: "Focus", icon: Icons.Target }
  ];

  const SettingSlider = ({ label, value, onChange, min, max, step = 1, unit = "" }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label 
          className="text-sm font-medium"
          style={{ color: themeColors.text }}
        >
          {label}
        </label>
        <span 
          className="text-sm font-mono"
          style={{ color: themeColors.secondary }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{ 
          backgroundColor: `${themeColors.accent}20`,
          accentColor: themeColors.accent
        }}
      />
    </div>
  );

  const SettingToggle = ({ label, checked, onChange, description }) => (
    <label className="flex items-center justify-between cursor-pointer group">
      <div>
        <span 
          className="text-sm font-medium"
          style={{ color: themeColors.text }}
        >
          {label}
        </span>
        {description && (
          <p 
            className="text-xs mt-1"
            style={{ color: themeColors.secondary }}
          >
            {description}
          </p>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div 
        className="relative w-11 h-6 rounded-full transition-all duration-200 group-hover:scale-105"
        style={{ backgroundColor: checked ? themeColors.accent : `${themeColors.secondary}40` }}
      >
        <div 
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </div>
    </label>
  );

  return (
    <div ref={refEl} className="relative">
      <button
        onClick={() => setShow(!show)}
        className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: show ? `${themeColors.accent}20` : "transparent",
          color: show ? themeColors.accent : themeColors.secondary
        }}
        title="Reading preferences"
      >
        <Icons.Settings size={18} />
      </button>

      {show && (
        <div 
          className="absolute top-full right-0 mt-2 w-96 rounded-xl border shadow-2xl z-30 max-h-[80vh] overflow-hidden"
          style={{ 
            borderColor: themeColors.border,
            backgroundColor: themeColors.background
          }}
        >
          {/* Tabs */}
          <div 
            className="flex border-b"
            style={{ borderColor: themeColors.border }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: activeTab === tab.id ? `${themeColors.accent}20` : "transparent",
                  color: activeTab === tab.id ? themeColors.accent : themeColors.secondary,
                  borderBottom: activeTab === tab.id ? `2px solid ${themeColors.accent}` : "2px solid transparent"
                }}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
            {activeTab === "typography" && (
              <>
                <SettingSlider
                  label="Font Size"
                  value={fontSize}
                  onChange={setFontSize}
                  min={50}
                  max={200}
                  step={5}
                  unit="%"
                />
                
                <SettingSlider
                  label="Line Height"
                  value={lineHeight}
                  onChange={setLineHeight}
                  min={1.0}
                  max={3.0}
                  step={0.1}
                />
                
                <div className="space-y-2">
                  <label 
                    className="block text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: themeColors.border,
                      backgroundColor: `${themeColors.accent}05`,
                      color: themeColors.text
                    }}
                  >
                    {Object.entries(FONT_FAMILIES).map(([key, font]) => (
                      <option key={key} value={key}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <SettingSlider
                  label="Word Spacing"
                  value={wordSpacing}
                  onChange={setWordSpacing}
                  min={-5}
                  max={10}
                  unit="px"
                />
                
                <SettingSlider
                  label="Letter Spacing"
                  value={letterSpacing}
                  onChange={setLetterSpacing}
                  min={-2}
                  max={5}
                  step={0.1}
                  unit="px"
                />
                
                <SettingSlider
                  label="Paragraph Spacing"
                  value={paragraphSpacing}
                  onChange={setParagraphSpacing}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  unit="em"
                />
                
                <SettingSlider
                  label="Margins"
                  value={margins}
                  onChange={setMargins}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  unit="x"
                />
              </>
            )}

            {activeTab === "themes" && (
              <>
                <div className="space-y-3">
                  <label 
                    className="block text-sm font-medium"
                    style={{ color: themeColors.text }}
                  >
                    Reading Theme
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(READING_THEMES).map(([key, theme]) => (
                      <button
                        key={key}
                        onClick={() => setReadingTheme(key)}
                        className="p-3 rounded-lg border text-left transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          borderColor: readingTheme === key ? themeColors.accent : themeColors.border,
                          backgroundColor: readingTheme === key ? `${themeColors.accent}10` : `${themeColors.accent}05`,
                          color: readingTheme === key ? themeColors.accent : themeColors.text
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: theme.light.accent }}
                          />
                          <span className="text-sm font-medium">{theme.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <div 
                            className="w-4 h-2 rounded-sm"
                            style={{ backgroundColor: theme.light.background }}
                          />
                          <div 
                            className="w-4 h-2 rounded-sm"
                            style={{ backgroundColor: theme.dark.background }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === "comfort" && (
              <>
                <SettingSlider
                  label="Blue Light Filter"
                  value={blueLight}
                  onChange={setBlueLight}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                />
                
                <SettingToggle
                  label="Auto Night Mode"
                  checked={autoNightMode}
                  onChange={setAutoNightMode}
                  description="Automatically switch to dark mode at night"
                />
                
                <SettingToggle
                  label="Reading Mode"
                  checked={readingMode}
                  onChange={setReadingMode}
                  description="Enhanced background and padding for better focus"
                />
                
                <SettingToggle
                  label="Binocular View"
                  checked={binocularView}
                  onChange={setBinocularView}
                  description="Narrow column width for easier reading"
                />
              </>
            )}

            {activeTab === "focus" && (
              <>
                <SettingToggle
                  label="Focus Mode"
                  checked={focusMode}
                  onChange={setFocusMode}
                  description="Minimal distraction reading experience"
                />
                
                <SettingToggle
                  label="Auto Scroll"
                  checked={autoScroll}
                  onChange={setAutoScroll}
                  description="Automatically scroll at a comfortable pace"
                />
                
                {autoScroll && (
                  <SettingSlider
                    label="Scroll Speed"
                    value={scrollSpeed}
                    onChange={setScrollSpeed}
                    min={0.5}
                    max={5}
                    step={0.1}
                    unit="x"
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShareMenu({ refEl, show, setShow, onShare, themeColors }) {
  const shareOptions = [
    { key: 'twitter', label: 'Twitter', icon: '𝕏', color: '#1da1f2' },
    { key: 'facebook', label: 'Facebook', icon: '📘', color: '#1877f2' },
    { key: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0a66c2' },
    { key: 'reddit', label: 'Reddit', icon: '🤖', color: '#ff4500' },
    { key: 'copy', label: 'Copy Link', icon: '🔗', color: themeColors.accent },
  ];

  return (
    <div ref={refEl} className="relative">
      <button
        onClick={() => setShow(!show)}
        className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: show ? `${themeColors.accent}20` : "transparent",
          color: show ? themeColors.accent : themeColors.secondary
        }}
        title="Share post"
      >
        <Icons.Share size={18} />
      </button>

      {show && (
        <div 
          className="absolute top-full right-0 mt-2 w-48 rounded-xl border shadow-xl z-30"
          style={{ 
            borderColor: themeColors.border,
            backgroundColor: themeColors.background
          }}
        >
          <div className="p-2">
            {shareOptions.map(({ key, label, icon, color }) => (
              <button
                key={key}
                onClick={() => {
                  onShare(key);
                  setShow(false);
                }}
                data-copy-feedback={key === 'copy' ? 'true' : undefined}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:scale-[1.02] group"
                style={{ 
                  color: themeColors.text,
                  backgroundColor: "transparent"
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.backgroundColor = `${color}15`;
                  el.style.borderLeft = `3px solid ${color}`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.backgroundColor = "transparent";
                  el.style.borderLeft = "3px solid transparent";
                }}
              >
                <span className="text-base">{icon}</span>
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}