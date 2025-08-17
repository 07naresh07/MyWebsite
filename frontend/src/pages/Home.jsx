// src/pages/Home.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProjects, getPosts } from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";

/* ------------------------------ Lightweight UI primitives ------------------------------ */
const Card = ({ children, className = "", ...props }) => (
  <div
    className={`relative bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}
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
  { light: "bg-amber-100 text-amber-900 ring-amber-200", dark: "dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700" },
  { light: "bg-emerald-100 text-emerald-900 ring-emerald-200", dark: "dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700" },
  { light: "bg-sky-100 text-sky-900 ring-sky-200", dark: "dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-700" },
  { light: "bg-fuchsia-100 text-fuchsia-900 ring-fuchsia-200", dark: "dark:bg-fuchsia-900/30 dark:text-fuchsia-200 dark:ring-fuchsia-700" },
  { light: "bg-rose-100 text-rose-900 ring-rose-200", dark: "dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-700" },
  { light: "bg-indigo-100 text-indigo-900 ring-indigo-200", dark: "dark:bg-indigo-900/30 dark:text-indigo-200 dark:ring-indigo-700" },
  { light: "bg-teal-100 text-teal-900 ring-teal-200", dark: "dark:bg-teal-900/30 dark:text-teal-200 dark:ring-teal-700" },
];
function hashIdx(str = "", mod = TAG_COLORS.length) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}
function chipClassFor(tag = "") {
  const c = TAG_COLORS[hashIdx(tag)];
  return `${c.light} ${c.dark} ring-1 rounded-md px-2 py-0.5 text-[11px]`;
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
function sanitizePreview(html) {
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
      return m?`${m[1].toLowerCase()}: ${m[2].trim()}`:"";
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
        }
        else if (n.nodeType === 1 && allowed.has(n.tagName)) {
          const tag=n.tagName.toLowerCase();
          out.push(`<${tag}>`); walk(n); out.push(`</${tag}>`);
        }
        else if (n.nodeType === 1) { walk(n); }
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

/* ------------------------------ Horizontal Row Hook (drag-to-scroll) ------------------------------ */
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

/* ------------------------------ Theme Hook ------------------------------ */
function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        window.localStorage.getItem("theme") === "dark" ||
        (!window.localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    window.localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return { isDark, toggleTheme };
}

/* ------------------------------ View Mode ------------------------------ */
function useViewMode() {
  const [viewMode, setViewMode] = useState("grid");
  const toggleViewMode = () => setViewMode((v) => (v === "grid" ? "list" : "grid"));
  return { viewMode, toggleViewMode };
}

/* ------------------------------ Welcome Editor ------------------------------ */
const LS_WELCOME = "welcomeContentV1";
const COLOR_PALETTE = [
  "#000000","#1f2937","#374151","#6b7280","#9ca3af","#d1d5db","#f3f4f6","#ffffff",
  "#dc2626","#ea580c","#f59e0b","#eab308","#84cc16","#22c55e","#10b981","#059669",
  "#0ea5e9","#0284c7","#2563eb","#4f46e5","#7c3aed","#a855f7","#c026d3","#db2777",
  "#ef4444","#f97316","#facc15","#65a30d","#16a34a","#0891b2","#6366f1","#8b5cf6",
  "#fca5a5","#fdba74","#fde047","#bef264","#86efac","#7dd3fc","#a5b4fc","#c4b5fd",
  "#991b1b","#9a3412","#a16207","#365314","#14532d","#164e63","#312e81","#581c87"
];
const FONT_SIZES = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "4" },
  { label: "X-Large", value: "5" },
];

function EditableWelcomeSection({ isDark, ownerMode }) {
  const defaultWelcomeText = `
    <p>I'm a technology-driven Civil Engineer focused on rethinking how we design, build, and optimize infrastructure. With <strong>7+ years</strong> across Japan and Nepal, I've worked on smart-city development, transportation infrastructure, renewable energy, and BIM-driven automation.</p>
    <p>At <strong>Woven by Toyota</strong>, I bridge civil engineering and software with advanced BIM workflows, parametric design, and data-centric automation.</p>
    <p>I'm also deeply curious about <strong>AI and machine learning</strong> in AEC—using data to elevate design accuracy, execution, and decision-making.</p>
  `;
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteTab, setPaletteTab] = useState("text");
  const [showFontSize, setShowFontSize] = useState(false);
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [welcomeContent, setWelcomeContent] = useState(() => {
    try {
      return window.localStorage.getItem(LS_WELCOME) || defaultWelcomeText;
    } catch {
      return defaultWelcomeText;
    }
  });

  const selectionInsideEditor = () => {
    const sel = window.getSelection();
    return !!(sel && sel.rangeCount && editorRef.current && editorRef.current.contains(sel.anchorNode));
  };

  const saveSelection = () => {
    if (!selectionInsideEditor()) return;
    try {
      const sel = window.getSelection();
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    } catch { savedRangeRef.current = null; }
  };
  const restoreSelection = () => {
    if (!savedRangeRef.current || !editorRef.current) return;
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      editorRef.current.focus();
    } catch { editorRef.current.focus(); }
  };

  // keep selection updated even if mouse leaves the editor
  useEffect(() => {
    if (!isEditing) return;
    const onSel = () => saveSelection();
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [isEditing]);

  const expandCollapsedToWord = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!r.collapsed) return;
    const node = r.startContainer;
    if (!node || node.nodeType !== 3) return;
    const text = node.nodeValue || "";
    let start = r.startOffset, end = r.endOffset;
    while (start > 0 && /\S/.test(text[start - 1])) start--;
    while (end < text.length && /\S/.test(text[end])) end++;
    if (start !== end) {
      const nr = document.createRange();
      nr.setStart(node, start);
      nr.setEnd(node, end);
      sel.removeAllRanges();
      sel.addRange(nr);
    }
  };

  useEffect(() => {
    if (!isEditing) return;
    try {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {}
  }, [isEditing]);

  const exec = (cmd, val = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      try { document.execCommand(cmd, false, val); } catch {}
    }
  };

  const openPalette = (e) => { e.preventDefault(); saveSelection(); setShowPalette((v) => !v); };

  // Robust wrapper using Range API (no execCommand)
  const wrapCurrentSelection = (styleObj) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // Extract current contents
    const frag = range.extractContents();
    const span = document.createElement("span");
    Object.assign(span.style, styleObj);

    // If nothing selected, inject zero-width space so it’s visible/typable
    if (!frag || !frag.childNodes.length) {
      span.textContent = "\u200b";
    } else {
      span.appendChild(frag);
    }

    range.insertNode(span);

    // Place caret at end of the new span
    sel.removeAllRanges();
    const after = document.createRange();
    after.selectNodeContents(span);
    after.collapse(false);
    sel.addRange(after);
    savedRangeRef.current = after.cloneRange();
  };

  const applyColor = (color) => {
    restoreSelection();
    expandCollapsedToWord();

    if (paletteTab === "text") {
      if (color) wrapCurrentSelection({ color });
      else wrapCurrentSelection({ color: "inherit" }); // visual removal
    } else {
      if (color) wrapCurrentSelection({ backgroundColor: color });
      else wrapCurrentSelection({ backgroundColor: "transparent" });
    }

    setShowPalette(false);
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const applyFontSize = (value) => {
    restoreSelection();
    try { document.execCommand("fontSize", false, value); } catch {}
    setShowFontSize(false);
    setTimeout(() => editorRef.current?.focus(), 50);
  };

  const handleEdit = () => { if (!ownerMode) return; setIsEditing(true); setTimeout(() => editorRef.current?.focus(), 60); };
  const handleSave = () => {
    const html = editorRef.current?.innerHTML || "";
    setWelcomeContent(html);
    try { window.localStorage.setItem(LS_WELCOME, html); } catch {}
    setIsEditing(false); setShowPalette(false); setShowFontSize(false);
  };
  const handleCancel = () => {
    if (editorRef.current) editorRef.current.innerHTML = welcomeContent;
    setIsEditing(false); setShowPalette(false); setShowFontSize(false);
  };

  return (
    <section className="container mx-auto px-4 py-10 relative group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {ownerMode && !isEditing && isHovered && (
        <button
          onClick={handleEdit}
          className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium"
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
        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-slate-600 pr-2">
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("bold")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 font-bold" title="Bold">B</button>
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("italic")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 italic" title="Italic">I</button>
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("underline")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 underline" title="Underline">U</button>
            </div>

            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-slate-600 pr-2">
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("insertUnorderedList")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 text-lg" title="Bullet List">•</button>
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("insertOrderedList")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600" title="Numbered List">1</button>
            </div>

            <div className="flex items-center gap-1 border-r border-gray-300 dark:border-slate-600 pr-2">
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("justifyLeft")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600" title="Align Left">←</button>
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("justifyCenter")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600" title="Center">↔</button>
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("justifyRight")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600" title="Align Right">→</button>
              <button onMouseDown={(e)=>e.preventDefault()} onClick={() => exec("justifyFull")} className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600" title="Justify">⤢</button>
            </div>

            <div className="relative border-r border-gray-300 dark:border-slate-600 pr-2">
              <button
                onMouseDown={(e)=>{e.preventDefault();}}
                onClick={() => setShowFontSize((v) => !v)}
                className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-1"
                title="Font Size"
              >
                <span className="text-sm font-bold">Aa</span>
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293 10 12l4.707-4.707 1.414 1.414L10 14.828 3.879 8.707z" clipRule="evenodd" /></svg>
              </button>
              {showFontSize && (
                <div className={`absolute top-full left-0 mt-2 z-30 rounded-lg shadow-xl border backdrop-blur-md ${isDark ? "bg-slate-800/95 border-slate-600" : "bg-white/95 border-gray-200"}`}>
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s.value}
                      onMouseDown={(e)=>{e.preventDefault();}}
                      onClick={() => applyFontSize(s.value)}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg ${isDark ? "text-slate-200" : "text-gray-700"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onMouseDown={(e)=>{e.preventDefault();}}
                onClick={openPalette}
                className="px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-1"
                title="Text Color / Highlight"
              >
                <span className="text-lg">🎨</span>
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293 10 12l4.707-4.707 1.414 1.414L10 14.828 3.879 8.707z" clipRule="evenodd" /></svg>
              </button>

              {showPalette && (
                <div
                  onMouseDown={(e)=>e.preventDefault()} // keep selection while palette open
                  className={`absolute top-full left-0 mt-2 z-50 w-80 rounded-xl shadow-2xl border backdrop-blur-md ${isDark ? "bg-slate-800/95 border-slate-600" : "bg-white/95 border-gray-200"}`}
                >
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${isDark ? "bg-slate-700 text-slate-200" : "bg-gray-100 text-gray-700"}`}>
                    <div className="flex gap-1 text-sm">
                      <button className={`px-3 py-1 rounded-md ${paletteTab === "text" ? (isDark ? "bg-slate-600 text-white" : "bg-white text-gray-900") : ""}`} onClick={() => setPaletteTab("text")}>
                        Text
                      </button>
                      <button className={`px-3 py-1 rounded-md ${paletteTab === "highlight" ? (isDark ? "bg-slate-600 text-white" : "bg-white text-gray-900") : ""}`} onClick={() => setPaletteTab("highlight")}>
                        Highlight
                      </button>
                    </div>
                    <button onClick={() => setShowPalette(false)} className="h-7 w-7 grid place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10">✕</button>
                  </div>

                  <div className="grid grid-cols-8 gap-2 p-3">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() => applyColor(c)}
                        title={c}
                      />
                    ))}
                  </div>

                  <div className="p-3 border-t border-gray-200 dark:border-slate-600">
                    <button
                      onClick={() => applyColor("")}
                      className={`w-full text-sm px-3 py-2 rounded-lg ${isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
                    >
                      Remove {paletteTab === "text" ? "text color" : "highlight"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          className={`text-[18px] leading-8 outline-none ${
            isEditing
              ? "text-inherit ring-2 ring-violet-500/50 rounded-lg p-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600"
              : "text-slate-800 dark:text-slate-200"
          }`}
          style={{ textAlign: "justify", minHeight: isEditing ? "200px" : "auto" }}
          dangerouslySetInnerHTML={{ __html: welcomeContent }}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onFocus={saveSelection}
        />

        {isEditing && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className={`px-6 py-2 font-medium rounded-lg border ${isDark ? "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"}`}
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
const DEFAULT_HIGHLIGHTS = [
  { id: "h-1", icon: "🌐", titleHtml: "Engineering Tomorrow's Infrastructure", bodyHtml: "Smart-city, transportation, and BIM-first automation for efficient, sustainable outcomes." },
  { id: "h-2", icon: "🧩", titleHtml: "Bridging Civil & Technology", bodyHtml: "Parametric design + data-centric workflows that improve coordination and speed." },
  { id: "h-3", icon: "🤖", titleHtml: "AI & ML in AEC", bodyHtml: "Data-driven methods to power better design and decisions across the built world." },
];

const EMOJI_CATEGORIES = {
  Tech: ["🌐", "🧩", "🤖", "⚙️", "🧠", "💡", "🛠️", "💾", "🧰", "💻", "🖥️", "📱"],
  Infrastructure: ["🚦", "🏗️", "🛰️", "🗺️", "📐", "🏙️", "🌉", "🚇", "🚉", "🚆", "🚀"],
  Science: ["🧪", "📊", "🧮", "🔬", "🧭", "⚡", "🔋", "🔌", "📈", "📉"],
  Nature: ["🌍", "🌏", "🌎", "⛰️", "🏔️", "🌱", "🌤️", "🌧️", "⭐", "🌙"],
  Objects: ["🔧", "🗜️", "🔩", "📦", "🧱", "📎", "🖇️", "✏️", "🖊️", "📝", "📚", "📄"],
};

/* ------------------------------ Highlight Card ------------------------------ */
function EnhancedHighlightCard({ item, onChange, onDelete, ownerMode, isDark }) {
  const [editing, setEditing] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tech");
  const titleRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (editing) try {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {}
  }, [editing]);

  const focusBody = () => {
    if (bodyRef.current) {
      bodyRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(bodyRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const exec = (cmd, val=null) => {
    focusBody();
    try { document.execCommand(cmd, false, val); } catch {}
  };

  const startEdit = () => { if (!ownerMode) return; setEditing(true); setTimeout(focusBody, 80); };
  const saveEdit = () => {
    onChange({
      ...item,
      titleHtml: titleRef.current?.innerHTML || "",
      bodyHtml: bodyRef.current?.innerHTML || ""
    });
    setEditing(false);
    setIconOpen(false);
  };
  const cancelEdit = () => {
    if (titleRef.current) titleRef.current.innerHTML = item.titleHtml || "";
    if (bodyRef.current) bodyRef.current.innerHTML = item.bodyHtml || "";
    setEditing(false);
    setIconOpen(false);
  };

  const gradient = isDark ? DARK_UI_GRADIENT : UI_GRADIENT;

  return (
    <>
      <div className="relative group h-full">
        {ownerMode && !editing && (
          <div className="absolute right-3 top-3 z-20 opacity-0 group-hover:opacity-100 transition-all">
            <div className="flex gap-2">
              <button onClick={startEdit} className="text-xs px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-white/20 transition-all">✏️ Edit</button>
              <button onClick={() => onDelete(item.id)} className="text-xs px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-white/20 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">🗑️ Delete</button>
            </div>
          </div>
        )}

        <Card className={`relative p-4 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl border-0 shadow-md ${isDark ? "bg-slate-800/50" : "bg-white/70"} backdrop-blur-sm flex flex-col`}>
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  className={`text-4xl transition-all p-2 rounded-xl ${ownerMode ? "hover:scale-110" : ""} ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); ownerMode && setIconOpen((v) => !v); }}
                  aria-label="Choose icon"
                >
                  {item.icon || "💡"}
                </button>

                {ownerMode && iconOpen && (
                  <div className={`absolute left-0 top-full mt-2 z-50 w-80 max-h-96 overflow-hidden rounded-2xl shadow-2xl backdrop-blur-md ${isDark ? "bg-slate-800/95" : "bg-white/95"} border ${isDark ? "border-slate-700" : "border-slate-200"}`} onClick={(e)=>e.stopPropagation()}>
                    <div className="flex overflow-x-auto p-2 border-b border-slate-200 dark:border-slate-700">
                      {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                        <button key={cat}
                          className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${selectedCategory===cat ? `bg-gradient-to-r ${gradient} text-white` : `${isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}`}
                          onClick={()=>setSelectedCategory(cat)}
                        >{cat}</button>
                      ))}
                    </div>
                    <div className="p-3 grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                      {EMOJI_CATEGORIES[selectedCategory].map((emo)=>(
                        <button key={emo} className={`h-12 w-12 grid place-items-center text-2xl rounded-xl ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                          onClick={()=>{ onChange({ ...item, icon: emo }); setIconOpen(false); }}>{emo}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  ref={titleRef}
                  contentEditable={editing}
                  suppressContentEditableWarning
                  className={`text-xl font-bold leading-tight outline-none ${editing ? `ring-2 ring-violet-500/50 rounded-lg px-2 py-1 ${isDark ? "bg-slate-700" : "bg-white"}` : ""} bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}
                  dangerouslySetInnerHTML={{ __html: item.titleHtml || "" }}
                />
                <div className={`mt-3 h-1 w-20 rounded-full bg-gradient-to-r ${gradient} opacity-60`} />
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div
                ref={bodyRef}
                contentEditable={editing}
                suppressContentEditableWarning
                className={`relative z-10 text-sm leading-7 outline-none flex-1 ${
                  editing ? `ring-2 ring-violet-500/50 rounded-lg p-3 ${isDark ? "bg-slate-700 text-slate-200" : "bg-white text-slate-700"}` : `${isDark ? "text-slate-300" : "text-slate-600"} pb-8`
                }`}
                style={{ textAlign: "justify", minHeight: editing ? "120px" : "auto" }}
                dangerouslySetInnerHTML={{ __html: item.bodyHtml || "" }}
              />

              {!editing && (
                <div className="flex justify-end mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${isDark ? "text-slate-400 hover:text-violet-400 hover:bg-slate-700/50" : "text-slate-500 hover:text-violet-600 hover:bg-slate-100/50"}`}
                    aria-label="Read more highlight"
                  >
                    <span>Read more</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {editing && ownerMode && (
              <div className="relative z-10 mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700">
                  <button onClick={() => { try { document.execCommand("styleWithCSS", false, true); } catch {} ; document.execCommand("bold"); }} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600 font-bold">B</button>
                  <button onClick={() => document.execCommand("italic")} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600 italic">I</button>
                  <button onClick={() => document.execCommand("insertUnorderedList")} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600">•</button>
                  <button onClick={() => document.execCommand("insertOrderedList")} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600">1</button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
                  <button onClick={() => document.execCommand("justifyLeft")} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600">←</button>
                  <button onClick={() => document.execCommand("justifyCenter")} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600">↔</button>
                  <button onClick={() => document.execCommand("justifyRight")} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600">→</button>
                  <button onClick={() => document.execCommand("justifyFull")} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600">⤢</button>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all">Save Changes</button>
                  <button onClick={cancelEdit} className={`px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md ${isDark ? "bg-slate-800/95" : "bg-white/95"}`} onClick={(e)=>e.stopPropagation()}>
            <div className={`p-6 flex items-start justify-between border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{item.icon || "💡"}</span>
                <div className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${isDark ? DARK_UI_GRADIENT : UI_GRADIENT}`} dangerouslySetInnerHTML={{ __html: item.titleHtml || "" }} />
              </div>
              <button className={`h-10 w-10 grid place-items-center rounded-full ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="p-6">
              <div className={`prose prose-lg max-w-none leading-8 ${isDark ? "text-slate-300" : "text-slate-700"}`} style={{ textAlign: "justify" }} dangerouslySetInnerHTML={{ __html: item.bodyHtml || "" }} />
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
    <button onClick={onAdd} className="snap-center inline-block min-w-[320px] max-w-sm text-left group focus:outline-none" type="button" aria-label="Add section">
      <Card className={`p-6 h-full border-2 border-dashed rounded-2xl grid place-items-center transition-all hover:scale-[1.02] ${isDark ? "border-slate-600 hover:border-slate-500 bg-slate-800/30" : "border-slate-300 hover:border-slate-400 bg-slate-50/50"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`text-4xl p-3 rounded-full ${isDark ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600"}`}>
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          </div>
          <div className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>Add New Section</div>
        </div>
      </Card>
    </button>
  );
}

/* ------------------------------ Floating Controls ------------------------------ */
function ControlPanel({ isDark, toggleTheme, viewMode, toggleViewMode }) {
  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
      <button
        onClick={toggleTheme}
        className={`p-3 rounded-xl backdrop-blur-md border border-white/20 ${isDark ? "bg-slate-800/80 hover:bg-slate-700/50" : "bg-white/80 hover:bg-white/70"} transition-all`}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
          </svg>
        )}
      </button>

      <button
        onClick={toggleViewMode}
        className={`p-3 rounded-xl backdrop-blur-md border border-white/20 ${isDark ? "bg-slate-800/80 hover:bg-slate-700/50" : "bg-white/80 hover:bg-white/70"} transition-all`}
        aria-label="Toggle view mode"
      >
        {viewMode === "grid" ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" strokeWidth="2"/></svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round"/></svg>
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
  const [highlights, setHighlights] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(LS_HIGHLIGHTS) || "null") || DEFAULT_HIGHLIGHTS;
    } catch {
      return DEFAULT_HIGHLIGHTS;
    }
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pj = await getProjects();
        if (mounted) setProjects(Array.isArray(pj) ? pj : (pj?.items || []));
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
          };
        });

        let local = [];
        try {
          const raw = localStorage.getItem("localBlogs");
          local = raw ? JSON.parse(raw) : [];
        } catch {}

        const map = new Map();
        apiItems.forEach((p) => map.set(String(p.id || p.slug), p));
        local.forEach((p) => map.set(String(p.id || p.slug), { ...p, createdAt: p.createdAt || new Date().toISOString() }));

        const merged = Array.from(map.values())
          .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

        if (mounted) setPosts(merged.slice(0, 12));
      } catch (error) {
        console.error("Failed to load posts:", error);
        if (mounted) setPosts([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_HIGHLIGHTS, JSON.stringify(highlights));
    } catch {}
  }, [highlights]);

  const hiRow = useHRow();
  const pjRow = useHRow();
  const poRow = useHRow();

  const addHighlight = () => {
    const id = `h-${Date.now()}`;
    setHighlights((prev) => [...prev, { id, icon: "💡", titleHtml: "New highlight", bodyHtml: "Describe your highlight…" }]);
  };
  const updateHighlight = (next) => setHighlights((prev) => prev.map((h) => (h.id === next.id ? next : h)));
  const deleteHighlight = (id) => setHighlights((prev) => prev.filter((h) => h.id !== id));

  const gradient = isDark ? DARK_UI_GRADIENT : UI_GRADIENT;

  const hrefForProject = (p) =>
    p?.path || p?.url || (p?.slug ? `/projects/${p.slug}` : (p?.id ? `/projects/${p.id}` : "/projects"));

  const hrefForPost = (post) =>
    post?.path || post?.url || (post?.slug ? `/blog/${post.slug}` : (post?.id ? `/blog/${post.id}` : "/blog"));

  return (
    <>
      <style>{`
        .clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .clamp-5 { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .animate-fade-in { animation: fadeIn 0.6s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        [contenteditable] ul { list-style: disc outside; padding-left: 1.25rem; margin: 0.25rem 0; }
        [contenteditable] ol { list-style: decimal outside; padding-left: 1.75rem; margin: 0.25rem 0; }
        [contenteditable] li { margin: 0.125rem 0; }
        [contenteditable] p { margin: 0.5rem 0; }
        [contenteditable]:focus { outline: none; }
      `}</style>

      <ControlPanel isDark={isDark} toggleTheme={toggleTheme} viewMode={viewMode} toggleViewMode={toggleViewMode} />

      <EditableWelcomeSection isDark={isDark} ownerMode={ownerMode} />

      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}>{MODERN_ICONS.highlights} Highlights</span>
          </h3>
          {hiRow.hasOverflow && (
            <div className="flex items-center gap-2">
              <button onClick={() => hiRow.scrollBy(-1)} className={`h-9 w-9 grid place-items-center rounded-full ${isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200"}`} aria-label="Scroll left">◀</button>
              <button onClick={() => hiRow.scrollBy(1)} className={`h-9 w-9 grid place-items-center rounded-full ${isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200"}`} aria-label="Scroll right">▶</button>
            </div>
          )}
        </div>

        <div
          ref={hiRow.rowRef}
          className="mt-4 flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory"
          style={{ scrollBehavior: 'smooth' }}
          onMouseDown={hiRow.onMouseDown} onMouseMove={hiRow.onMouseMove} onMouseUp={hiRow.onMouseUp} onMouseLeave={hiRow.onMouseLeave}
          onTouchStart={hiRow.onTouchStart} onTouchMove={hiRow.onTouchMove} onTouchEnd={hiRow.onTouchEnd}
          onKeyDown={hiRow.onKey} onScroll={hiRow.onScroll} tabIndex={0}
          aria-label="Highlights carousel"
        >
          {highlights.map((h) => (
            <div key={h.id} className="snap-center min-w-[320px] max-w-sm">
              <EnhancedHighlightCard
                item={h}
                onChange={updateHighlight}
                onDelete={deleteHighlight}
                ownerMode={ownerMode}
                isDark={isDark}
              />
            </div>
          ))}
          <EnhancedAddHighlightCard onAdd={addHighlight} ownerMode={ownerMode} isDark={isDark} />
        </div>

        <div className="mt-3 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded">
          <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded transition-all duration-300" style={{ width: `${hiRow.progress}%` }} />
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="text-left"
            aria-label="Go to all projects"
            title="Go to Projects"
          >
            <h3 className="text-xl md:text-2xl font-semibold flex items-center gap-2 hover:opacity-90">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}>{MODERN_ICONS.projects} Projects</span>
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/projects")}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "border-slate-600 text-slate-200 hover:bg-slate-700" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
            aria-label="View all projects"
          >
            View all →
          </button>
        </div>

        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><span>🔥</span> Trending tags are labeled</span>
          <span className="inline-flex items-center gap-1"><span>🕒</span> Recent updates in last 30 days</span>
        </div>

        <div
          ref={pjRow.rowRef}
          className={`mt-4 ${viewMode==="grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" : "flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory"}`}
          style={viewMode !== "grid" ? { scrollBehavior: 'smooth' } : {}}
          {...(viewMode==="grid" ? {} : {
            onMouseDown: pjRow.onMouseDown, onMouseMove: pjRow.onMouseMove, onMouseUp: pjRow.onMouseUp, onMouseLeave: pjRow.onMouseLeave,
            onTouchStart: pjRow.onTouchStart, onTouchMove: pjRow.onTouchMove, onTouchEnd: pjRow.onTouchEnd,
            onKeyDown: pjRow.onKey, onScroll: pjRow.onScroll, tabIndex: 0, "aria-label": "Projects carousel"
          })}
        >
          {(projects || []).map((p) => {
            const badges = projectBadges(p);
            const trending = isTrendingByTags(p.tags || p.techStack || []);
            const recent = isRecent(p.updatedAt || p.createdAt);
            const href = p?.path || p?.url || (p?.slug ? `/projects/${p.slug}` : (p?.id ? `/projects/${p.id}` : "/projects"));

            const goProjects = () => {
              if (!pjRow.canClick()) return;
              navigate("/projects", { state: { focusId: p.id || p.slug || null } });
            };
            const onKey = (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goProjects(); }
            };

            return (
              <Card
                key={p.id || p.slug || href}
                className={`${viewMode !== "grid" ? "min-w-[320px] snap-center" : ""} p-4 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isDark ? "bg-slate-800/60" : "bg-white/70"}`}
              >
                <button
                  type="button"
                  className="absolute inset-0"
                  onClick={goProjects}
                  onKeyDown={onKey}
                  aria-label={p.name || p.title || "Open project"}
                />
                <div className="relative pointer-events-none flex flex-col gap-3">
                  {Array.isArray(p.images) && p.images[0] && (
                    <div className="aspect-[16/9] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-700">
                      <img src={p.images[0]} alt={p.name || p.title || "Project"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {trending && <span className="text-xs px-2 py-0.5 rounded bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200">{MODERN_ICONS.trending} Trending</span>}
                    {recent && <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">{MODERN_ICONS.recent} Recent</span>}
                    {(p.tags || []).slice(0, 4).map((t) => <span key={t} className={chipClassFor(t)}>{t}</span>)}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{p.name || p.title}</h4>
                    <div className="flex gap-2 flex-wrap">
                      {badges.map(([emo, label]) => (
                        <span key={emo+label} title={label} className="text-base">{emo}</span>
                      ))}
                    </div>
                  </div>
                  {p.summary && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 clamp-3" dangerouslySetInnerHTML={{ __html: sanitizePreview(p.summary) }} />
                  )}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Updated {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—")}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {viewMode!=="grid" && (
          <div className="mt-3 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded transition-all duration-300" style={{ width: `${pjRow.progress}%` }} />
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/blog")}
            className="text-left"
            aria-label="Go to all blog posts"
            title="Go to Blog"
          >
            <h3 className="text-xl md:text-2xl font-semibold flex items-center gap-2 hover:opacity-90">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}>{MODERN_ICONS.posts} Latest Posts</span>
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/blog")}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "border-slate-600 text-slate-200 hover:bg-slate-700" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
            aria-label="View all posts"
          >
            View all →
          </button>
        </div>

        <div
          ref={poRow.rowRef}
          className="mt-4 flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory"
          style={{ scrollBehavior: 'smooth' }}
          onMouseDown={poRow.onMouseDown} onMouseMove={poRow.onMouseMove} onMouseUp={poRow.onMouseUp} onMouseLeave={poRow.onMouseLeave}
          onTouchStart={poRow.onTouchStart} onTouchMove={poRow.onTouchMove} onTouchEnd={poRow.onTouchEnd}
          onKeyDown={poRow.onKey} onScroll={poRow.onScroll} tabIndex={0}
          aria-label="Blog posts carousel"
        >
          {(posts || []).map((post) => {
            const badges = postBadges(post);
            const html = sanitizePreview(post.bodyHtml || post.content || "");
            const snippet = snippetHtml(html, 320);
            const href = post?.path || post?.url || (post?.slug ? `/blog/${post.slug}` : (post?.id ? `/blog/${post.id}` : "/blog"));

            const goBlog = () => {
              if (!poRow.canClick()) return;
              navigate("/blog", { state: { focusId: post.id || post.slug || null } });
            };
            const onKey = (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goBlog(); }
            };

            return (
              <Card
                key={post.id || post.slug || href}
                className={`snap-center min-w-[320px] max-w-sm p-4 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isDark ? "bg-slate-800/60" : "bg-white/70"}`}
              >
                <button
                  type="button"
                  className="absolute inset-0"
                  onClick={goBlog}
                  onKeyDown={onKey}
                  aria-label={post.title || "Open post"}
                />
                <div className="relative pointer-events-none flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(post.tags || []).slice(0, 4).map((t) => <span key={t} className={chipClassFor(t)}>{t}</span>)}
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{post.title}</h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : (post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : "")}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 clamp-5" dangerouslySetInnerHTML={{ __html: snippet }} />
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">{badges.map(([emo,label])=> <span key={emo+label} title={label}>{emo}</span>)}</div>
                    <span className={`text-xs px-2 py-1 rounded ${isDark ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700"}`}>Read more →</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-3 h-1 w-full bg-slate-200 dark:bg-slate-700 rounded">
          <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded transition-all duration-300" style={{ width: `${poRow.progress}%` }} />
        </div>
      </section>

      <div className="h-10" />
    </>
  );
}
