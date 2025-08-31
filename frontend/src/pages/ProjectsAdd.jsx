import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProjects, createProject, updateProject } from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Inline Icons kept for toolbar/UX (no external packages)             */
/* ------------------------------------------------------------------ */
const Ic = {
  ArrowLeft: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M12 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M6 6l12 12M6 18L18 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  Link: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Image: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="8" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 17l-5-5-4 4-2-2-5 5" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  List: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M8 6h12M8 12h12M8 18h12" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  AlignLeft: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M4 6h16M4 10h10M4 14h16M4 18h10" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  AlignCenter: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M4 6h16M7 10h10M4 14h16M7 18h10" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  AlignRight: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M4 6h16M10 10h10M4 14h16M10 18h10" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  AlignJustify: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M4 6h16M4 10h16M4 14h16M4 18h16" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Indent: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M4 6h16M12 10h8M12 14h8M4 18h16M8 12l-4 3V9z" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Outdent: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M4 6h16M4 10h8M4 14h8M4 18h16M8 12l4-3v6z" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Undo: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M9 7L5 11l4 4" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 11h8a5 5 0 1 1 0 10h-2" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Redo: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M15 7l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M19 11H11a5 5 0 1 0 0 10h2" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Palette: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M12 3a9 9 0 0 0 0 18c1.3 0 2-1 2-2 0-1 .8-1 1.5-1H17a4 4 0 0 0 0-8h-1A4 4 0 0 1 12 6a3 3 0 0 1 0-3z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor"/>
      <circle cx="9.5" cy="7.5" r="1" fill="currentColor"/>
      <circle cx="12.5" cy="5.5" r="1" fill="currentColor"/>
      <circle cx="15.5" cy="7.5" r="1" fill="currentColor"/>
    </svg>
  ),
  Magic: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...p}>
      <path d="M3 21l9-9M14 6l4-4M11 3l1 3M6 8l-3-1M21 11l-3 1M16 21l-1-3" fill="none" stroke="currentColor" strokeWidth="2"/>
      <rect x="11" y="11" width="3" height="3" transform="rotate(45 12.5 12.5)" fill="currentColor"/>
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */
const empty = {
  name: "",
  projectUrl: "",
  summaryHtml: "",
  techStack: "",
  images: "",
  featured: false,
  sortOrder: 0,
  client: "",
  role: "",
  location: "",
  startYM: "",
  endYM: "",
  status: "In Progress",
};

const safeQueueMicrotask =
  (typeof window !== "undefined" && window.queueMicrotask)
    ? window.queueMicrotask.bind(window)
    : (cb) => Promise.resolve().then(cb);

function toArray(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function validateUrlMaybe(u) {
  const s = String(u || "").trim();
  if (!s) return null;
  try {
    return new URL(s).toString();
  } catch {
    throw new Error("Please enter a valid URL (include http/https).");
  }
}

/* ------------------------------------------------------------------ */
/* Month-Year Picker                                                   */
/* ------------------------------------------------------------------ */
function MonthYearPicker({
  label,
  value,
  onChange,
  required,
  hint = "",
  minYear = 1970,
  maxYear = new Date().getFullYear() + 10,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (value) {
      const [y, m] = String(value).split("-");
      setYear(y || "");
      setMonth(m || "");
    } else {
      setYear("");
      setMonth("");
    }
  }, [value]);

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i)),
    [minYear, maxYear]
  );
  const months = ["01","02","03","04","05","06","07","08","09","10","11","12"];

  const updateValue = (y, m) => onChange(y && m ? `${y}-${m}` : "");

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required ? " *" : ""}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className={`mt-1 flex w-full items-center justify-between h-10 rounded-lg border px-3 text-left text-sm shadow-sm transition-all ${
          disabled
            ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed"
            : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="tabular-nums tracking-wide text-gray-900 dark:text-gray-100">
          {year && month ? `${year}-${month}` : (required ? "Select..." : "Optional")}
        </span>
        <svg viewBox="0 0 24 24" className={`ml-2 h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-lg"
          >
            <div className="grid grid-cols-2 gap-2">
              <select
                value={month}
                onChange={(e) => { const m = e.target.value; setMonth(m); updateValue(year, m); }}
                className="h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-200"
              >
                <option value="">Month</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => { const y = e.target.value; setYear(y); updateValue(y, month); }}
                className="h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-200"
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex items-center justify-between">
              {hint ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">{hint}</div>
              ) : <span />}
              <div className="flex gap-2">
                {!required && (
                  <button
                    type="button"
                    onClick={() => { setYear(""); setMonth(""); onChange(""); setOpen(false); }}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-indigo-600 bg-indigo-600 px-2 py-1 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WYSIWYG (stable) - Simplified without highlighting                  */
/* ------------------------------------------------------------------ */
function Wysiwyg({ html, onChange, disabled = false }) {
  const ref = useRef(null);
  const lastApplied = useRef(null);
  const isSelfEditing = useRef(false);

  const [format, setFormat] = useState({
    bold: false, italic: false, ul: false, ol: false,
    left: false, center: false, right: false, justify: false
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || isSelfEditing.current) return;
    if (lastApplied.current !== html) {
      el.innerHTML = html || "";
      lastApplied.current = html || "";
    }
  }, [html]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    let raf = 0;
    const handler = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          const q = document.queryCommandState?.bind(document);
          setFormat({
            bold: q ? q("bold") : false,
            italic: q ? q("italic") : false,
            ul: q ? q("insertUnorderedList") : false,
            ol: q ? q("insertOrderedList") : false,
            left: q ? q("justifyLeft") : false,
            center: q ? q("justifyCenter") : false,
            right: q ? q("justifyRight") : false,
            justify: q ? q("justifyFull") : false,
          });
        } catch {}
      });
    };
    document.addEventListener("selectionchange", handler);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("selectionchange", handler);
    };
  }, []);

  const focusAndEnsureCaret = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
  }, []);

  const exec = useCallback((cmd, val = null) => {
    if (disabled) return;
    focusAndEnsureCaret();
    isSelfEditing.current = true;
    try {
      document.execCommand(cmd, false, val);
      const htmlNow = ref.current?.innerHTML || "";
      onChange(htmlNow);
      lastApplied.current = htmlNow;
    } finally {
      safeQueueMicrotask(() => { isSelfEditing.current = false; });
    }
  }, [disabled, focusAndEnsureCaret, onChange]);

  const toggleList = useCallback((kind) => {
    if (disabled) return;
    focusAndEnsureCaret();
    isSelfEditing.current = true;
    try {
      const cmd = kind === "ul" ? "insertUnorderedList" : "insertOrderedList";
      const other = kind === "ul" ? "insertOrderedList" : "insertUnorderedList";
      if (document.queryCommandState?.(other)) document.execCommand(other);
      document.execCommand(cmd);
      const htmlNow = ref.current?.innerHTML || "";
      onChange(htmlNow);
      lastApplied.current = htmlNow;
    } finally {
      safeQueueMicrotask(() => { isSelfEditing.current = false; });
    }
  }, [disabled, focusAndEnsureCaret, onChange]);

  const insertLink = useCallback(() => {
    if (disabled) return;
    const url = prompt("Enter URL (https://…):");
    if (!url) return;
    try { new URL(url); } catch { return alert("Invalid URL"); }
    exec("createLink", url);
  }, [disabled, exec]);

  const onInput = useCallback(() => {
    if (disabled) return;
    isSelfEditing.current = true;
    const htmlNow = ref.current?.innerHTML || "";
    onChange(htmlNow);
    lastApplied.current = htmlNow;
    safeQueueMicrotask(() => { isSelfEditing.current = false; });
  }, [disabled, onChange]);

  const onPaste = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    isSelfEditing.current = true;
    
    const d = e.clipboardData;
    const h = d.getData("text/html");
    const t = d.getData("text/plain");
    
    let toInsert;
    if (h) {
      // Simple cleaning - just remove common problematic color styles
      toInsert = h
        .replace(/color:\s*white/gi, "")
        .replace(/color:\s*#fff([^0-9a-f]|$)/gi, "")
        .replace(/color:\s*#ffffff/gi, "")
        .replace(/color:\s*rgb\(255,\s*255,\s*255\)/gi, "")
        .replace(/color:\s*rgba\(255,\s*255,\s*255[^)]*\)/gi, "")
        .replace(/background-color:[^;]*;?/gi, "")
        .replace(/background:[^;]*;?/gi, "");
    } else {
      toInsert = t.replace(/\n/g, "<br>");
    }
    
    focusAndEnsureCaret();
    document.execCommand("insertHTML", false, toInsert);
    const htmlNow = ref.current?.innerHTML || "";
    onChange(htmlNow);
    lastApplied.current = htmlNow;
    safeQueueMicrotask(() => { isSelfEditing.current = false; });
  }, [disabled, focusAndEnsureCaret, onChange]);

  // Simplified color picker - only text colors, no highlights
  const [showColors, setShowColors] = useState(false);
  const [customHex, setCustomHex] = useState("");
  const [rgb, setRgb] = useState({ r: "", g: "", b: "" });
  const popRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target)) setShowColors(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const applyColor = useCallback((color) => {
    if (disabled) return;
    exec("foreColor", color);
    setShowColors(false);
    setCustomHex("");
    setRgb({ r: "", g: "", b: "" });
  }, [disabled, exec]);

  const TBtn = ({ label, onClick, icon, active = false }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-sm transition-colors ${
        active
          ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      aria-label={label}
    >
      {icon}
    </button>
  );

  const TSep = () => <span className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600" />;

  // Simplified color palette - only text colors
  const TEXT_COLORS = [
    "#000000","#1f2937","#374151","#4b5563","#6b7280","#9ca3af","#d1d5db","#f3f4f6",
    "#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e","#06b6d4","#3b82f6",
    "#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e","#14b8a6","#10b981","#0ea5e9",
    "#dc2626","#ea580c","#d97706","#ca8a04","#65a30d","#16a34a","#0891b2","#2563eb",
    "#4f46e5","#7c3aed","#9333ea","#db2777","#be123c","#0d9488","#059669","#0284c7"
  ];

  return (
    <div>
      <style>{`
        .wys { 
          direction: ltr; 
          text-align: left; 
          color: #1f2937 !important; 
          min-height: 9rem; 
        }
        .dark .wys { 
          color: #f3f4f6 !important; 
        }
        .wys:empty:before { 
          content: attr(data-placeholder); 
          color: #9ca3af; 
          pointer-events: none; 
        }
        .dark .wys:empty:before { 
          color: #6b7280; 
        }
        .wys ul { 
          list-style: disc outside; 
          padding-left: 1.5rem; 
          margin: 0.5rem 0; 
        }
        .wys ol { 
          list-style: decimal outside; 
          padding-left: 1.75rem; 
          margin: 0.5rem 0; 
        }
        .wys a { 
          color: #3b82f6 !important; 
          text-decoration: underline; 
        }
        .dark .wys a {
          color: #60a5fa !important;
        }
        .wys img { 
          max-width: 100%; 
          height: auto; 
        }
        .wys p {
          margin: 0.5rem 0;
        }
        .wys h1, .wys h2, .wys h3, .wys h4, .wys h5, .wys h6 {
          font-weight: 600;
          margin: 0.75rem 0 0.5rem 0;
        }
        .wys h1 { font-size: 1.5rem; }
        .wys h2 { font-size: 1.25rem; }
        .wys h3 { font-size: 1.125rem; }
      `}</style>

      <div className="mb-2 relative flex flex-wrap gap-1">
        <TBtn label="Bold" onClick={() => exec("bold")} icon={<strong>B</strong>} active={format.bold} />
        <TBtn label="Italic" onClick={() => exec("italic")} icon={<em>I</em>} active={format.italic} />
        <TSep />
        <TBtn label="Bullets" onClick={() => toggleList("ul")} icon={<Ic.List />} active={format.ul} />
        <TBtn label="Numbered" onClick={() => toggleList("ol")} icon={<span className="text-xs font-semibold">1.</span>} active={format.ol} />
        <TSep />
        <TBtn label="Indent" onClick={() => exec("indent")} icon={<Ic.Indent />} />
        <TBtn label="Outdent" onClick={() => exec("outdent")} icon={<Ic.Outdent />} />
        <TSep />
        <TBtn label="Align left" onClick={() => exec("justifyLeft")} icon={<Ic.AlignLeft />} active={format.left} />
        <TBtn label="Align center" onClick={() => exec("justifyCenter")} icon={<Ic.AlignCenter />} active={format.center} />
        <TBtn label="Align right" onClick={() => exec("justifyRight")} icon={<Ic.AlignRight />} active={format.right} />
        <TBtn label="Justify" onClick={() => exec("justifyFull")} icon={<Ic.AlignJustify />} active={format.justify} />
        <TSep />
        <TBtn label="Link" onClick={insertLink} icon={<Ic.Link />} />
        <TSep />
        {/* Simplified color picker - text only */}
        <div ref={popRef} className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setShowColors(v => !v)}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-sm transition-colors ${
              disabled ? "opacity-50 cursor-not-allowed" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            title="Text Color"
            aria-label="Text Color"
          >
            <Ic.Palette />
          </button>
          <AnimatePresence>
            {showColors && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute z-30 mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-lg w-[280px]"
              >
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Text Color</span>
                </div>

                <div className="grid grid-cols-8 gap-1 max-h-48 overflow-auto pr-1">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyColor(c)}
                      title={c}
                      className="h-6 w-6 rounded-md border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500 transition-all"
                      style={{ background: c }}
                    />
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={customHex}
                      onChange={(e) => setCustomHex(e.target.value)}
                      placeholder="#RRGGBB"
                      className="h-8 w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs text-gray-900 dark:text-gray-200"
                    />
                    <button
                      type="button"
                      className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(customHex)) applyColor(customHex);
                      }}
                    >
                      Apply
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <RgbInput label="R" value={rgb.r} onChange={(v) => setRgb((p) => ({ ...p, r: v }))} />
                    <RgbInput label="G" value={rgb.g} onChange={(v) => setRgb((p) => ({ ...p, g: v }))} />
                    <RgbInput label="B" value={rgb.b} onChange={(v) => setRgb((p) => ({ ...p, b: v }))} />
                    <button
                      type="button"
                      className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        const r = +rgb.r, g = +rgb.g, b = +rgb.b;
                        const ok = [r,g,b].every(n => Number.isFinite(n) && n >= 0 && n <= 255);
                        if (ok) applyColor(`rgb(${r}, ${g}, ${b})`);
                      }}
                    >
                      Apply RGB
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    className="w-full h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => applyColor("")}
                  >
                    Reset to Default
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <TBtn label="Undo" onClick={() => exec("undo")} icon={<Ic.Undo />} />
        <TBtn label="Redo" onClick={() => exec("redo")} icon={<Ic.Redo />} />
      </div>

      <div
        className={`wys block w-full rounded-xl border px-3 py-2 leading-6 focus:outline-none transition-colors ${
          disabled
            ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed"
            : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        }`}
        contentEditable={!disabled}
        suppressContentEditableWarning
        ref={ref}
        onInput={onInput}
        onPaste={onPaste}
        data-placeholder="Describe the project with bullets or paragraphs. Use the toolbar for formatting."
      />
    </div>
  );
}

function RgbInput({ label, value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={label}
      aria-label={label}
      className="h-8 w-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 text-xs text-gray-900 dark:text-gray-200"
    />
  );
}

/* ------------------------------------------------------------------ */
/* URL Input w/ simple preview                                         */
/* ------------------------------------------------------------------ */
function UrlInput({ value, onChange, placeholder, disabled }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = useCallback(async (url) => {
    if (!url) { setPreview(null); return; }
    try {
      setLoading(true);
      setPreview({
        url,
        title: url.replace(/^https?:\/\//, ""),
        description: "",
        image: null,
      });
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) fetchPreview(value);
      else setPreview(null);
    }, 500);
    return () => clearTimeout(timer);
  }, [value, fetchPreview]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          placeholder={placeholder}
          disabled={disabled}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            className="mt-1 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Clear URL"
          >
            <Ic.X />
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-2 h-20 w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading preview...</span>
        </div>
      )}

      {preview && !loading && (
        <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-3">
            <div className="flex items-start gap-3">
              {preview.image && (
                <div className="flex-shrink-0 h-16 w-16 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <img src={preview.image} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {preview.title}
                </h4>
                {preview.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {preview.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                  {preview.url}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Image URLs input                                                    */
/* ------------------------------------------------------------------ */
function ImageUrlsInput({ value, onChange, disabled }) {
  const imageUrls = useMemo(() => toArray(value), [value]);
  const fileInputRef = useRef(null);

  const handleRemoveImage = (urlToRemove) => {
    const urls = toArray(value).filter(url => url !== urlToRemove);
    onChange(urls.join(", "));
  };

  const handleFileUpload = (e) => {
    if (disabled) return;
    // Hook up to your uploader if needed.
    alert("File upload functionality would be implemented here");
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          placeholder="https://.../cover.jpg, https://.../screen-1.png"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          title="Upload image"
        >
          <Ic.Image />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*"
          disabled={disabled}
        />
      </div>

      {imageUrls.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative group">
                <div className="aspect-video rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={url}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23EEEEEE%22%2F%3E%3Ctext%20x%3D%22285%22%20y%3D%22318%22%20fill%3D%22%23999%22%20font-size%3D%2240%22%20font-family%3D%22Arial%22%3EImage%3C%2Ftext%3E%3C%2Fsvg%3E";
                    }}
                  />
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-gray-800 bg-opacity-70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <Ic.X />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tech chips                                                          */
/* ------------------------------------------------------------------ */
function TechStackInput({ value, onChange, disabled }) {
  const techChips = useMemo(() => toArray(value), [value]);
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (["Enter", ","].includes(e.key)) {
      e.preventDefault();
      const newTech = inputValue.trim();
      if (newTech) {
        const exists = new Set(techChips.map((t) => t.toLowerCase()));
        if (!exists.has(newTech.toLowerCase())) {
          onChange([...techChips, newTech].join(", "));
        }
        setInputValue("");
      }
    }
  };

  const removeTech = (techToRemove) => {
    if (disabled) return;
    const newTechs = techChips.filter(tech => tech !== techToRemove);
    onChange(newTechs.join(", "));
  };

  return (
    <div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        placeholder="Type and press Enter or comma to add"
        disabled={disabled}
      />

      {techChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {techChips.map((tech, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                disabled
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  : "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200"
              }`}
            >
              {tech}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTech(tech)}
                  className="opacity-70 hover:opacity-100"
                  aria-label={`Remove ${tech}`}
                >
                  <Ic.X />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI suggestions button                                               */
/* ------------------------------------------------------------------ */
function AiSuggestionButton({ onClick, disabled }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
        disabled
          ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      } transition-colors`}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
      ) : (
        <Ic.Magic />
      )}
      <span>AI Suggestions</span>
    </button>
  );
}

/* ================================================================== */
/* Main Component                                                      */
/* ================================================================== */
export default function ProjectsAdd() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { owner } = useOwnerMode();
  const nav = useNavigate();

  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [dateError, setDateError] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [allNames, setAllNames] = useState([]); // for duplicate-name warning

  // draft/dirty tracking - Safe localStorage usage
  const initialRef = useRef(empty);
  const draftKey = useMemo(() => (editing ? `projectDraft:edit:${id}` : "projectDraft:new"), [editing, id]);
  const [draftAvailable, setDraftAvailable] = useState(false);

  const disabled = useMemo(() => !owner || busy, [owner, busy]);

  // Load list for duplicate name warning + project on edit
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const all = await getProjects().catch(() => []);
        if (cancelled) return;
        setAllNames(
          (all || [])
            .filter((p) => String(p.id) !== String(id))
            .map((p) => String(p.name || "").trim().toLowerCase())
        );
        if (editing) {
          const cur = (all || []).find((p) => String(p.id) === String(id));
          if (!cur) throw new Error("Project not found");
          const loaded = {
            name: cur.name || "",
            projectUrl: (cur.links && (cur.links.url || cur.links.link)) || "",
            summaryHtml: cur.summary || "",
            techStack: (cur.techStack || []).join(", "),
            images: (cur.images || []).join(", "),
            featured: !!cur.featured,
            sortOrder: cur.sortOrder ?? 0,
            client: cur.client || "",
            role: cur.role || "",
            location: cur.location || "",
            startYM: cur.startDate || "",
            endYM: cur.endDate ?? "",
            status: cur.status || "In Progress",
          };
          setForm(loaded);
          initialRef.current = loaded;
        } else {
          setForm(empty);
          initialRef.current = empty;
        }
      } catch (e) {
        setErr(e?.message || "Failed to load project");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editing, id]);

  // Check for existing draft
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(draftKey);
        if (raw) setDraftAvailable(true);
      }
    } catch {}
  }, [draftKey]);

  const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isDirty = useMemo(() => !deepEqual(form, initialRef.current), [form]);

  // Warn on unload if dirty
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Autosave draft (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (typeof localStorage !== 'undefined' && isDirty) {
          localStorage.setItem(draftKey, JSON.stringify(form));
        }
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [form, draftKey, isDirty]);

  const restoreDraft = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const data = JSON.parse(raw);
          setForm(data);
          setDraftAvailable(false);
        }
      }
    } catch {}
  };

  const dismissDraft = () => {
    try { 
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(draftKey); 
      }
    } catch {}
    setDraftAvailable(false);
  };

  const update = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // Auto-status adjustments when End Date toggles
  useEffect(() => {
    setForm((prev) => {
      if (prev.endYM && prev.status === "In Progress") return { ...prev, status: "Completed" };
      if (!prev.endYM && prev.status === "Completed") return { ...prev, status: "In Progress" };
      return prev;
    });
  }, [form.endYM]);

  // Date consistency check
  useEffect(() => {
    const toDate = (v) => {
      if (!v) return null;
      const [y, m] = String(v).split("-").map(Number);
      if (!y || !m) return null;
      return new Date(y, m - 1, 1);
    };
    const s = toDate(form.startYM);
    const e = toDate(form.endYM);
    if (s && e && e < s) setDateError("End date must be after start date.");
    else setDateError("");
  }, [form.startYM, form.endYM]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setForbidden(false);
    if (!owner) {
      setForbidden(true);
      return;
    }
    try {
      setSaving(true);
      setErr("");
      const siteUrl = validateUrlMaybe(form.projectUrl);

      const [sy, sm] = (form.startYM || "").split("-").map(Number);
      if (form.startYM && (!sy || !sm))
        throw new Error("Please select a valid Start Date (YYYY-MM).");
      if (form.endYM) {
        const [ey, em] = form.endYM.split("-").map(Number);
        if (!ey || !em)
          throw new Error("Please complete End Date (YYYY-MM), or leave blank.");
        if (form.startYM && (ey < sy || (ey === sy && em < sm)))
          throw new Error("End Date must be after Start Date.");
      }

      const payload = {
        name: form.name.trim(),
        summary: form.summaryHtml || "",
        techStack: toArray(form.techStack),
        images: toArray(form.images),
        featured: !!form.featured,
        sortOrder: Number(form.sortOrder || 0),
        client: form.client.trim(),
        role: form.role.trim(),
        location: form.location.trim(),
        startDate: form.startYM || "",
        endDate: form.endYM ? form.endYM : null,
        status: form.status,
      };

      // Include `links` only if a valid URL was provided (URL optional for add & edit)
      if (siteUrl) {
        payload.links = { url: siteUrl };
      }

      if (!payload.name) throw new Error("Name is required");

      if (editing) await updateProject(id, payload);
      else await createProject(payload);

      // Signal the list page to refresh (works even in same tab)
      try { 
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem("projects:dirty", "1"); 
        }
      } catch {}
      window.dispatchEvent(new Event("projects:updated"));

      try { 
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(draftKey); 
        }
      } catch {}
      initialRef.current = payload; // reset dirty state
      nav("/projects");
    } catch (e2) {
      const msg = e2?.message || "Save failed";
      setErr(msg);
      if (/403|forbidden/i.test(msg)) setForbidden(true);
    } finally {
      setSaving(false);
    }
  }, [editing, id, form, owner, draftKey, nav]);

  // Keyboard shortcuts: Ctrl/Cmd+S, Ctrl/Cmd+Enter
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "s" || e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSubmit]);

  // Name-based AI suggestions
  const generateAiSuggestions = async () => {
    if (!owner) { setForbidden(true); return; }
    try {
      setBusy(true);
      setErr("");
      await new Promise((r) => setTimeout(r, 600));
      const out = suggestFromName(form.name || "");
      setForm((prev) => ({
        ...prev,
        summaryHtml: prev.summaryHtml || out.summaryHtml,
        techStack: prev.techStack || out.techStack,
        role: prev.role || out.role,
      }));
    } catch {
      setErr("Failed to generate suggestions. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Duplicate name warning
  const dupName = useMemo(() => {
    const nm = String(form.name || "").trim().toLowerCase();
    if (!nm) return false;
    return allNames.includes(nm);
  }, [form.name, allNames]);

  const techChips = useMemo(() => toArray(form.techStack), [form.techStack]);
  const imageUrls = useMemo(() => toArray(form.images), [form.images]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => nav("/projects")}
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors mb-2"
            >
              <Ic.ArrowLeft /> Back to Projects
            </button>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-600 bg-clip-text text-transparent">
              {editing ? "Edit Project" : "Add Project"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => nav("/projects")}
              className="rounded-lg border px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { 
                setForm({ ...empty }); 
                try { 
                  if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(draftKey); 
                  }
                } catch {} 
              }}
              className="rounded-lg border px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              disabled={disabled || saving}
              title="Clear form"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!owner || saving || !!dateError}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              title={owner ? (editing ? "Submit changes" : "Submit") : "Owner mode required"}
            >
              {saving ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                  Saving...
                </>
              ) : (
                <>{editing ? "Save Changes" : "Submit"}</>
              )}
            </button>
          </div>
        </div>

        {!owner && (
          <div className="mb-6 p-4 text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm">
              You are in viewer mode. Use the Owner switch in the navbar to unlock editing.
            </p>
          </div>
        )}

        {draftAvailable && (
          <div className="mb-6 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 flex items-center justify-between gap-3">
            <div className="text-sm">
              A saved draft was found for this page. Would you like to restore it?
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                onClick={restoreDraft}
              >
                Restore draft
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-sm border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors"
                onClick={dismissDraft}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {forbidden && owner && (
          <div className="mb-6 p-4 text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm">
              Session may have expired. Click <strong>Owner → Unlock</strong> again and retry.
            </p>
          </div>
        )}

        {(err || dateError) && (
          <div className="mb-6 p-4 text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm">{err || dateError}</p>
          </div>
        )}

        {dupName && (
          <div className="mb-6 p-3 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-xs">Heads up: another project already uses this name.</p>
          </div>
        )}

        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "details"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                Project Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("media")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "media"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                Media & Tech
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "settings"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === "details" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === "details" ? -20 : 20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "details" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-end justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Project Name *
                        </label>
                        <span className={`text-xs ${form.name.length > 80 ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
                          {form.name.length}/80
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={80}
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        placeholder="Digital Twin for Urban Transit"
                        disabled={disabled}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Project URL
                      </label>
                      <UrlInput
                        value={form.projectUrl}
                        onChange={(v) => update("projectUrl", v)}
                        placeholder="https://example.com/project"
                        disabled={disabled}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Project Summary
                        </label>
                        <AiSuggestionButton
                          onClick={generateAiSuggestions}
                          disabled={disabled || busy}
                        />
                      </div>
                      <Wysiwyg
                        html={form.summaryHtml}
                        onChange={(h) => update("summaryHtml", h)}
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Client
                        </label>
                        <input
                          type="text"
                          value={form.client}
                          onChange={(e) => update("client", e.target.value)}
                          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          placeholder="Metro Authority"
                          disabled={disabled}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Your Role
                        </label>
                        <input
                          type="text"
                          value={form.role}
                          onChange={(e) => update("role", e.target.value)}
                          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          placeholder="BIM Coordinator"
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) => update("location", e.target.value)}
                          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          placeholder="Tokyo, JP"
                          disabled={disabled}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          value={form.status}
                          onChange={(e) => update("status", e.target.value)}
                          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          disabled={disabled}
                        >
                          <option>Planned</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                          <option>On Hold</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <MonthYearPicker
                        label="Start Date"
                        value={form.startYM}
                        onChange={(v) => update("startYM", v)}
                        required={false}
                        disabled={disabled}
                      />
                      <MonthYearPicker
                        label="End Date"
                        value={form.endYM}
                        onChange={(v) => update("endYM", v)}
                        required={false}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "media" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tech Stack
                      </label>
                      <TechStackInput
                        value={form.techStack}
                        onChange={(v) => update("techStack", v)}
                        disabled={disabled}
                      />
                      {techChips.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {techChips.length} item(s)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Image URLs
                      </label>
                      <ImageUrlsInput
                        value={form.images}
                        onChange={(v) => update("images", v)}
                        disabled={disabled}
                      />
                      {imageUrls.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {imageUrls.length} image(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <label className="inline-flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!form.featured}
                          onChange={(e) => update("featured", e.target.checked)}
                          className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                          disabled={disabled}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Featured Project</span>
                      </label>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => update("sortOrder", e.target.value)}
                        className="w-24 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={disabled}
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Lower numbers appear first in listings. Default is 0.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </form>
      </section>
    </div>
  );
}

/* ================================================================== */
/* Heuristic AI suggestion generator based on the project name         */
/* ================================================================== */
function suggestFromName(rawName) {
  const name = rawName.toLowerCase();
  const bullets = [];
  const tech = new Set();
  let role = "Full-stack Developer";

  const add = (arr) => arr.forEach((x) => bullets.push(x));
  const addTech = (arr) => arr.forEach((x) => tech.add(x));

  // Generic base
  add([
    "Defined scope, milestones, and success metrics with stakeholders",
    "Implemented CI/CD and robust testing for reliable releases",
  ]);
  addTech(["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"]);

  // Domains
  if (/\be-?commerce|shop|store|cart|checkout/.test(name)) {
    role = "Tech Lead / E-commerce";
    add([
      "Built a performant storefront with optimized product discovery and faceted search",
      "Implemented secure checkout, payment gateways, and order management",
      "Added analytics funnels to improve conversion and retention",
    ]);
    addTech(["Next.js", "Stripe", "Elasticsearch", "Redis"]);
  }
  if (/\bsaas|subscription|multi-tenant|tenant/.test(name)) {
    role = "Principal Engineer / SaaS";
    add([
      "Designed multi-tenant architecture with strict data isolation",
      "Implemented metering, billing, and tiered feature flags",
    ]);
    addTech(["Kubernetes", "OpenTelemetry", "Feature Flags"]);
  }
  if (/\bio?t|sensor|telemetry|edge|device/.test(name)) {
    role = "IoT Platform Engineer";
    add([
      "Ingested time-series data from edge devices with backpressure handling",
      "Built real-time monitoring and alerting pipelines",
    ]);
    addTech(["MQTT", "TimescaleDB", "Grafana"]);
  }
  if (/\b(ai|ml|machine learning|deep learning|llm|chatbot|gpt|vision)\b/.test(name)) {
    role = "ML Engineer";
    add([
      "Developed model training/evaluation pipeline with automated sweeps",
      "Shipped inference service with caching and safety/guardrails",
    ]);
    addTech(["Python", "PyTorch", "FastAPI", "Vector DB"]);
  }
  if (/\bmobile|ios|android|react native|flutter/.test(name)) {
    role = "Mobile Lead";
    add([
      "Implemented offline-first data sync and background tasks",
      "Instrumented crash reporting and in-app analytics",
    ]);
    addTech(["React Native", "Expo", "SQLite"]);
  }
  if (/\bgis|maps|geospatial|routing|navigation/.test(name)) {
    role = "Geospatial Engineer";
    add([
      "Integrated map layers, tiling, and vector data pipelines",
      "Implemented route optimization and proximity search",
    ]);
    addTech(["Mapbox GL", "PostGIS"]);
  }
  if (/\bcms|content|blog|marketing site|landing/.test(name)) {
    role = "Frontend Engineer";
    add([
      "Built a headless CMS workflow with preview and localization",
      "Optimized Core Web Vitals and SEO metadata",
    ]);
    addTech(["Next.js", "Headless CMS", "Vercel"]);
  }
  if (/\bfintech|payments|bank|ledger|wallet/.test(name)) {
    role = "Fintech Engineer";
    add([
      "Implemented idempotent payment flows and ledger consistency",
      "Added monitoring for reconciliation and anomaly detection",
    ]);
    addTech(["Stripe", "Kafka", "Snowflake"]);
  }

  // Fallbacks if no domain hit
  if (bullets.length < 3) {
    add([
      "Implemented role-based access control and audit logs",
      "Optimized performance and accessibility across target devices",
      "Set up observability (logs, metrics, tracing) for quick diagnostics",
    ]);
  }

  // Produce HTML
  const summaryHtml = `<ul>\n${bullets
    .map((b) => `  <li>${escapeHtml(b)}</li>`)
    .join("\n")}\n</ul>`;

  // Tech list string
  const techStack = Array.from(tech).join(", ");

  return {
    summaryHtml,
    techStack: techStack || "React, Node.js, TypeScript, PostgreSQL, Docker",
    role,
  };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}