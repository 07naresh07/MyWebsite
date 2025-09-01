// src/pages/Home.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProjects,
  getPosts,
  getHome,
  saveWelcome as apiSaveWelcome,
  createHighlight as apiCreateHighlight,
  updateHighlight as apiUpdateHighlight,
  deleteHighlight as apiDeleteHighlight,
} from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";

/* ------------------------------ Data normalizers ------------------------------ */
function normalizeHighlight(h = {}) {
  return {
    id: h.id,
    icon: h.icon ?? "💡",
    titleHtml: h.titleHtml ?? h.title_html ?? h.title ?? "",
    bodyHtml:  h.bodyHtml  ?? h.body_html  ?? h.description ?? "",
    sortOrder: h.sortOrder ?? h.sort_order ?? h.position ?? 0,
    // keep legacy fields around (optional)
    title: h.title ?? null,
    description: h.description ?? null,
    url: h.url ?? null,
  };
}

function normalizeHomePayload(home = {}) {
  return {
    welcomeHtml: home.welcomeHtml ?? home.welcome_html ?? "",
    highlights: Array.isArray(home.highlights) ? home.highlights.map(normalizeHighlight) : [],
  };
}

/* ------------------------------ Lightweight UI primitives ------------------------------ */
const Card = ({ children, className = "", isDark = false, ...props }) => (
  <div
    className={`relative shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"} ${className}`}
    {...props}
  >
    {children}
  </div>
);
const Reveal = ({ children }) => <div className="animate-fade-in">{children}</div>;

/* ------------------------------ Theme & UI ------------------------------ */
const UI_GRADIENT = "from-indigo-600 via-violet-600 to-fuchsia-600";
const DARK_UI_GRADIENT = "from-indigo-400 via-violet-400 to-fuchsia-400";

const MODERN_ICONS = {
  projects: "🚀",
  posts: "📚",
  highlights: "💎",
  trending: "📈",
  recent: "⚡",
  ai: "🤖",
  bim: "🏗️",
  mobility: "🚦",
  personal: "👤",
  inProgress: "🔧",
};

const TAG_COLORS = [
  { light: "bg-amber-100 text-amber-900 ring-amber-200", dark: "bg-amber-900/30 text-amber-200 ring-amber-700" },
  { light: "bg-emerald-100 text-emerald-900 ring-emerald-200", dark: "bg-emerald-900/30 text-emerald-200 ring-emerald-700" },
  { light: "bg-sky-100 text-sky-900 ring-sky-200", dark: "bg-sky-900/30 text-sky-200 ring-sky-700" },
  { light: "bg-fuchsia-100 text-fuchsia-900 ring-fuchsia-200", dark: "bg-fuchsia-900/30 text-fuchsia-200 ring-fuchsia-700" },
  { light: "bg-rose-100 text-rose-900 ring-rose-200", dark: "bg-rose-900/30 text-rose-200 ring-rose-700" },
  { light: "bg-indigo-100 text-indigo-900 ring-indigo-200", dark: "bg-indigo-900/30 text-indigo-200 ring-indigo-700" },
  { light: "bg-teal-100 text-teal-900 ring-teal-200", dark: "bg-teal-900/30 text-teal-200 ring-teal-700" },
];

function hashIdx(str = "", mod = TAG_COLORS.length) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

function chipClassFor(tag = "", isDark = false) {
  const c = TAG_COLORS[hashIdx(tag)];
  return `${isDark ? c.dark : c.light} ring-1 rounded-md px-2 py-0.5 text-xs font-medium`;
}

/* ------------------------------ Helpers ------------------------------ */
function projectBadges(pj) {
  const out = [];
  const tags = (pj.tags || pj.techStack || []).map((t) => String(t));
  if (tags.some((t) => /ai|ml|machine|vision|llm/i.test(t))) out.push([MODERN_ICONS.ai, "AI"]);
  if (tags.some((t) => /bim/i.test(t))) out.push([MODERN_ICONS.bim, "BIM"]);
  if (tags.some((t) => /transport|mobility/i.test(t))) out.push([MODERN_ICONS.mobility, "Mobility"]);
  if (pj.status && /in\s*progress|wip|ongoing/i.test(pj.status)) out.push([MODERN_ICONS.inProgress, "In Progress"]);
  return out;
}

function postBadges(po) {
  const out = [];
  const tags = (po.tags || []).map((t) => String(t));
  if (tags.some((t) => /personal|journey/i.test(t))) out.push([MODERN_ICONS.personal, "Personal"]);
  if (tags.some((t) => /bim/i.test(t))) out.push([MODERN_ICONS.bim, "BIM"]);
  if (tags.some((t) => /ai|ml/i.test(t))) out.push([MODERN_ICONS.ai, "AI"]);
  return out;
}

function isRecent(dateStr) {
  const d = dateStr ? new Date(dateStr) : null;
  if (!d || isNaN(+d)) return false;
  const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

function isTrendingByTags(tags = []) {
  const t = (tags || []).join(" ").toLowerCase();
  return /ai|bim|mobility|transport|automation/.test(t);
}

/**
 * Sanitize HTML for preview.
 * NEW: when forceDark is true, strip inline 'color' and 'background-color'
 * so dark mode can control text colors.
 */
function sanitizePreview(html, { forceDark = false } = {}) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
    const allowed = new Set(["a","b","strong","i","em","u","ul","ol","li","br","p","span","div","blockquote","code","mark","font"]);
    const keep = {
      a: new Set(["href","target","rel"]),
      span: new Set(["style"]),
      p: new Set(["style"]),
      li: new Set(["style"]),
      font: new Set(["color","size"]),
      mark: new Set(["style"]),
      div: new Set(["style"])
    };
    const filterStyle = (v="") => v.split(";").map(s=>s.trim()).filter(Boolean).map(d=>{
      const m=d.match(/^(color|background-color|font-size|font-weight|font-style|text-decoration)\s*:\s*([^;]+)$/i);
      if (!m) return "";
      const prop = m[1].toLowerCase();
      const val  = m[2].trim();
      if (forceDark && (prop === "color" || prop === "background-color")) return ""; // strip for dark mode
      return `${prop}: ${val}`;
    }).filter(Boolean).join("; ");
    const walk=(node)=>{
      [...node.childNodes].forEach((n)=>{
        if(n.nodeType===1){
          const tag=n.tagName.toLowerCase();
          if(!allowed.has(tag)){ n.replaceWith(...[...n.childNodes]); return; }
          const ok=keep[tag]||new Set();
          [...n.attributes].forEach(a=>{ if(!ok.has(a.name.toLowerCase())) n.removeAttribute(a.name); });
          if(tag==="a"){ n.setAttribute("target","_blank"); n.setAttribute("rel","noopener noreferrer"); }
          if(n.hasAttribute("style")){ const v=filterStyle(n.getAttribute("style")); v?n.setAttribute("style",v):n.removeAttribute("style"); }
          walk(n);
        } else if(n.nodeType===8){ n.remove(); }
      });
    };
    walk(doc.body);
    return doc.body.innerHTML;
  } catch { return html || ""; }
}

function snippetHtml(html, maxChars = 420) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
    const allowed = new Set(["P","UL","OL","LI","STRONG","EM","U","BR","SPAN","B","I","H1","H2","H3"]);
    const out = []; let count = 0;
    const walk = (node) => {
      for (const n of Array.from(node.childNodes)) {
        if (count >= maxChars) break;
        if (n.nodeType === 3) {
          const t=n.nodeValue||"";
          const take=Math.min(maxChars-count,t.length);
          out.push(t.slice(0,take));
          count+=take;
        } else if (n.nodeType === 1 && allowed.has(n.tagName)) {
          const tag=n.tagName.toLowerCase();
          out.push(`<${tag}>`); walk(n); out.push(`</${tag}>`);
        } else if (n.nodeType === 1) { walk(n); }
        if (count >= maxChars) break;
      }
    };
    walk(doc.body);
    return out.join("");
  } catch {
    const txt=(html||"").replace(/<[^>]+>/g,"");
    return txt.length>maxChars?txt.slice(0,maxChars)+"…":txt;
  }
}

/* ------------------------------ Horizontal Row Hook ------------------------------ */
function useHRow() {
  const rowRef = useRef(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [progress, setProgress] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const THRESHOLD = 5;

  const start = (clientX) => {
    const el = rowRef.current;
    if (!el) return;
    drag.current = { down: true, x: clientX, left: el.scrollLeft, moved: false };
    el.classList.add("cursor-grabbing");
  };
  const move = (clientX) => {
    const el = rowRef.current;
    if (!el || !drag.current.down) return;
    const delta = clientX - drag.current.x;
    if (Math.abs(delta) > THRESHOLD) drag.current.moved = true;
    el.scrollLeft = drag.current.left - delta;
  };
  const end = () => {
    const el = rowRef.current;
    if (el) el.classList.remove("cursor-grabbing");
    drag.current.down = false;
    setTimeout(() => { drag.current.moved = false; }, 50);
  };

  const onMouseDown = (e) => { if (e.button !== 0) return; start(e.pageX); };
  const onMouseMove = (e) => { if (drag.current.down) move(e.pageX); };
  const onMouseUp = end;
  const onMouseLeave = () => { if (drag.current.down) end(); };

  const onTouchStart = (e) => { const t = e.touches?.[0]; if (t) start(t.pageX); };
  const onTouchMove = (e) => { const t = e.touches?.[0]; if (t) move(t.pageX); };
  const onTouchEnd = end;

  const scrollBy = (dir = 1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: Math.round(el.clientWidth * 0.85) * dir, behavior: "smooth" });
  };

  const onKey = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); scrollBy(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); scrollBy(-1); }
  };

  const onScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setHasOverflow(max > 0);
    setProgress(max > 0 ? Math.min(100, Math.max(0, (el.scrollLeft / max) * 100)) : 0);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const max = el.scrollWidth - el.clientWidth;
      setHasOverflow(max > 0);
      setProgress(0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canClick = () => !drag.current.moved && !drag.current.down;

  return {
    rowRef, progress, hasOverflow, canClick,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
    onTouchStart, onTouchMove, onTouchEnd, scrollBy, onKey, onScroll
  };
}

/* ------------------------------ Local Theme (scoped to Home) ------------------------------ */
const HOME_THEME_KEY = "homeTheme";
function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = window.localStorage.getItem(HOME_THEME_KEY);
      if (saved) return saved === "dark";
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add("dark");
        document.body.className = "bg-slate-900 text-white font-sans";
      } else {
        document.documentElement.classList.remove("dark");
        document.body.className = "bg-gray-50 text-slate-900 font-sans";
      }
    } catch {}
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try { window.localStorage.setItem(HOME_THEME_KEY, next ? "dark" : "light"); } catch {}
  };
  return { isDark, toggleTheme };
}

/* ------------------------------ View Mode ------------------------------ */
function useViewMode() {
  const [viewMode, setViewMode] = useState("grid");
  const toggleViewMode = () => setViewMode((v) => (v === "grid" ? "list" : "grid"));
  return { viewMode, toggleViewMode };
}

/* ------------------------------ Color Palettes ------------------------------ */
const COLOR_PALETTE = [
  { name: "Black", value: "#000000", bg: "bg-black" },
  { name: "Gray", value: "#6b7280", bg: "bg-gray-500" },
  { name: "Red", value: "#dc2626", bg: "bg-red-600" },
  { name: "Orange", value: "#ea580c", bg: "bg-orange-600" },
  { name: "Yellow", value: "#ca8a04", bg: "bg-yellow-600" },
  { name: "Green", value: "#16a34a", bg: "bg-green-600" },
  { name: "Blue", value: "#2563eb", bg: "bg-blue-600" },
  { name: "Purple", value: "#9333ea", bg: "bg-purple-600" },
  { name: "Pink", value: "#db2777", bg: "bg-pink-600" },
  { name: "Indigo", value: "#4f46e5", bg: "bg-indigo-600" },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a", bg: "bg-yellow-200" },
  { name: "Green", value: "#bbf7d0", bg: "bg-green-200" },
  { name: "Blue", value: "#bfdbfe", bg: "bg-blue-200" },
  { name: "Purple", value: "#e9d5ff", bg: "bg-purple-200" },
  { name: "Pink", value: "#fbcfe8", bg: "bg-pink-200" },
  { name: "Orange", value: "#fed7aa", bg: "bg-orange-200" },
];

/* ------------------------------ Welcome Editor ------------------------------ */
const LS_WELCOME = "welcomeContentV1";

function EditableWelcomeSection({ isDark, ownerMode, initialHtml, onSaveHtml }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);

  const [welcomeContent, setWelcomeContent] = useState(() => {
    try {
      return initialHtml || window.localStorage.getItem(LS_WELCOME) || "";
    } catch {
      return initialHtml || "";
    }
  });

  useEffect(() => {
    if (initialHtml && initialHtml !== welcomeContent) {
      setWelcomeContent(initialHtml);
    }
  }, [initialHtml]);

  useEffect(() => {
    if (!isEditing) return;
    try {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {}
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const onSel = () => {
      const sel = window.getSelection?.();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [isEditing]);

  const restoreSelection = () => {
    const range = savedRangeRef.current;
    if (!range) return false;
    const sel = window.getSelection?.();
    if (!sel) return false;
    try {
      sel.removeAllRanges();
      sel.addRange(range.cloneRange());
      return true;
    } catch {
      return false;
    }
  };

  const applyInlineStyle = (prop, color) => {
    const range = savedRangeRef.current;
    if (!range || !editorRef.current) return;
    const sel = window.getSelection?.();
    if (!sel) return;
    try {
      sel.removeAllRanges();
      sel.addRange(range.cloneRange());
      if (sel.rangeCount === 0 || range.collapsed) return;
      if (prop === "backgroundColor") {
        document.execCommand("hiliteColor", false, color);
      } else {
        document.execCommand("foreColor", false, color);
      }
      if (sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    } catch (e) {
      console.error("Error applying color:", e);
    }
  };

  const applyColor = (color, isHighlight = false) => {
    if (savedRangeRef.current && !savedRangeRef.current.collapsed) {
      applyInlineStyle(isHighlight ? "backgroundColor" : "color", color);
    }
    setShowColorPalette(false);
  };

  const removeFormatting = () => {
    restoreSelection();
    try { document.execCommand("removeFormat"); } catch {}
    setShowColorPalette(false);
  };

  const handlePaste = (e) => {
    if (!isEditing) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") || "";
    const html = e.clipboardData?.getData("text/html") || "";
    if (html) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_ELEMENT, null, false);
      let node;
      while (node = walker.nextNode()) {
        if (node.tagName === 'DIV') {
          const p = document.createElement('p');
          while (node.firstChild) p.appendChild(node.firstChild);
          node.parentNode.replaceChild(p, node);
        }
      }
      document.execCommand("insertHTML", false, tempDiv.innerHTML);
    } else if (text) {
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
      const html2 = paragraphs.map(p => {
        const lines = p.split('\n').map(line => line.trim()).filter(line => line);
        return lines.map(line => `<p>${line}</p>`).join('');
      }).join('');
      document.execCommand("insertHTML", false, html2);
    }
  };

  const handleKeyDown = (e) => {
    if (!isEditing) return;
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak", false);
    }
  };

  const handleInput = (e) => {
    if (!isEditing) return;
    const content = e.target.innerHTML;
    if (content && !content.includes('<p>') && !content.includes('<ul>') && !content.includes('<ol>')) {
      const lines = content.split('<br>').filter(line => line.trim());
      if (lines.length > 0) {
        const newContent = lines.map(line => `<p>${line}</p>`).join('');
        e.target.innerHTML = newContent;
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(e.target);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const handleEdit = () => {
    if (!ownerMode) return;
    setIsEditing(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        if (!editorRef.current.innerHTML.trim()) {
          editorRef.current.innerHTML = '<p><br></p>';
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(editorRef.current.firstChild, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }, 60);
  };

  const handleSave = async () => {
    let html = editorRef.current?.innerHTML || "";
    if (html) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const hasBlocks = tempDiv.querySelector('p, ul, ol, h1, h2, h3, h4, h5, h6');
      if (!hasBlocks && tempDiv.textContent.trim()) {
        const lines = html.split('<br>').map(line => line.trim()).filter(line => line);
        html = lines.map(line => `<p>${line}</p>`).join('');
      }
    }
    setWelcomeContent(html);
    try { window.localStorage.setItem(LS_WELCOME, html); } catch {}
    try { await onSaveHtml?.(html); } catch (e) { console.error("Failed to save welcome:", e); }
    setIsEditing(false);
    setShowColorPalette(false);
  };

  const handleCancel = () => {
    if (editorRef.current) editorRef.current.innerHTML = welcomeContent;
    setIsEditing(false);
    setShowColorPalette(false);
  };

  const panelBg = isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200";
  const btnHover = isDark ? "hover:bg-slate-600 text-white" : "hover:bg-gray-200 text-slate-700";

  return (
    <section
      className={`container mx-auto px-4 py-10 relative group ${isDark ? "text-white" : "text-slate-800"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {ownerMode && !isEditing && isHovered && (
        <button
          onClick={handleEdit}
          className={`absolute top-4 right-4 z-10 px-3 py-1.5 text-sm font-medium ${isDark ? "bg-slate-800 border-slate-600 text-white hover:bg-slate-700" : "bg-white border-gray-300 text-slate-700 hover:bg-gray-50"} border rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2`}
          aria-label="Edit welcome"
        >
          ✏️ Edit Welcome
        </button>
      )}

      <Reveal>
        <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <span className={`bg-clip-text text-transparent bg-gradient-to-r ${UI_GRADIENT}`}>Welcome</span>
          <span aria-hidden="true">👋</span>
        </h3>
      </Reveal>
      <span className={`block h-1 bg-gradient-to-r ${UI_GRADIENT} rounded mt-2 mb-6 w-full opacity-70`} />

      {isEditing && (
        <div className={`mb-4 p-3 rounded-xl border shadow-lg ${panelBg} relative`}>
          <div className="flex flex-wrap items-center gap-1">
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("bold")} className={`px-2 py-1.5 rounded-md ${btnHover} font-bold text-sm`}>B</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("italic")} className={`px-2 py-1.5 rounded-md ${btnHover} italic text-sm`}>I</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("underline")} className={`px-2 py-1.5 rounded-md ${btnHover} underline text-sm`}>U</button>
            <span className={`mx-2 w-px h-6 ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("insertUnorderedList")} className={`px-2 py-1.5 rounded-md ${btnHover} text-sm`}>•</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("insertOrderedList")} className={`px-2 py-1.5 rounded-md ${btnHover} text-sm`}>1</button>
            <span className={`mx-2 w-px h-6 ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />
            <button
              onMouseDown={(e)=>{ e.preventDefault(); restoreSelection(); }}
              onClick={() => setShowColorPalette((v)=>!v)}
              className={`px-2 py-1.5 rounded-md ${btnHover} text-sm ${showColorPalette ? (isDark ? "bg-slate-600" : "bg-gray-200") : ""}`}
            >
              🎨
            </button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={removeFormatting} className={`px-2 py-1.5 rounded-md ${btnHover} text-sm`}>⚪</button>
            <span className={`mx-2 w-px h-6 ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("justifyLeft")} className={`px-2 py-1.5 rounded-md ${btnHover} text-sm`}>←</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("justifyCenter")} className={`px-2 py-1.5 rounded-md ${btnHover} text-sm`}>↔</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("justifyRight")} className={`px-2 py-1.5 rounded-md ${btnHover} text-sm`}>→</button>
          </div>
        </div>
      )}

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          className={`text-lg leading-8 outline-none welcome-content ${
            isEditing
              ? `${isDark ? "text-white bg-slate-800 border-slate-600" : "text-slate-800 bg-white border-gray-300"} ring-2 ring-violet-500/50 rounded-lg p-4 border`
              : `${isDark ? "text-white" : "text-slate-800"}`
          }`}
          style={{ textAlign: "justify", minHeight: isEditing ? "200px" : "auto" }}
          dangerouslySetInnerHTML={{ __html: welcomeContent }}
        />

        {isEditing && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className={`px-6 py-2 font-medium rounded-lg border text-sm ${isDark ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"}`}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ Highlights ------------------------------ */
const LS_HIGHLIGHTS = "homeHighlightsV1";

const EMOJI_CATEGORIES = {
  Tech: ["🌐", "🧩", "🤖", "⚙️", "🧠", "💡", "🛠️", "💾", "🧰", "💻", "🖥️", "📱"],
  Infrastructure: ["🚦", "🏗️", "🛰️", "🗺️", "📐", "🏙️", "🌉", "🚇", "🚉", "🚆", "🚀"],
  Science: ["🧪", "📊", "🧮", "🔬", "🧭", "⚡", "🔋", "🔌", "📈", "📉"],
  Nature: ["🌍", "🌏", "🌎", "⛰️", "🏔️", "🌱", "🌤️", "🌧️", "⭐", "🌙"],
  Objects: ["🔧", "🗜️", "🔩", "📦", "🧱", "📎", "🖇️", "✏️", "🖊️", "📝", "📚", "📄"],
};

/* ------------------------------ Fixed Highlight Card ------------------------------ */
function EnhancedHighlightCard({ item, onChange, onDelete, ownerMode, isDark }) {
  const [editing, setEditing] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tech");
  const titleRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!editing && titleRef.current) titleRef.current.innerHTML = item.titleHtml || "";
    if (!editing && bodyRef.current) bodyRef.current.innerHTML = item.bodyHtml || "";
  }, [item.titleHtml, item.bodyHtml, editing]);

  useEffect(() => {
    if (editing) try {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {}
  }, [editing]);

  const startEdit = () => { if (!ownerMode) return; setEditing(true); setTimeout(() => bodyRef.current?.focus(), 80); };

  const saveEdit = () => {
    const titleContent = titleRef.current?.innerHTML || "";
    const bodyContent = bodyRef.current?.innerHTML || "";
    onChange({ ...item, titleHtml: titleContent, bodyHtml: bodyContent });
    setEditing(false); setIconOpen(false);
  };

  const cancelEdit = () => {
    if (titleRef.current) titleRef.current.innerHTML = item.titleHtml || "";
    if (bodyRef.current) bodyRef.current.innerHTML = item.bodyHtml || "";
    setEditing(false); setIconOpen(false);
  };

  const escapeHtml = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const handlePasteTitle = (e) => {
    if (!editing) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") || "";
    const html = escapeHtml(text).replace(/\s+/g, " ");
    document.execCommand("insertHTML", false, html);
  };

  const handlePasteBody = (e) => {
    if (!editing) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") || "";
    const blocks = text.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g,"<br>")}</p>`).join("");
    document.execCommand("insertHTML", false, blocks);
  };

  const stopBubble = (e) => e.stopPropagation();
  const gradient = isDark ? DARK_UI_GRADIENT : UI_GRADIENT;

  const displayTitle = item.titleHtml || "Untitled";
  const displayBody = item.bodyHtml || "No description available";

  return (
    <>
      <div className="relative group h-full">
        {ownerMode && !editing && (
          <div className="absolute right-3 top-3 z-20 opacity-0 group-hover:opacity-100 transition-all">
            <div className="flex gap-2">
              <button
                onClick={startEdit}
                className={`text-xs px-3 py-1.5 rounded-lg backdrop-blur border font-medium ${isDark ? "bg-slate-800/80 border-white/10 text-white" : "bg-white/80 border-white/20 text-slate-700"}`}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className={`text-xs px-3 py-1.5 rounded-lg backdrop-blur border font-medium ${isDark ? "bg-slate-800/80 border-white/10 text-white hover:bg-red-900/30" : "bg-white/80 border-white/20 text-slate-700 hover:bg-red-50"}`}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        )}

        <Card
          isDark={isDark}
          className={`relative p-6 h-[300px] w-[340px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl border-0 shadow-md ${isDark ? "bg-slate-800/50" : "bg-white/70"} backdrop-blur-sm flex flex-col flex-shrink-0`}
        >
          <div className="relative z-10 flex-1 flex flex-col min-h-0">
            <div className="flex items-start gap-4 mb-3">
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  className={`text-3xl transition-all p-2 rounded-xl ${ownerMode ? "hover:scale-110" : ""} ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); ownerMode && setIconOpen((v) => !v); }}
                  aria-label="Choose icon"
                >
                  {item.icon || "💡"}
                </button>

                {ownerMode && iconOpen && (
                  <div
                    className={`absolute left-0 top-full mt-2 z-50 w-80 max-h-96 overflow-hidden rounded-2xl shadow-2xl backdrop-blur-md ${
                      isDark ? "bg-slate-800/95 border-slate-700" : "bg-white/95 border-slate-200"
                    } border`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={`flex overflow-x-auto p-2 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                      {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                        <button
                          key={cat}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap ${
                            selectedCategory === cat
                              ? `bg-gradient-to-r ${gradient} text-white`
                              : `${isDark ? "text-white/80 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100"}`
                          }`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="p-3 grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                      {EMOJI_CATEGORIES[selectedCategory].map((emo) => (
                        <button
                          key={emo}
                          className={`h-12 w-12 grid place-items-center text-2xl rounded-xl ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                          onClick={() => {
                            const newItem = { ...item, icon: emo };
                            onChange(newItem);
                            setIconOpen(false);
                          }}
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {editing ? (
                  <div
                    ref={titleRef}
                    contentEditable={true}
                    suppressContentEditableWarning
                    onPaste={handlePasteTitle}
                    className={`text-lg font-bold leading-tight outline-none ring-2 ring-violet-500/50 rounded-lg px-2 py-1 ${isDark ? "bg-slate-700 text-white" : "bg-white text-slate-800"}`}
                    dangerouslySetInnerHTML={{ __html: item.titleHtml || "" }}
                  />
                ) : (
                  <h3
                    className={`text-lg font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}
                    dangerouslySetInnerHTML={{ __html: displayTitle }}
                  />
                )}
                <div className={`mt-2 h-1 w-16 rounded-full bg-gradient-to-r ${gradient} opacity-60`} />
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {editing ? (
                <div
                  ref={bodyRef}
                  contentEditable={true}
                  suppressContentEditableWarning
                  onPaste={handlePasteBody}
                  onWheel={stopBubble}
                  onMouseDown={stopBubble}
                  onTouchStart={stopBubble}
                  className={`relative z-10 text-sm leading-6 outline-none flex-1 min-h-0 overflow-y-auto pr-1 ring-2 ring-violet-500/50 rounded-lg p-3 ${isDark ? "bg-slate-700 text-white" : "bg-white text-slate-700"}`}
                  style={{ textAlign: "justify" }}
                  dangerouslySetInnerHTML={{ __html: item.bodyHtml || "" }}
                />
              ) : (
                <div
                  className={`relative z-10 text-sm leading-6 flex-1 min-h-0 overflow-y-auto pr-1 ${isDark ? "text-white" : "text-slate-600"}`}
                  style={{ textAlign: "justify" }}
                  dangerouslySetInnerHTML={{ __html: displayBody }}
                />
              )}

              <div className="pt-3 flex justify-end">
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className={`text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${isDark ? "text-white/80 hover:text-violet-300 hover:bg-slate-700/50" : "text-slate-500 hover:text-violet-600 hover:bg-slate-100/50"}`}
                    aria-label="Read more highlight"
                    onMouseDown={stopBubble}
                    onWheel={stopBubble}
                    onTouchStart={stopBubble}
                  >
                    <span>Read more</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => document.execCommand("bold")}
                      className={`p-2 rounded text-sm font-bold ${isDark ? "hover:bg-slate-600 text-white" : "hover:bg-slate-200 text-slate-700"}`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => document.execCommand("italic")}
                      className={`p-2 rounded text-sm italic ${isDark ? "hover:bg-slate-600 text-white" : "hover:bg-slate-200 text-slate-700"}`}
                    >
                      I
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${isDark ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-700"}`}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div
            className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md ${isDark ? "bg-slate-800/95" : "bg-white/95"} border ${isDark ? "border-slate-700" : "border-slate-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 flex items-start justify-between border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{item.icon || "💡"}</span>
                <div
                  className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${isDark ? DARK_UI_GRADIENT : UI_GRADIENT}`}
                  dangerouslySetInnerHTML={{ __html: displayTitle }}
                />
              </div>
              <button
                className={`h-10 w-10 grid place-items-center rounded-full ${isDark ? "hover:bg-slate-700 text-white" : "hover:bg-slate-100 text-slate-700"}`}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div
                className={`prose prose-lg max-w-none leading-8 ${isDark ? "text-white [&_*]:text-white" : "text-slate-700"}`}
                style={{ textAlign: "justify" }}
                dangerouslySetInnerHTML={{ __html: displayBody }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Add Highlight Card (owner-only) */
function EnhancedAddHighlightCard({ onAdd, ownerMode, isDark }) {
  if (!ownerMode) return null;
  return (
    <button
      onClick={onAdd}
      className="snap-center inline-block flex-shrink-0 text-left group focus:outline-none"
      type="button"
      aria-label="Add section"
    >
      <Card
        isDark={isDark}
        className={`p-6 h-[300px] w-[340px] border-2 border-dashed rounded-2xl grid place-items-center transition-all hover:scale-[1.02] ${isDark ? "border-slate-600 hover:border-slate-500 bg-slate-800/30" : "border-slate-300 hover:border-slate-400 bg-slate-50/50"}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`text-4xl p-3 rounded-full ${isDark ? "bg-slate-700 text-white" : "bg-white text-slate-600"}`}>
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <div className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-600"}`}>Add New Section</div>
        </div>
      </Card>
    </button>
  );
}

/* ------------------------------ Floating Controls ------------------------------ */
function ControlPanel({ isDark, toggleTheme, viewMode, toggleViewMode }) {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
      <button
        onClick={toggleTheme}
        className={`px-4 py-2 text-sm font-medium rounded-full backdrop-blur-md border shadow-lg transition-all ${isDark ? "bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700/60" : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white/70"}`}
        aria-label="Toggle theme"
        title="Toggle light/dark"
      >
        {isDark ? "🌙 Dark" : "☀️ Light"}
      </button>

      <button
        onClick={toggleViewMode}
        className={`p-3 rounded-full backdrop-blur-md border shadow-lg transition-all ${isDark ? "bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700/60" : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white/70"}`}
        aria-label="Toggle view mode"
        title="Toggle grid/list"
      >
        {viewMode === "grid" ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" strokeWidth="2"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>
    </div>
  );
}

/* ------------------------------ Main Page ------------------------------ */
export default function Home() {
  const navigate = useNavigate();
  const { owner } = useOwnerMode?.() || {};
  const ownerMode = !!owner;

  const { isDark, toggleTheme } = useTheme();
  const { viewMode, toggleViewMode } = useViewMode();

  const [projects, setProjects] = useState([]);
  const [posts, setPosts] = useState([]);
  const [welcomeHtml, setWelcomeHtml] = useState("");
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load server data (welcome + highlights)
  useEffect(() => {
    let mounted = true;

    const loadHomeData = async () => {
      try {
        const homeRaw = await getHome();
        if (!mounted) return;
        const home = normalizeHomePayload(homeRaw);
        setWelcomeHtml(home.welcomeHtml);
        setHighlights(home.highlights);
      } catch (e) {
        // Fallback to local
        if (!mounted) return;
        try {
          const localWelcome = localStorage.getItem(LS_WELCOME);
          setWelcomeHtml(localWelcome || "");
          const localHighlights = localStorage.getItem(LS_HIGHLIGHTS);
          const parsed = localHighlights ? JSON.parse(localHighlights) : [];
          setHighlights(Array.isArray(parsed) ? parsed.map(normalizeHighlight) : []);
        } catch {
          setHighlights([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadHomeData();
    return () => { mounted = false; };
  }, []);

  // Projects
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pj = await getProjects();
        if (mounted) setProjects(Array.isArray(pj) ? pj : (pj?.items || []));
      } catch {
        if (mounted) setProjects([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Posts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const api = await getPosts({ page: 1, pageSize: 200 }).catch(() => ({ items: [] }));
        const apiItems = (api?.items || []).map((x) => {
          const title = x.title || "Untitled";
          const slug = x.slug || title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
          const toHtml = (v) => Array.isArray(v) ? v.map((p) => `<p>${p}</p>`).join("") : `<p>${String(v || "").replace(/\n{2,}/g, "</p><p>")}</p>`;
          return {
            id: x.id ?? slug,
            slug,
            title,
            bodyHtml: x.content ? toHtml(x.content) : x.excerpt ? toHtml(x.excerpt) : "",
            tags: Array.isArray(x.tags) ? x.tags : [],
            color: x.color || "#4f46e5",
            theme: x.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 },
            createdAt: x.createdAt || new Date().toISOString(),
            updatedAt: x.updatedAt || x.createdAt || new Date().toISOString(),
            publishedAt: x.publishedAt || x.createdAt,
          };
        });

        let local = [];
        try { const raw = localStorage.getItem("localBlogs"); local = raw ? JSON.parse(raw) : []; } catch {}

        const map = new Map();
        apiItems.forEach((p) => map.set(String(p.id || p.slug), p));
        local.forEach((p) => map.set(String(p.id || p.slug), { ...p, createdAt: p.createdAt || new Date().toISOString() }));

        const merged = Array.from(map.values())
          .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

        if (mounted) setPosts(merged.slice(0, 12));
      } catch {
        if (mounted) setPosts([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist normalized highlights locally
  useEffect(() => {
    try { window.localStorage.setItem(LS_HIGHLIGHTS, JSON.stringify(highlights.map(normalizeHighlight))); } catch {}
  }, [highlights]);

  // Handlers -> DB
  const saveWelcome = async (html) => {
    try {
      await apiSaveWelcome(html);
      setWelcomeHtml(html);
    } catch {
      setWelcomeHtml(html);
    }
  };

  const addHighlight = async () => {
    const draft = {
      icon: "💡",
      titleHtml: "New highlight",
      bodyHtml: "<p>Describe your highlight…</p>",
      position: (highlights?.length || 0) + 1
    };
    try {
      const created = await apiCreateHighlight(draft);
      const newHighlight = created ? normalizeHighlight(created) : { ...draft, id: `h-${Date.now()}` };
      setHighlights((prev) => [...prev, newHighlight]);
    } catch {
      const localHighlight = { ...draft, id: `h-${Date.now()}` };
      setHighlights((prev) => [...prev, localHighlight]);
    }
  };

  const updateHighlightOnServer = async (next) => {
    setHighlights((prev) => prev.map((h) => (h.id === next.id ? normalizeHighlight(next) : h)));
    try { await apiUpdateHighlight(next.id, next); } catch {}
  };

  const deleteHighlightOnServer = async (id) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    try { await apiDeleteHighlight(id); } catch {}
  };

  const hiRow = useHRow();
  const pjRow = useHRow();
  const poRow = useHRow();

  const gradient = isDark ? DARK_UI_GRADIENT : UI_GRADIENT;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-900 text-white" : "bg-gray-50 text-slate-900"}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <p className="text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans ${isDark ? "dark bg-slate-900 text-white" : "bg-gray-50 text-slate-900"}`}>
      <style>{`
        .clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .clamp-5 { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .animate-fade-in { animation: fadeIn 0.6s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        [contenteditable] ul { list-style: disc outside; padding-left: 1.25rem; margin: 0.5rem 0; }
        [contenteditable] ol { list-style: decimal outside; padding-left: 1.75rem; margin: 0.5rem 0; }
        [contenteditable] li { margin: 0.25rem 0; }
        [contenteditable] p { margin: 0.75rem 0; }
        [contenteditable] p:first-child { margin-top: 0; }
        [contenteditable] p:last-child { margin-bottom: 0; }
        [contenteditable]:focus { outline: none; }

        /* Enhanced welcome section styling */
        .welcome-content p { margin-bottom: 1rem; line-height: 1.7; }
        .welcome-content p:last-child { margin-bottom: 0; }
        .welcome-content ul, .welcome-content ol { margin: 1rem 0; }
        .welcome-content li { margin: 0.25rem 0; }

        /* Font system improvements */
        .font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

        /* Force white text for anything we mark as force-dark */
        .dark .force-dark * { color: white !important; }

        /* Also force any slate backgrounds to white text in dark */
        .dark .bg-slate-800 *, .dark .bg-slate-800\\/50 *, .dark .bg-slate-800\\/60 * {
          color: white !important;
        }

        /* Keep gradient text transparent in dark so gradient shows through */
        .dark .bg-clip-text.text-transparent {
          color: transparent !important;
          background-clip: text;
          -webkit-background-clip: text;
        }
      `}</style>

      <ControlPanel isDark={isDark} toggleTheme={toggleTheme} viewMode={viewMode} toggleViewMode={toggleViewMode} />

      <EditableWelcomeSection
        isDark={isDark}
        ownerMode={!!ownerMode}
        initialHtml={welcomeHtml}
        onSaveHtml={saveWelcome}
      />

      {/* Highlights */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}>
              {MODERN_ICONS.highlights} Highlights
            </span>
          </h3>
          {hiRow.hasOverflow && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => hiRow.scrollBy(-1)}
                className={`h-9 w-9 grid place-items-center rounded-full transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
                aria-label="Scroll left"
              >
                ◀
              </button>
              <button
                onClick={() => hiRow.scrollBy(1)}
                className={`h-9 w-9 grid place-items-center rounded-full transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
                aria-label="Scroll right"
              >
                ▶
              </button>
            </div>
          )}
        </div>

        <div
          ref={hiRow.rowRef}
          className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory"
          style={{ scrollBehavior: "smooth" }}
          onMouseDown={hiRow.onMouseDown}
          onMouseMove={hiRow.onMouseMove}
          onMouseUp={hiRow.onMouseUp}
          onMouseLeave={hiRow.onMouseLeave}
          onTouchStart={hiRow.onTouchStart}
          onTouchMove={hiRow.onTouchMove}
          onTouchEnd={hiRow.onTouchEnd}
          onKeyDown={hiRow.onKey}
          onScroll={hiRow.onScroll}
          tabIndex={0}
          aria-label="Highlights carousel"
        >
          {highlights.map((h) => (
            <div key={h.id} className="snap-center">
              <EnhancedHighlightCard
                item={h}
                onChange={updateHighlightOnServer}
                onDelete={deleteHighlightOnServer}
                ownerMode={!!ownerMode}
                isDark={isDark}
              />
            </div>
          ))}
          {ownerMode && <EnhancedAddHighlightCard onAdd={addHighlight} ownerMode={!!ownerMode} isDark={isDark} />}
        </div>

        {hiRow.hasOverflow && (
          <div className={`mt-3 h-1 w-full rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded transition-all duration-300"
              style={{ width: `${hiRow.progress}%` }}
            />
          </div>
        )}
      </section>

      {/* Projects */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => navigate("/projects")} className="text-left" aria-label="Go to all projects" title="Go to Projects">
            <h3 className="text-xl md:text-2xl font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}>
                {MODERN_ICONS.projects} Projects
              </span>
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/projects")}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "border-slate-600 text-white hover:bg-slate-700" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
            aria-label="View all projects"
          >
            View all →
          </button>
        </div>

        <div className={`mb-4 text-sm flex items-center gap-3 ${isDark ? "text-white/70" : "text-slate-500"}`}>
          <span className="inline-flex items-center gap-1 font-medium">
            <span>🔥</span> Trending tags are labeled
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <span>🕒</span> Recent updates in last 30 days
          </span>
        </div>

        <ProjectsAndPosts
          isDark={isDark}
          viewMode={viewMode}
          rowHook={pjRow}
          items={projects}
          navigateTo={(p)=>navigate("/projects", { state: { focusId: p.id || p.slug || null } })}
          isProject
        />
      </section>

      {/* Posts */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => navigate("/blog")} className="text-left" aria-label="Go to all blog posts" title="Go to Blog">
            <h3 className="text-xl md:text-2xl font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}>
                {MODERN_ICONS.posts} Latest Posts
              </span>
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/blog")}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "border-slate-600 text-white hover:bg-slate-700" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
            aria-label="View all blog posts"
          >
            View all →
          </button>
        </div>

        <PostsRow isDark={isDark} poRow={poRow} posts={posts} navigate={navigate} viewMode={viewMode} />

        {viewMode !== "grid" && (
          <div className={`mt-3 h-1 w-full rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded transition-all duration-300"
              style={{ width: `${poRow.progress}%` }}
            />
          </div>
        )}
      </section>

      <div className="h-12" />
    </div>
  );
}

/* ------------- Helper components for Projects/Posts rows ------------- */
function ProjectsAndPosts({ isDark, viewMode, rowHook, items, navigateTo, isProject=false }) {
  return (
    <div
      ref={rowHook.rowRef}
      className={`${viewMode==="grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" : "flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory"}`}
      style={viewMode !== "grid" ? { scrollBehavior: "smooth" } : {}}
      {...(viewMode==="grid" ? {} : {
        onMouseDown: rowHook.onMouseDown, onMouseMove: rowHook.onMouseMove, onMouseUp: rowHook.onMouseUp, onMouseLeave: rowHook.onMouseLeave,
        onTouchStart: rowHook.onTouchStart, onTouchMove: rowHook.onTouchMove, onTouchEnd: rowHook.onTouchEnd,
        onKeyDown: rowHook.onKey, onScroll: rowHook.onScroll, tabIndex: 0, "aria-label": isProject ? "Projects carousel" : "Posts carousel"
      })}
    >
      {(items || []).map((it) => {
        const trending = isProject ? isTrendingByTags(it.tags || it.techStack || []) : false;
        const recent = isProject ? isRecent(it.updatedAt || it.createdAt) : false;
        const badges = isProject ? projectBadges(it) : [];

        const go = () => { if (viewMode !== "grid" && !rowHook.canClick()) return; navigateTo(it); };
        const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };

        return (
          <Card
            isDark={isDark}
            key={it.id || it.slug || it.name || Math.random()}
            className={`${viewMode !== "grid" ? "min-w-[320px] snap-center" : ""} p-5 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isDark ? "bg-slate-800/60" : "bg-white/70"}`}
          >
            <button type="button" className="absolute inset-0" onClick={go} onKeyDown={onKey} aria-label={it.name || it.title || "Open"} />
            <div className="relative pointer-events-none flex flex-col gap-3">
              {isProject && Array.isArray(it.images) && it.images[0] && (
                <div className={`aspect-[16/9] overflow-hidden rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
                  <img src={it.images[0]} alt={it.name || it.title || "Project"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                </div>
              )}
              {isProject && (
                <div className="flex items-center gap-2 flex-wrap">
                  {trending && <span className={`text-xs px-2 py-1 rounded font-medium ${isDark ? "bg-pink-900/30 text-pink-200" : "bg-pink-100 text-pink-800"}`}>{MODERN_ICONS.trending} Trending</span>}
                  {recent && <span className={`text-xs px-2 py-1 rounded font-medium ${isDark ? "bg-emerald-900/30 text-emerald-200" : "bg-emerald-100 text-emerald-900"}`}>{MODERN_ICONS.recent} Recent</span>}
                  {(it.tags || []).slice(0, 4).map((t) => <span key={t} className={chipClassFor(t, isDark)}>{t}</span>)}
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h4 className={`text-lg font-semibold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>{it.name || it.title}</h4>
                {isProject && <div className="flex gap-2 flex-wrap">{badges.map(([emo,label]) => <span key={emo+label} title={label} className="text-lg">{emo}</span>)}</div>}
              </div>
              {isProject && it.summary && (
                <p
                  className={`text-sm leading-6 clamp-3 ${isDark ? "text-white force-dark" : "text-slate-600"}`}
                  dangerouslySetInnerHTML={{ __html: sanitizePreview(it.summary, { forceDark: isDark }) }}
                />
              )}
              {isProject && (
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">{badges.map(([emo,label])=> <span key={emo+label} title={label} className="text-lg">{emo}</span>)}</div>
                  <span className={`text-xs px-3 py-1.5 rounded-md font-medium ${isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"}`}>Read more →</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function PostsRow({ isDark, poRow, posts, navigate, viewMode }) {
  const containerProps = (viewMode === "grid")
    ? {}
    : {
        onMouseDown: poRow.onMouseDown, onMouseMove: poRow.onMouseMove, onMouseUp: poRow.onMouseUp, onMouseLeave: poRow.onMouseLeave,
        onTouchStart: poRow.onTouchStart, onTouchMove: poRow.onTouchMove, onTouchEnd: poRow.onTouchEnd,
        onKeyDown: poRow.onKey, onScroll: poRow.onScroll, tabIndex: 0, "aria-label": "Blog posts carousel"
      };

  return (
    <div
      ref={poRow.rowRef}
      className={`${viewMode==="grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" : "flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory"}`}
      style={viewMode !== "grid" ? { scrollBehavior: "smooth" } : {}}
      {...containerProps}
    >
      {(posts || []).map((post) => {
        const badges = postBadges(post);
        const html = sanitizePreview(post.bodyHtml || post.content || "", { forceDark: isDark });
        const snippet = snippetHtml(html, 320);

        const goBlog = () => { if (viewMode !== "grid" && !poRow.canClick()) return; navigate("/blog", { state: { focusId: post.id || post.slug || null } }); };
        const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goBlog(); } };

        return (
          <Card
            isDark={isDark}
            key={post.id || post.slug || post.title}
            className={`${viewMode !== "grid" ? "snap-center min-w-[320px]" : ""} p-5 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isDark ? "bg-slate-800/60" : "bg-white/70"}`}
          >
            <button type="button" className="absolute inset-0" onClick={goBlog} onKeyDown={onKey} aria-label={post.title || "Open post"} />
            <div className="relative pointer-events-none flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {(post.tags || []).slice(0, 4).map((t) => <span key={t} className={chipClassFor(t, isDark)}>{t}</span>)}
              </div>
              <h4 className={`text-lg font-semibold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>{post.title}</h4>
              <div className={`text-xs font-medium ${isDark ? "text-white/70" : "text-slate-500"}`}>
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : (post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : "")}
              </div>
              <div className={`text-sm leading-6 clamp-5 ${isDark ? "text-white force-dark" : "text-slate-600"}`} dangerouslySetInnerHTML={{ __html: snippet }} />
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">{badges.map(([emo,label])=> <span key={emo+label} title={label} className="text-lg">{emo}</span>)}</div>
                <span className={`text-xs px-3 py-1.5 rounded-md font-medium ${isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"}`}>Read more →</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
