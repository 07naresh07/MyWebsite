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

/* ------------------------------ Enhanced UI primitives ------------------------------ */
const Card = ({ children, className = "", isDark = false, ...props }) => (
  <div
    className={`relative shadow-lg border backdrop-blur-sm transform-gpu transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/10 ${isDark ? "bg-slate-800/80 border-slate-700/50 hover:border-slate-600/70" : "bg-white/90 border-slate-200/60 hover:border-slate-300/70"} ${className}`}
    {...props}
  >
    {children}
  </div>
);
const Reveal = ({ children }) => <div className="animate-fade-in-enhanced">{children}</div>;

/* ------------------------------ Enhanced Theme & UI ------------------------------ */
const ENHANCED_GRADIENT = "from-indigo-500 via-purple-500 via-violet-500 to-fuchsia-500";
const DARK_ENHANCED_GRADIENT = "from-indigo-300 via-purple-300 via-violet-300 to-fuchsia-300";

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

/* ENHANCED EMOJI CATEGORIES WITH BIM & AI - BETTER ORGANIZED */
const ENHANCED_EMOJI_CATEGORIES = {
  Tech: ["🌐", "🧩", "🤖", "⚙️", "🧠", "💡", "🛠️", "💾", "🧰", "💻", "🖥️", "📱", "🔬", "⚡", "🚀"],
  BIM: ["🏗️", "🏛️", "🏢", "🏭", "📐", "📏", "🧱", "🪜", "🪟", "🚪", "📊", "📈", "🗺️", "🧮", "⚙️"],
  AI: ["🤖", "🧠", "💡", "⚡", "🔬", "🧪", "🔭", "👁️", "🎯", "🧩", "🔮", "💻", "🖥️", "💾", "🌐"],
  Infrastructure: ["🚦", "🏗️", "🛰️", "🗺️", "🏙️", "🌉", "🚇", "🚉", "🚆", "🛤️", "🌍", "🏗️", "🌆", "🏢", "🏭"],
  Science: ["🧪", "📊", "🧮", "🔬", "🧭", "⚡", "🔋", "🔌", "📈", "📉", "🔭", "🧬", "⚗️", "🧫", "🦠"],
  Nature: ["🌍", "🌏", "🌎", "⛰️", "🏔️", "🌱", "🌤️", "🌧️", "⭐", "🌙", "🌊", "🍃", "🌺", "🌸", "🌼"],
  Objects: ["🔧", "🗜️", "🔩", "📦", "🧱", "📎", "🖇️", "✏️", "🖊️", "📝", "📚", "📄", "💎", "🎯", "🗂️"],
  Creative: ["🎨", "🖼️", "🎭", "🎪", "🎵", "🎶", "📸", "🎬", "✨", "🌟", "💫", "🎆", "🎇", "🎉", "🎊"],
};

const ENHANCED_TAG_COLORS = [
  { 
    light: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 ring-amber-300 hover:from-amber-200 hover:to-yellow-200", 
    dark: "bg-gradient-to-r from-amber-900/40 to-yellow-900/40 text-amber-200 ring-amber-600 hover:from-amber-800/50 hover:to-yellow-800/50" 
  },
  { 
    light: "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-900 ring-emerald-300 hover:from-emerald-200 hover:to-green-200", 
    dark: "bg-gradient-to-r from-emerald-900/40 to-green-900/40 text-emerald-200 ring-emerald-600 hover:from-emerald-800/50 hover:to-green-800/50" 
  },
  { 
    light: "bg-gradient-to-r from-sky-100 to-blue-100 text-sky-900 ring-sky-300 hover:from-sky-200 hover:to-blue-200", 
    dark: "bg-gradient-to-r from-sky-900/40 to-blue-900/40 text-sky-200 ring-sky-600 hover:from-sky-800/50 hover:to-blue-800/50" 
  },
  { 
    light: "bg-gradient-to-r from-fuchsia-100 to-pink-100 text-fuchsia-900 ring-fuchsia-300 hover:from-fuchsia-200 hover:to-pink-200", 
    dark: "bg-gradient-to-r from-fuchsia-900/40 to-pink-900/40 text-fuchsia-200 ring-fuchsia-600 hover:from-fuchsia-800/50 hover:to-pink-800/50" 
  },
  { 
    light: "bg-gradient-to-r from-rose-100 to-red-100 text-rose-900 ring-rose-300 hover:from-rose-200 hover:to-red-200", 
    dark: "bg-gradient-to-r from-rose-900/40 to-red-900/40 text-rose-200 ring-rose-600 hover:from-rose-800/50 hover:to-red-800/50" 
  },
  { 
    light: "bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-900 ring-indigo-300 hover:from-indigo-200 hover:to-purple-200", 
    dark: "bg-gradient-to-r from-indigo-900/40 to-purple-900/40 text-indigo-200 ring-indigo-600 hover:from-indigo-800/50 hover:to-purple-800/50" 
  },
  { 
    light: "bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-900 ring-teal-300 hover:from-teal-200 hover:to-cyan-200", 
    dark: "bg-gradient-to-r from-teal-900/40 to-cyan-900/40 text-teal-200 ring-teal-600 hover:from-teal-800/50 hover:to-cyan-800/50" 
  },
];

function hashIdx(str = "", mod = ENHANCED_TAG_COLORS.length) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}
function chipClassFor(tag = "", isDark = false) {
  const c = ENHANCED_TAG_COLORS[hashIdx(tag)];
  return `${isDark ? c.dark : c.light} ring-2 rounded-full px-3 py-1 text-xs font-semibold transform transition-all duration-300 hover:scale-105 cursor-default`;
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
      if (forceDark && (prop === "color" || prop === "background-color")) return "";
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
function snippetHtml(html, maxChars = 520) {
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

/* ------------------------------ SIMPLE SCROLL HOOK ------------------------------ */
function useSimpleScroll() {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollLeft = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: -400, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  const scrollRight = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: 400, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  const handleWheel = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY * 0.5;
    checkScroll();
  };

  return { scrollRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight, handleWheel, checkScroll };
}

/* ------------------------------ Original Horizontal Row Hook for Projects/Posts ------------------------------ */
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
    el.classList.add("cursor-grabbing", "select-none");
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
    if (el) el.classList.remove("cursor-grabbing", "select-none");
    drag.current.down = false;
    setTimeout(() => { drag.current.moved = false; }, 100);
  };

  const onMouseDown = (e) => { if (e.button !== 0) return; start(e.pageX); };
  const onMouseMove = (e) => { if (drag.current.down) move(e.pageX); };
  const onMouseUp = end;
  const onMouseLeave = () => { if (drag.current.down) end(); };

  const onTouchStart = (e) => { const t = e.touches?.[0]; if (t) start(t.pageX); };
  const onTouchMove = (e) => { const t = e.touches?.[0]; if (t) move(t.pageX); };
  const onTouchEnd = end;

  const onWheel = (e) => {
    const el = rowRef.current;
    if (!el) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  };

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
    setHasOverflow(max > 10);
    setProgress(max > 0 ? Math.min(100, Math.max(0, (el.scrollLeft / max) * 100)) : 0);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const max = el.scrollWidth - el.clientWidth;
      setHasOverflow(max > 10);
      setProgress(0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canClick = () => !drag.current.moved && !drag.current.down;

  return {
    rowRef, progress, hasOverflow, canClick,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
    onTouchStart, onTouchMove, onTouchEnd, onWheel, scrollBy, onKey, onScroll
  };
}

/* ------------------------------ Enhanced Local Theme ------------------------------ */
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
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
        root.style.setProperty('--bg-primary', '#0f172a');
        root.style.setProperty('--bg-secondary', '#1e293b');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#cbd5e1');
        document.body.className = "bg-slate-900 text-white font-sans transition-all duration-700";
      } else {
        root.classList.remove("dark");
        root.style.setProperty('--bg-primary', '#f8fafc');
        root.style.setProperty('--bg-secondary', '#ffffff');
        root.style.setProperty('--text-primary', '#0f172a');
        root.style.setProperty('--text-secondary', '#475569');
        document.body.className = "bg-gray-50 text-slate-900 font-sans transition-all duration-700";
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

/* ------------------------------ Enhanced Welcome Editor ------------------------------ */
const LS_WELCOME = "welcomeContentV1";

function EditableWelcomeSection({ isDark, ownerMode, initialHtml, onSaveHtml }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const editorRef = useRef(null);

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
      return;
    }
    const isMeta = e.ctrlKey || e.metaKey;
    if (isMeta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) document.execCommand('redo');
      else document.execCommand('undo');
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
    }, 100);
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
  };

  const handleCancel = () => {
    if (editorRef.current) editorRef.current.innerHTML = welcomeContent;
    setIsEditing(false);
  };

  const removeFormatting = () => {
    try { document.execCommand("removeFormat"); } catch {}
  };

  const panelBg = isDark ? "bg-slate-800/95 border-slate-600/50" : "bg-white/95 border-gray-200/50";
  const btnHover = isDark ? "hover:bg-slate-600/80 text-white transition-all duration-300" : "hover:bg-gray-200/80 text-slate-700 transition-all duration-300";

  return (
    <section
      className={`container mx-auto px-4 py-12 relative group ${isDark ? "text-white" : "text-slate-800"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {ownerMode && !isEditing && isHovered && (
        <button
          onClick={handleEdit}
          className={`absolute top-6 right-6 z-20 px-4 py-2 text-sm font-semibold backdrop-blur-md border rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 ${isDark ? "bg-slate-800/90 border-slate-600/70 text-white hover:bg-slate-700/90" : "bg-white/90 border-gray-300/70 text-slate-700 hover:bg-gray-50/90"} flex items-center gap-2`}
          aria-label="Edit welcome"
        >
          ✏️ Edit Welcome
        </button>
      )}

      <Reveal>
        <h3 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-2">
          <span className={`bg-clip-text text-transparent bg-gradient-to-r ${ENHANCED_GRADIENT} animate-gradient-shift`}>Welcome</span>
          <span aria-hidden="true" className="animate-wave">👋</span>
        </h3>
      </Reveal>
      <div className={`h-1.5 bg-gradient-to-r ${ENHANCED_GRADIENT} rounded-full mb-8 w-full opacity-80 animate-pulse-subtle`} />

      {isEditing && (
        <div className={`mb-6 p-4 rounded-2xl border shadow-2xl backdrop-blur-md ${panelBg} relative animate-fade-in-enhanced`}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("bold")} className={`px-3 py-2 rounded-xl font-bold text-sm ${btnHover}`}>B</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("italic")} className={`px-3 py-2 rounded-xl italic text-sm ${btnHover}`}>I</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("underline")} className={`px-3 py-2 rounded-xl underline text-sm ${btnHover}`}>U</button>
            <span className={`mx-2 w-px h-6 ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("insertUnorderedList")} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>• List</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("insertOrderedList")} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>1. List</button>
            <span className={`mx-2 w-px h-6 ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("justifyLeft")} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>← Left</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("justifyCenter")} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>↔ Center</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("justifyRight")} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>→ Right</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("justifyFull")} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>≋ Justify</button>
            <span className={`mx-2 w-px h-6 ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("undo")} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>↶ Undo</button>
            <button onMouseDown={(e)=>e.preventDefault()} onClick={() => document.execCommand("redo")} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>↷ Redo</button>
            <span className={`mx-2 w-px h-6 ${isDark ? "bg-slate-600" : "bg-gray-300"}`} />
            <button onMouseDown={(e)=>e.preventDefault()} onClick={removeFormatting} className={`px-3 py-2 rounded-xl text-sm ${btnHover}`}>🗑️ Clear</button>
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
          className={`text-lg leading-8 outline-none welcome-content transition-all duration-300 ${
            isEditing
              ? `${isDark ? "text-white bg-slate-800/90 border-slate-600/70" : "text-slate-800 bg-white/90 border-gray-300/70"} ring-2 ring-violet-500/60 rounded-2xl p-6 border backdrop-blur-md shadow-2xl`
              : `${isDark ? "text-white" : "text-slate-800"}`
          }`}
          style={{ minHeight: isEditing ? "250px" : "auto" }}
          dangerouslySetInnerHTML={{ __html: welcomeContent }}
        />

        {isEditing && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
            >
              💾 Save Changes
            </button>
            <button
              onClick={handleCancel}
              className={`px-8 py-3 font-semibold rounded-xl border text-sm transition-all duration-300 transform hover:scale-105 ${isDark ? "bg-slate-700/80 text-slate-300 border-slate-600/70 hover:bg-slate-600/80" : "bg-gray-100/80 text-gray-700 border-gray-300/70 hover:bg-gray-200/80"}`}
            >
              ❌ Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ Enhanced Highlights ------------------------------ */
const LS_HIGHLIGHTS = "homeHighlightsV1";

/* ------------------------------ REDESIGNED HIGHLIGHT CARD ------------------------------ */
function HighlightCard({ item, onChange, onDelete, ownerMode, isDark }) {
  const [editing, setEditing] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const titleRef = useRef(null);
  const bodyRef = useRef(null);

  const gradient = isDark ? DARK_ENHANCED_GRADIENT : ENHANCED_GRADIENT;

  const startEdit = () => {
    if (!ownerMode) return;
    setEditing(true);
  };

  const saveEdit = () => {
    const titleContent = titleRef.current?.value || titleRef.current?.innerText || "";
    const bodyRaw = bodyRef.current?.value || "";
    // Convert plain text to HTML paragraphs
    const bodyContent = bodyRaw.split('\n\n').filter(p => p.trim()).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    onChange({ ...item, titleHtml: titleContent, title: titleContent, bodyHtml: bodyContent, description: bodyContent });
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const selectIcon = (icon) => {
    onChange({ ...item, icon });
    setShowIconPicker(false);
  };

  return (
    <>
      <div className={`flex-shrink-0 w-80 ${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl relative group`}>
        {/* Edit/Delete Buttons */}
        {ownerMode && !editing && (
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={startEdit}
              className={`px-3 py-1 text-xs rounded-lg ${isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"} hover:scale-105 transition-transform`}
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className={`px-3 py-1 text-xs rounded-lg ${isDark ? "bg-red-900/50 text-white" : "bg-red-100 text-red-700"} hover:scale-105 transition-transform`}
            >
              🗑️
            </button>
          </div>
        )}

        {/* Icon and Title in same row */}
        <div className="flex items-start gap-3 mb-4">
          <button
            onClick={() => ownerMode && setShowIconPicker(true)}
            className={`text-3xl flex-shrink-0 ${ownerMode ? "cursor-pointer hover:scale-110" : ""} transition-transform`}
            disabled={!ownerMode}
            style={{ marginTop: '-2px' }}
          >
            {item.icon || "💡"}
          </button>

          {/* Title */}
          {editing ? (
            <input
              ref={titleRef}
              defaultValue={item.titleHtml || item.title || ""}
              className={`flex-1 text-lg font-bold px-3 py-2 rounded-lg border-2 border-violet-500 ${isDark ? "bg-slate-700 text-white" : "bg-white text-slate-900"}`}
              placeholder="Title"
            />
          ) : (
            <h3 className={`flex-1 text-lg font-bold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {item.titleHtml || item.title || "Untitled"}
            </h3>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <textarea
            ref={bodyRef}
            defaultValue={item.bodyHtml?.replace(/<[^>]+>/g, '').replace(/<br>/g, '\n') || ""}
            className={`w-full h-32 px-3 py-2 rounded-lg border-2 border-violet-500 mb-4 resize-none ${isDark ? "bg-slate-700 text-white" : "bg-white text-slate-900"}`}
            placeholder="Description"
          />
        ) : (
          <div
            className={`text-sm leading-relaxed mb-4 ${isDark ? "text-slate-300" : "text-slate-600"} line-clamp-4`}
            dangerouslySetInnerHTML={{ __html: item.bodyHtml || item.description || "" }}
          />
        )}

        {/* Actions */}
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              💾 Save
            </button>
            <button
              onClick={cancelEdit}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowFullModal(true)}
            className={`text-sm font-semibold ${isDark ? "text-violet-400 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"} transition-colors`}
          >
            Read more →
          </button>
        )}
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowIconPicker(false)}>
          <div
            className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>Choose Icon</h3>
            
            {Object.entries(ENHANCED_EMOJI_CATEGORIES).map(([category, icons]) => (
              <div key={category} className="mb-6">
                <h4 className={`text-sm font-semibold mb-3 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{category}</h4>
                <div className="grid grid-cols-10 gap-3">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => selectIcon(icon)}
                      className={`text-3xl p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowIconPicker(false)}
              className={`w-full py-2 rounded-lg font-semibold transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Full Content Modal */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowFullModal(false)}>
          <div
            className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-2xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl">{item.icon || "💡"}</span>
              <div className="flex-1">
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  {item.titleHtml || item.title || "Untitled"}
                </h2>
              </div>
              <button
                onClick={() => setShowFullModal(false)}
                className={`text-2xl ${isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-900"} transition-colors`}
              >
                ✕
              </button>
            </div>
            <div
              className={`prose max-w-none ${isDark ? "prose-invert text-slate-300" : "text-slate-600"}`}
              dangerouslySetInnerHTML={{ __html: item.bodyHtml || item.description || "" }}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* Add Highlight Button */
function AddHighlightButton({ onAdd, isDark }) {
  return (
    <button
      onClick={onAdd}
      className={`flex-shrink-0 w-80 h-64 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-300"} border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-violet-500 transition-colors`}
    >
      <div className={`text-5xl ${isDark ? "text-slate-600" : "text-slate-400"}`}>+</div>
      <div className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>Add Highlight</div>
    </button>
  );
}

/* ------------------------------ Enhanced Floating Controls ------------------------------ */
function ControlPanel({ isDark, toggleTheme }) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
      <button
        onClick={toggleTheme}
        className={`px-5 py-3 text-sm font-semibold rounded-2xl backdrop-blur-xl border shadow-xl transition-all duration-300 transform hover:scale-105 ${isDark ? "bg-slate-800/90 border-slate-700/50 text-white hover:bg-slate-700/80" : "bg-white/90 border-slate-200/50 text-slate-700 hover:bg-white/80"}`}
        aria-label="Toggle theme"
        title="Toggle light/dark"
      >
        {isDark ? "🌙 Dark" : "☀️ Light"}
      </button>
    </div>
  );
}

/* ------------------------------ Main Enhanced Page ------------------------------ */
export default function Home() {
  const navigate = useNavigate();
  const { owner } = useOwnerMode?.() || {};
  const ownerMode = !!owner;

  const { isDark, toggleTheme } = useTheme();

  const [projects, setProjects] = useState([]);
  const [posts, setPosts] = useState([]);
  const [welcomeHtml, setWelcomeHtml] = useState("");
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    try { window.localStorage.setItem(LS_HIGHLIGHTS, JSON.stringify(highlights.map(normalizeHighlight))); } catch {}
  }, [highlights]);

  const saveWelcome = async (html) => {
    try {
      await apiSaveWelcome(html);
      setWelcomeHtml(html);
    } catch (err) {
      console.error("Failed to save welcome:", err);
      setWelcomeHtml(html);
    }
  };

  const addHighlight = async () => {
    const draft = {
      icon: "💡",
      title: "New highlight",
      titleHtml: "New highlight",
      description: "<p>Describe your highlight…</p>",
      bodyHtml: "<p>Describe your highlight…</p>",
      position: (highlights?.length || 0) + 1,
      sortOrder: (highlights?.length || 0) + 1
    };
    try {
      const created = await apiCreateHighlight(draft);
      const newHighlight = created ? normalizeHighlight(created) : { ...draft, id: `h-${Date.now()}` };
      setHighlights((prev) => [...prev, newHighlight]);
    } catch (err) {
      console.error("Failed to create highlight:", err);
      const localHighlight = { ...draft, id: `h-${Date.now()}` };
      setHighlights((prev) => [...prev, localHighlight]);
    }
  };

  const updateHighlightOnServer = async (next) => {
    setHighlights((prev) => prev.map((h) => (h.id === next.id ? normalizeHighlight(next) : h)));
    try { 
      await apiUpdateHighlight(next.id, {
        ...next,
        title: next.titleHtml || next.title,
        description: next.bodyHtml || next.description
      }); 
    } catch (err) {
      console.error("Failed to update highlight:", err);
    }
  };

  const deleteHighlightOnServer = async (id) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    try { 
      await apiDeleteHighlight(id); 
    } catch (err) {
      console.error("Failed to delete highlight:", err);
    }
  };

  const hiRow = useSimpleScroll();
  const pjRow = useHRow();
  const poRow = useHRow();

  const gradient = isDark ? DARK_ENHANCED_GRADIENT : ENHANCED_GRADIENT;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-900 text-white" : "bg-gray-50 text-slate-900"}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-6 bg-gradient-to-r ${gradient} p-1`}>
            <div className={`rounded-full w-full h-full ${isDark ? "bg-slate-900" : "bg-gray-50"}`}></div>
          </div>
          <p className="text-lg font-semibold">Getting ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-all duration-700 ${isDark ? "dark bg-slate-900 text-white" : "bg-gray-50 text-slate-900"}`}>
      <style>{`
        .line-clamp-4 { 
          display: -webkit-box; 
          -webkit-line-clamp: 4; 
          -webkit-box-orient: vertical; 
          overflow: hidden; 
        }
        .clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .clamp-5 { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        
        .animate-fade-in-enhanced { 
          animation: fadeInEnhanced 0.8s ease-out; 
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradientShift 3s ease-in-out infinite;
        }
        .animate-pulse-subtle {
          animation: pulseSubtle 2s ease-in-out infinite;
        }
        .animate-wave {
          animation: wave 2s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
        
        @keyframes fadeInEnhanced { 
          from { 
            opacity: 0; 
            transform: translateY(30px) scale(0.95); 
            filter: blur(10px);
          } 
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
            filter: blur(0px);
          } 
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes pulseSubtle {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.9; }
        }
        
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70% { transform: rotate(14deg); }
          20%, 40%, 60%, 80% { transform: rotate(-8deg); }
        }

        [contenteditable] ul { list-style: disc outside; padding-left: 1.25rem; margin: 0.5rem 0; }
        [contenteditable] ol { list-style: decimal outside; padding-left: 1.75rem; margin: 0.5rem 0; }
        [contenteditable] li { margin: 0.25rem 0; }
        [contenteditable] p { margin: 0.75rem 0; }
        [contenteditable] p:first-child { margin-top: 0; }
        [contenteditable] p:last-child { margin-bottom: 0; }
        [contenteditable]:focus { outline: none; }

        .welcome-content p { margin-bottom: 1.2rem; line-height: 1.8; }
        .welcome-content p:last-child { margin-bottom: 0; }
        .welcome-content ul, .welcome-content ol { margin: 1.2rem 0; }
        .welcome-content li { margin: 0.3rem 0; }

        .font-sans { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

        .dark .force-dark * { color: white !important; }
        .dark .bg-slate-800 *, .dark .bg-slate-800\\/50 *, .dark .bg-slate-800\\/60 *, .dark .bg-slate-800\\/70 *, .dark .bg-slate-800\\/80 * {
          color: white !important;
        }
        .dark .bg-clip-text.text-transparent {
          color: transparent !important;
          background-clip: text;
          -webkit-background-clip: text;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(45deg, #6366f1, #8b5cf6); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(45deg, #4f46e5, #7c3aed); }
      `}</style>

      <ControlPanel isDark={isDark} toggleTheme={toggleTheme} />

      <EditableWelcomeSection
        isDark={isDark}
        ownerMode={!!ownerMode}
        initialHtml={welcomeHtml}
        onSaveHtml={saveWelcome}
      />

      {/* REDESIGNED Highlights Section - SIMPLE & WORKING */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient} animate-gradient-shift`}>
              {MODERN_ICONS.highlights} Highlights
            </span>
          </h3>
        </div>

        <div className="relative">
          {/* Left Arrow */}
          {highlights.length > 0 && hiRow.canScrollLeft && (
            <button
              onClick={hiRow.scrollLeft}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full shadow-xl ${isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"} flex items-center justify-center hover:scale-110 transition-transform`}
            >
              ◀
            </button>
          )}

          {/* Right Arrow */}
          {highlights.length > 0 && hiRow.canScrollRight && (
            <button
              onClick={hiRow.scrollRight}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full shadow-xl ${isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"} flex items-center justify-center hover:scale-110 transition-transform`}
            >
              ▶
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={hiRow.scrollRef}
            onScroll={hiRow.checkScroll}
            onWheel={hiRow.handleWheel}
            className="flex gap-6 overflow-x-auto pb-4"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: isDark ? '#475569 #1e293b' : '#cbd5e1 #f1f5f9'
            }}
          >
            {highlights.map((h) => (
              <HighlightCard
                key={h.id}
                item={h}
                onChange={updateHighlightOnServer}
                onDelete={deleteHighlightOnServer}
                ownerMode={!!ownerMode}
                isDark={isDark}
              />
            ))}
            {ownerMode && <AddHighlightButton onAdd={addHighlight} isDark={isDark} />}
          </div>
        </div>
      </section>

      {/* Enhanced Projects - ORIGINAL STYLE */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={() => navigate("/projects")} className="text-left group" aria-label="Go to all projects" title="Go to Projects">
            <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3 transition-all duration-300 group-hover:scale-105">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient} animate-gradient-shift`}>
                {MODERN_ICONS.projects} Projects
              </span>
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/projects")}
            className={`text-sm font-semibold px-5 py-2.5 rounded-xl border transition-all duration-300 transform hover:scale-105 ${isDark ? "border-slate-600/60 text-white hover:bg-slate-700/60" : "border-slate-300/60 text-slate-700 hover:bg-slate-100/60"} backdrop-blur-sm shadow-lg`}
            aria-label="View all projects"
          >
            View all →
          </button>
        </div>

        <div className={`mb-5 text-sm flex items-center gap-4 ${isDark ? "text-white/80" : "text-slate-600"}`}>
          <span className="inline-flex items-center gap-2 font-medium">
            <span>🔥</span> Trending tags are labeled
          </span>
          <span className="inline-flex items-center gap-2 font-medium">
            <span>🕒</span> Recent updates in last 30 days
          </span>
        </div>

        <EnhancedProjectsList
          isDark={isDark}
          rowHook={pjRow}
          items={projects}
          navigateTo={(p)=>navigate("/projects", { state: { focusId: p.id || p.slug || null } })}
        />
      </section>

      {/* Enhanced Posts - ORIGINAL STYLE WITH IMPROVED TEXT */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={() => navigate("/blog")} className="text-left group" aria-label="Go to all blog posts" title="Go to Blog">
            <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3 transition-all duration-300 group-hover:scale-105">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient} animate-gradient-shift`}>
                {MODERN_ICONS.posts} Latest Posts
              </span>
            </h3>
          </button>

          <button
            type="button"
            onClick={() => navigate("/blog")}
            className={`text-sm font-semibold px-5 py-2.5 rounded-xl border transition-all duration-300 transform hover:scale-105 ${isDark ? "border-slate-600/60 text-white hover:bg-slate-700/60" : "border-slate-300/60 text-slate-700 hover:bg-slate-100/60"} backdrop-blur-sm shadow-lg`}
            aria-label="View all blog posts"
          >
            View all →
          </button>
        </div>

        <EnhancedPostsList isDark={isDark} poRow={poRow} posts={posts} navigate={navigate} />
      </section>

      <div className="h-16" />
    </div>
  );
}

/* ------------- Helper components for Projects/Posts ------------- */
function EnhancedProjectsList({ isDark, rowHook, items, navigateTo }) {
  return (
    <div className="flex gap-6 overflow-x-auto hide-scrollbar custom-scrollbar snap-x snap-mandatory"
      ref={rowHook.rowRef}
      style={{ scrollBehavior: "smooth" }}
      onMouseDown={rowHook.onMouseDown}
      onMouseMove={rowHook.onMouseMove}
      onMouseUp={rowHook.onMouseUp}
      onMouseLeave={rowHook.onMouseLeave}
      onTouchStart={rowHook.onTouchStart}
      onTouchMove={rowHook.onTouchMove}
      onTouchEnd={rowHook.onTouchEnd}
      onKeyDown={rowHook.onKey}
      onScroll={rowHook.onScroll}
      onWheel={rowHook.onWheel}
      tabIndex={0}
      aria-label="Projects carousel"
    >
      {(items || []).map((it) => {
        const trending = isTrendingByTags(it.tags || it.techStack || []);
        const recent = isRecent(it.updatedAt || it.createdAt);
        const badges = projectBadges(it);

        const go = () => {
          if (rowHook && !rowHook.canClick()) return;
          navigateTo(it);
        };
        const onKey = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
          }
        };

        return (
          <Card
            isDark={isDark}
            key={it.id || it.slug || it.name || Math.random()}
            className="min-w-[340px] snap-center p-6 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-2 transform-gpu bg-white/80 hover:bg-white/90 group"
          >
            <button
              type="button"
              className="absolute inset-0"
              onClick={go}
              onKeyDown={onKey}
              aria-label={it.name || it.title || "Open"}
            />
            <div className="relative pointer-events-none flex flex-col gap-4">
              {Array.isArray(it.images) && it.images[0] && (
                <div className={`${isDark ? "bg-slate-700" : "bg-slate-100"} aspect-[16/9] overflow-hidden rounded-2xl`}>
                  <img
                    src={it.images[0]}
                    alt={it.name || it.title || "Project"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {trending && (
                  <span
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all duration-300 ${
                      isDark
                        ? "bg-gradient-to-r from-pink-900/40 to-rose-900/40 text-pink-200 ring-2 ring-pink-600"
                        : "bg-gradient-to-r from-pink-100 to-rose-100 text-pink-800 ring-2 ring-pink-300"
                    } hover:scale-105 transform`}
                  >
                    {MODERN_ICONS.trending} Trending
                  </span>
                )}
                {recent && (
                  <span
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all duration-300 ${
                      isDark
                        ? "bg-gradient-to-r from-emerald-900/40 to-green-900/40 text-emerald-200 ring-2 ring-emerald-600"
                        : "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-900 ring-2 ring-emerald-300"
                    } hover:scale-105 transform`}
                  >
                    {MODERN_ICONS.recent} Recent
                  </span>
                )}
                {(it.tags || []).slice(0, 4).map((t) => (
                  <span key={t} className={chipClassFor(t, isDark)}>
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-start justify-between gap-3">
                <h4
                  className={`text-xl font-bold leading-tight transition-all duration-300 ${
                    isDark ? "text-white group-hover:text-violet-300" : "text-slate-900 group-hover:text-violet-700"
                  }`}
                >
                  {it.name || it.title}
                </h4>
                {(
                  <div className="flex gap-2 flex-wrap">
                    {badges.map(([emo, label]) => (
                      <span key={emo + label} title={label} className="text-xl transition-all duration-300 hover:scale-110">
                        {emo}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {it.summary && (
                <p
                  className={`text-sm leading-7 clamp-3 transition-all duration-300 ${
                    isDark ? "text-white/90 force-dark" : "text-slate-600"
                  }`}
                  dangerouslySetInnerHTML={{ __html: sanitizePreview(it.summary, { forceDark: isDark }) }}
                />
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  {badges.map(([emo, label]) => (
                    <span key={emo + label} title={label} className="text-xl transition-all duration-300 hover:scale-110">
                      {emo}
                    </span>
                  ))}
                </div>
                <span
                  className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                    isDark ? "bg-slate-700/80 text-white hover:bg-slate-600/80" : "bg-slate-100/80 text-slate-700 hover:bg-slate-200/80"
                  } backdrop-blur-sm`}
                >
                  Read more →
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function EnhancedPostsList({ isDark, poRow, posts, navigate }) {
  return (
    <div className="flex gap-6 overflow-x-auto hide-scrollbar custom-scrollbar snap-x snap-mandatory"
      ref={poRow.rowRef}
      style={{ scrollBehavior: "smooth" }}
      onMouseDown={poRow.onMouseDown}
      onMouseMove={poRow.onMouseMove}
      onMouseUp={poRow.onMouseUp}
      onMouseLeave={poRow.onMouseLeave}
      onTouchStart={poRow.onTouchStart}
      onTouchMove={poRow.onTouchMove}
      onTouchEnd={poRow.onTouchEnd}
      onKeyDown={poRow.onKey}
      onScroll={poRow.onScroll}
      onWheel={poRow.onWheel}
      tabIndex={0}
      aria-label="Posts carousel"
    >
      {posts.map((post) => (
        <PostCard key={post.id || post.slug || post.title} post={post} isDark={isDark} navigate={navigate} poRow={poRow} />
      ))}
    </div>
  );
}

function PostCard({ post, isDark, navigate, poRow }) {
  const badges = postBadges(post);
  const html = sanitizePreview(post.bodyHtml || post.content || "", { forceDark: isDark });
  const snippet = snippetHtml(html, 520);

  const goBlog = () => {
    if (poRow && !poRow.canClick()) return;
    navigate("/blog", { state: { focusId: post.id || post.slug || null } });
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goBlog();
    }
  };

  return (
    <Card
      isDark={isDark}
      className="min-w-[340px] snap-center p-6 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-2 transform-gpu bg-white/80 hover:bg-white/90 group"
    >
      <button type="button" className="absolute inset-0" onClick={goBlog} onKeyDown={onKey} aria-label={post.title || "Open post"} />

      <div className="relative pointer-events-none flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {(post.tags || []).slice(0, 6).map((t) => (
            <span key={t} className={chipClassFor(t, isDark)}>
              {t}
            </span>
          ))}
        </div>

        <h4
          className={`text-xl font-bold leading-tight transition-all duration-300 ${
            isDark ? "text-white group-hover:text-violet-300" : "text-slate-900 group-hover:text-violet-700"
          }`}
        >
          {post.title}
        </h4>

        <div className={`${isDark ? "text-white/80" : "text-slate-500"} text-sm font-medium`}>
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : post.updatedAt
            ? new Date(post.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : ""}
        </div>

        <div
          className={`text-sm leading-7 transition-all duration-300 ${isDark ? "text-white/90 force-dark" : "text-slate-600"}`}
          dangerouslySetInnerHTML={{ __html: snippet }}
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {badges.map(([emo, label]) => (
              <span key={emo + label} title={label} className="text-xl transition-all duration-300 hover:scale-110">
                {emo}
              </span>
            ))}
          </div>
          <span
            className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              isDark ? "bg-slate-700/80 text-white hover:bg-slate-600/80" : "bg-slate-100/80 text-slate-700 hover:bg-slate-200/80"
            } backdrop-blur-sm`}
          >
            Read full article →
          </span>
        </div>
      </div>
    </Card>
  );
}