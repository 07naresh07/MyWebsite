// src/pages/ExperienceAdd.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Moon, Sun, Save, ArrowLeft, Calendar, MapPin, Building2,
  User, Briefcase, Tag, Bold, Italic, List, ListOrdered,
  Indent, Outdent, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, Link as LinkIcon, Palette, Undo2, Redo2, Maximize2, Minimize2,
  ChevronDown, X, AlertCircle, Info, Award
} from "lucide-react";
import { createExperience, updateExperience, getExperience } from "../lib/api.js";

/* ============================== PERSISTENT Theme hook ============================== */
const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem("experience_theme");
      return saved ? saved === "dark" : false;
    } catch {
      return false;
    }
  });
  
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem("experience_theme", next ? "dark" : "light"); } catch {}
  };
  
  return { isDark, toggleTheme };
};

/* ----------------------- Date helpers ----------------------- */
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function ymToText(ym) {
  if (!ym || typeof ym !== "string") return "";
  const [y, m] = ym.split("-").map((x) => Number(x));
  if (!y || !m || m < 1 || m > 12) return "";
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

/* =========================== SmartDatePicker ============================ */
function SmartDatePicker({
  label,
  value,
  onChange,
  required,
  minYear = 1970,
  maxYear = new Date().getFullYear() + 10,
  allowClear = true,
  forcePlaceholder = false,
  icon: Icon = Calendar,
  isDark
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);

  const yy = (value || "").split("-")[0] || "";
  const mm = (value || "").split("-")[1] || "";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(maxYear - i));
  const months = [
    { num: "01", name: "January" }, { num: "02", name: "February" }, { num: "03", name: "March" },
    { num: "04", name: "April" }, { num: "05", name: "May" }, { num: "06", name: "June" },
    { num: "07", name: "July" }, { num: "08", name: "August" }, { num: "09", name: "September" },
    { num: "10", name: "October" }, { num: "11", name: "November" }, { num: "12", name: "December" },
  ];

  const quickOptions = [
    { label: "This Month", value: () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }},
    { label: "Last Month", value: () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    }},
    { label: "6 Months Ago", value: () => {
      const now = new Date();
      const six = new Date(now.getFullYear(), now.getMonth() - 6);
      return `${six.getFullYear()}-${String(six.getMonth() + 1).padStart(2, "0")}`;
    }},
    { label: "1 Year Ago", value: () => {
      const now = new Date();
      return `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }},
  ];

  const setMonth = (m) => {
    const y = yy || String(new Date().getFullYear());
    onChange(`${y}-${m}`);
    setIsOpen(false);
  };
  const setYear = (y) => onChange(`${y}-${mm || "01"}`);
  const clear = () => { if (!required && allowClear) onChange(""); setIsOpen(false); };
  const applyQuickSelect = (option) => { onChange(option.value()); setIsOpen(false); };

  const displayValue = forcePlaceholder ? "" : value;
  const formattedValue = displayValue ? ymToText(displayValue) : "";

  return (
    <div ref={wrapRef} className="relative group">
      {label !== "" && (
        <label className={`block text-sm font-medium mb-2 transition-colors ${isDark ? "text-gray-200" : "text-gray-700"}`}>
          <div className="flex items-center gap-2">
            <Icon size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
            {label}
            {required && <span className="text-red-500">*</span>}
          </div>
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
          isDark ? "bg-gray-800 border-gray-600 hover:border-blue-500 text-gray-200" : "bg-white border-gray-300 hover:border-blue-500 text-gray-900"
        } ${isOpen ? (isDark ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500 ring-2 ring-blue-500/20") : ""} 
        group-hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
      >
        <span className={`font-medium ${displayValue ? "" : (isDark ? "text-gray-400" : "text-gray-500")}`}>
          {formattedValue || "Select date (YYYY-MM)"}
        </span>
        <ChevronDown size={20} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isDark ? "text-gray-400" : "text-gray-500"}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-2 w-full rounded-2xl border shadow-2xl p-6 transition-all duration-200 ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}>
          {/* Quick Select */}
          <div className="mb-4">
            <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Quick Select</h4>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option, idx) => (
                <button key={idx} type="button" onClick={() => applyQuickSelect(option)} className={`px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? "hover:bg-gray-700 text-gray-300 hover:text-white" : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month / Year */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Month</label>
              <select value={mm} onChange={(e) => setMonth(e.target.value)} className={`w-full px-3 py-2 rounded-lg border transition-colors ${isDark ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-white border-gray-300 text-gray-900"}`}>
                <option value="">Month</option>
                {months.map((m) => <option key={m.num} value={m.num}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>Year</label>
              <select value={yy} onChange={(e) => setYear(e.target.value)} className={`w-full px-3 py-2 rounded-lg border transition-colors ${isDark ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-white border-gray-300 text-gray-900"}`}>
                <option value="">Year</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            {allowClear && !required ? (
              <button type="button" onClick={clear} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}>
                Clear
              </button>
            ) : (<div />)}

            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ AdvancedEditor ============================= */
function AdvancedEditor({ html, onChange, isDark }) {
  const editorRef = useRef(null);
  const [showColors, setShowColors] = useState(false);
  const [colorTab, setColorTab] = useState("text");
  const [customColor, setCustomColor] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const popoverRef = useRef(null);

  // Prevent prop->DOM writes during local typing (preserves caret & undo stack)
  const isLocalChangeRef = useRef(false);

  /* ---------- cleaners ---------- */
  const cleanHtml = useCallback((rawHtml = "", opts = { stripHighlight: true, stripShadows: true, stripFonts: true }) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${rawHtml}</div>`, "text/html");
      const root = doc.body;

      const pruneStyle = (styleStr) => {
        if (!styleStr) return "";
        const keep = [];
        styleStr.split(";").forEach((decl) => {
          const d = decl.trim();
          if (!d) return;
          const prop = d.split(":")[0]?.trim().toLowerCase();
          if (!prop) return;
          if (opts.stripHighlight && (prop === "background" || prop === "background-color" || prop === "background-image")) return;
          if (opts.stripShadows && (prop === "text-shadow" || prop === "box-shadow" || prop === "filter")) return;
          if (opts.stripFonts && (prop === "font-family" || prop === "font" || prop === "font-size")) return;
          keep.push(d);
        });
        return keep.join("; ");
      };

      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 1) {
            const tag = n.tagName.toLowerCase();

            // unwrap <mark> and <font color> etc. when cleaning highlights on paste
            if (opts.stripHighlight && tag === "mark") {
              const frag = doc.createDocumentFragment();
              while (n.firstChild) frag.appendChild(n.firstChild);
              n.replaceWith(frag);
              return;
            }

            if (opts.stripHighlight && n.hasAttribute("bgcolor")) n.removeAttribute("bgcolor");
            if (n.hasAttribute("style")) {
              const pruned = pruneStyle(n.getAttribute("style") || "");
              pruned ? n.setAttribute("style", pruned) : n.removeAttribute("style");
            }

            // Remove deprecated color attributes from <font> tags (unwrap if empty)
            if (tag === "font" && (n.hasAttribute("color") || n.attributes.length === 0)) {
              const frag = doc.createDocumentFragment();
              while (n.firstChild) frag.appendChild(n.firstChild);
              n.replaceWith(frag);
              return;
            }
            walk(n);
          }
        });
      };
      walk(root);
      return root.innerHTML;
    } catch {
      // Fallback best-effort
      return String(rawHtml)
        .replace(/(<mark[^>]*>)/gi, "")
        .replace(/<\/mark>/gi, "")
        .replace(/\sbgcolor="[^"]*"/gi, "")
        .replace(/\sstyle="[^"]*"/gi, (m) =>
          m
            .replace(/background[^;"]*;?/gi, "")
            .replace(/text-shadow[^;"]*;?/gi, "")
            .replace(/box-shadow[^;"]*;?/gi, "")
            .replace(/font-family[^;"]*;?/gi, "")
            .replace(/font-size[^;"]*;?/gi, "")
        );
    }
  }, []);

  const removeInlineColorFromFragment = (containerEl, { removeTextColor, removeHighlight }) => {
    const stripProps = (styleEl) => {
      const s = styleEl.getAttribute("style") || "";
      const keep = s
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .filter((d) => {
          const key = d.split(":")[0]?.trim().toLowerCase();
          if (!key) return false;
          if (removeTextColor && key === "color") return false;
          if (removeHighlight && (key === "background" || key === "background-color" || key === "background-image")) return false;
          if (key === "text-shadow" || key === "box-shadow" || key === "filter") return false; // keep clean
          if (key === "font-family" || key === "font" || key === "font-size") return false;   // avoid font jumps
          return true;
        });
      if (keep.length) styleEl.setAttribute("style", keep.join("; "));
      else styleEl.removeAttribute("style");
    };

    const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_ELEMENT, null);
    let node = walker.currentNode;
    while ((node = walker.nextNode())) {
      const tag = node.tagName.toLowerCase();
      if (removeHighlight && tag === "mark") {
        const frag = document.createDocumentFragment();
        while (node.firstChild) frag.appendChild(node.firstChild);
        node.replaceWith(frag);
        continue;
      }
      if (node.hasAttribute("style")) stripProps(node);
      if (removeTextColor && tag === "font" && node.hasAttribute("color")) {
        node.removeAttribute("color");
      }
      if (removeHighlight && node.hasAttribute("bgcolor")) node.removeAttribute("bgcolor");
    }
  };

  // lock body scroll when fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isFullscreen]);

  // ESC to exit fullscreen
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // (Optional) Ask execCommand not to inject CSS where supported
  useEffect(() => {
    try { document.execCommand("styleWithCSS", false, false); } catch {}
  }, []);

  // Set initial HTML and on external changes ONLY (not on local typing)
  useEffect(() => {
    if (!editorRef.current) return;
    if (isLocalChangeRef.current) return;

    const incoming = cleanHtml(html || "", { stripHighlight: true, stripShadows: true, stripFonts: true });
    if (incoming !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = incoming;
      updateWordCount();
    }
  }, [html, cleanHtml]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setShowColors(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || "";
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    }
  };

  const execCommand = (command, value = null) => {
    editorRef.current?.focus();
    isLocalChangeRef.current = true;
    document.execCommand(command, false, value);
    const updatedHtml = editorRef.current?.innerHTML || "";
    onChange(updatedHtml);
    updateWordCount();
    setTimeout(() => { isLocalChangeRef.current = false; }, 0);
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      try { new URL(url); execCommand("createLink", url); }
      catch { alert("Please enter a valid URL"); }
    }
  };

  /* ---------- Selection helpers ---------- */
  const getSelectedListItems = () => {
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return [];
    const range = sel.getRangeAt(0);
    const container = editorRef.current;

    const items = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        return node.tagName === "LI" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    let node = walker.nextNode();
    while (node) {
      const r = document.createRange();
      r.selectNodeContents(node);
      const overlaps = !(range.compareBoundaryPoints(Range.END_TO_START, r) <= 0 ||
                         range.compareBoundaryPoints(Range.START_TO_END, r) >= 0);
      if (overlaps) items.push(node);
      node = walker.nextNode();
    }
    const addAncestorLI = (n) => {
      while (n && n !== container) {
        if (n.nodeType === 1 && n.tagName === "LI" && !items.includes(n)) items.push(n);
        n = n.parentNode;
      }
    };
    addAncestorLI(range.startContainer);
    addAncestorLI(range.endContainer);

    return items;
  };

  const colorizeListMarkers = (color) => {
    const lis = getSelectedListItems();
    lis.forEach((li) => { li.style.color = color; });
  };

  const clearListMarkerColor = () => {
    const lis = getSelectedListItems();
    lis.forEach((li) => { li.style.removeProperty("color"); });
  };

  const applyColor = (color) => {
    const command = colorTab === "highlight" ? "hiliteColor" : "foreColor";
    execCommand(command, color);
    if (colorTab === "text") colorizeListMarkers(color); // bullets/numbers always match
    setShowColors(false);
  };

  const replaceSelection = (transformer) => {
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const frag = range.cloneContents();
    const holder = document.createElement("div");
    holder.appendChild(frag);
    transformer(holder);
    isLocalChangeRef.current = true;
    range.deleteContents();
    const newFrag = document.createDocumentFragment();
    while (holder.firstChild) newFrag.appendChild(holder.firstChild);
    range.insertNode(newFrag);
    // move caret to end of inserted content
    sel.removeAllRanges();
    const r = document.createRange();
    r.selectNodeContents(editorRef.current);
    r.collapse(false);
    sel.addRange(r);
    onChange(editorRef.current?.innerHTML || "");
    updateWordCount();
    setTimeout(() => { isLocalChangeRef.current = false; }, 0);
  };

  const clearTextColor = () => {
    replaceSelection((holder) => {
      removeInlineColorFromFragment(holder, { removeTextColor: true, removeHighlight: false });
    });
    clearListMarkerColor();
    setShowColors(false);
  };

  const clearHighlight = () => {
    replaceSelection((holder) => {
      removeInlineColorFromFragment(holder, { removeTextColor: false, removeHighlight: true });
    });
    setShowColors(false);
  };

  /* ---------- Paste: clean highlights/shadows/fonts ---------- */
  const handlePaste = (e) => {
    e.preventDefault();
    const htmlData = e.clipboardData?.getData("text/html");
    const textData = e.clipboardData?.getData("text/plain") || "";

    const toInsert = htmlData
      ? cleanHtml(htmlData, { stripHighlight: true, stripShadows: true, stripFonts: true })
      : textData.replace(/\n/g, "<br>");

    editorRef.current?.focus();
    isLocalChangeRef.current = true;
    document.execCommand("insertHTML", false, toInsert);
    onChange(editorRef.current?.innerHTML || "");
    updateWordCount();
    setTimeout(() => { isLocalChangeRef.current = false; }, 0);
  };

  // Make Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z / Ctrl/Cmd+Y work reliably
  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (key === "z" || key === "y")) {
      e.preventDefault();
      if (key === "z" && !e.shiftKey) {
        execCommand("undo");
      } else {
        execCommand("redo");
      }
    }
  };

  const ToolButton = ({ onClick, icon: Icon, label, isActive = false }) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-blue-600 text-white"
          : isDark
          ? "hover:bg-gray-700 text-gray-300"
          : "hover:bg-gray-100 text-gray-600"
      }`}
    >
      <Icon size={16} />
    </button>
  );

  const colors = {
    // added #ffffff (white)
    text: ["#000000", "#1f2937", "#111827", "#ffffff", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"],
    highlight: ["#fef3c7", "#fee2e2", "#dbeafe", "#dcfce7", "#f3e8ff", "#fce7f3", "#e0f2fe", "#f0f9ff"],
  };

  return (
    <div
      className={`
        border-2 rounded-2xl transition-all duration-200 overflow-hidden
        ${isDark ? "border-gray-600" : "border-gray-300"}
        ${isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col" : ""}
      `}
      style={isFullscreen ? { height: "100vh" } : undefined}
    >
      {/* Toolbar */}
      <div
        className={`
          flex flex-wrap items-center gap-2 p-4 border-b
          ${isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-gray-50"}
          ${isFullscreen ? "shrink-0" : ""}
        `}
      >
        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("bold")} icon={Bold} label="Bold" />
          <ToolButton onClick={() => execCommand("italic")} icon={Italic} label="Italic" />
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("insertUnorderedList")} icon={List} label="Bullet List" />
          <ToolButton onClick={() => execCommand("insertOrderedList")} icon={ListOrdered} label="Numbered List" />
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("indent")} icon={Indent} label="Indent" />
          <ToolButton onClick={() => execCommand("outdent")} icon={Outdent} label="Outdent" />
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("justifyLeft")} icon={AlignLeft} label="Align Left" />
          <ToolButton onClick={() => execCommand("justifyCenter")} icon={AlignCenter} label="Align Center" />
          <ToolButton onClick={() => execCommand("justifyRight")} icon={AlignRight} label="Align Right" />
          <ToolButton onClick={() => execCommand("justifyFull")} icon={AlignJustify} label="Justify" />
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <ToolButton onClick={insertLink} icon={LinkIcon} label="Insert Link" />

        <div className="relative" ref={popoverRef}>
          <ToolButton
            onClick={() => setShowColors(!showColors)}
            icon={Palette}
            label="Colors"
            isActive={showColors}
          />

          {showColors && (
            <div
              className={`
                absolute top-full left-0 mt-2 p-4 rounded-xl border shadow-xl z-50 w-72
                ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}
              `}
            >
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setColorTab("text")}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    colorTab === "text"
                      ? "bg-blue-600 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setColorTab("highlight")}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    colorTab === "highlight"
                      ? "bg-blue-600 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Highlight
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {(colorTab === "highlight" ? colors.highlight : colors.text).map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => applyColor(color)}
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom + Clear actions */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#000000"
                  className={`flex-1 px-2 py-1 text-sm rounded border ${
                    isDark ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-white border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => customColor && applyColor(customColor)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={clearTextColor}
                  className={`px-3 py-1 text-sm rounded border ${
                    isDark ? "border-gray-600 text-gray-200 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                  title="Remove text color (back to default)"
                >
                  Remove color
                </button>
                <button
                  type="button"
                  onClick={clearHighlight}
                  className={`px-3 py-1 text-sm rounded border ${
                    isDark ? "border-gray-600 text-gray-200 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                  title="Remove highlight (background)"
                >
                  Remove highlight
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("undo")} icon={Undo2} label="Undo (Ctrl/Cmd+Z)" />
          <ToolButton onClick={() => execCommand("redo")} icon={Redo2} label="Redo (Ctrl/Cmd+Y / Shift+Ctrl/Cmd+Z)" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{wordCount} words</span>
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"
            }`}
            title={isFullscreen ? "Exit full screen" : "Full screen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onInput={(e) => {
          isLocalChangeRef.current = true;
          onChange(e.currentTarget.innerHTML);
          updateWordCount();
          setTimeout(() => { isLocalChangeRef.current = false; }, 0);
        }}
        className={`
          editor-content
          ${isFullscreen ? "flex-1 h-auto overflow-auto" : "min-h-[200px]"}
          p-6 focus:outline-none
          ${isDark ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"}
          rounded-b-2xl
        `}
        data-placeholder="Describe your work experience, achievements, and key responsibilities..."
        spellCheck
      />

      <style>{`
        /* Keep fonts consistent (prevents 'Times' jump on backspace in lists) */
        .editor-content, .editor-content * { font-family: inherit !important; }

        /* Placeholder */
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: ${isDark ? "#9ca3af" : "#6b7280"};
          font-style: italic;
        }
        /* Lists */
        .editor-content ul {
          list-style: disc outside !important;
          margin: 1rem 0 !important;
          padding-left: 1.5rem !important;
        }
        .editor-content ol {
          list-style: decimal outside !important;
          margin: 1rem 0 !important;
          padding-left: 1.5rem !important;
        }
        .editor-content li {
          display: list-item !important;
          margin: 0.25rem 0 !important;
        }
        /* Markers always follow element color (so bullets/numbers match text color) */
        .editor-content li::marker { color: currentColor !important; }

        /* Neutralize any leftover background/shadow styles */
        .editor-content [style*="background"],
        .editor-content [style*="background-color"],
        .editor-content [style*="background-image"],
        .editor-content [style*="text-shadow"],
        .editor-content [style*="box-shadow"] {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}

/* ============================ SmartTagInput ============================ */
function SmartTagInput({ value, onChange, placeholder, isDark, suggestions = [] }) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const tags = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const addTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      const newValue = newTags.join(", ");
      onChange(newValue);
    }
    setInputValue("");
    setShowSuggestions(false);
  };
  
  const removeTag = (index) => {
    const newTags = tags.filter((_, i) => i !== index);
    const newValue = newTags.join(", ");
    onChange(newValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div className="relative">
      <div className={`min-h-[3rem] p-3 border-2 rounded-xl flex flex-wrap gap-2 transition-all duration-200 ${isDark ? "bg-gray-800 border-gray-600 focus-within:border-blue-500" : "bg-white border-gray-300 focus-within:border-blue-500"}`}>
        {tags.map((tag, index) => (
          <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
            {tag}
            <button type="button" onClick={() => removeTag(index)} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5" title="Remove">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className={`flex-1 min-w-[120px] bg-transparent outline-none ${isDark ? "text-gray-200 placeholder-gray-400" : "text-gray-900 placeholder-gray-500"}`}
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className={`absolute z-40 w-full mt-1 border rounded-xl shadow-lg max-h-40 overflow-y-auto ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}>
          {filteredSuggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => addTag(s)} className={`w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${isDark ? "text-gray-200" : "text-gray-900"}`}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Helper functions for data extraction */
function getField(obj, fieldNames) {
  for (const field of fieldNames) {
    const value = obj?.[field];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(v => v && String(v).trim()).map(v => String(v).trim());
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return toArray(parsed);
      } catch {}
    }
    return trimmed.split(",").map(v => v.trim()).filter(v => v);
  }
  return [];
}

/* ============================== Main Page =============================== */
export default function ExperienceAdd() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  const [formData, setFormData] = useState({
    company: "",
    role: "",
    project: "",
    location: "",
    startDate: "", 
    endDate: "",   
    description: "",
    tags: "",
    isCurrentRole: false,
  });

  const sameId = (row, wanted) => {
    const variants = [row?.id, row?.Id, row?._id, row?.experienceId, row?.experience_id];
    return variants.map((v) => (v == null ? "" : String(v))).includes(String(wanted));
  };

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const data = await getExperience();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        const row = list.find((r) => sameId(r, id));
        if (!row) return;

        const company = getField(row, ["company", "Company", "employer"]);
        const role = getField(row, ["role", "Role", "position", "title", "jobTitle"]);
        const project = getField(row, ["project", "Project", "projectName", "client"]);
        const location = getField(row, ["location", "Location", "city"]);
        const startDate = getField(row, ["startDate", "start_date", "from"]);
        const endDate = getField(row, ["endDate", "end_date", "to"]);

        const toolsRaw = row?.tools || row?.tags || row?.skills || row?.technologies || "";
        const toolsArray = toArray(toolsRaw);

        const descriptionHtml = getField(row, ["descriptionHtml", "description_html", "html"]);
        const descriptionText = getField(row, ["description", "body", "content"]);
        const description = descriptionHtml || descriptionText;

        setFormData({
          company,
          role,
          project,
          location,
          startDate,
          endDate,
          description,
          tags: toolsArray.join(", "),
          isCurrentRole: !endDate,
        });
      } catch (e) {
        console.error("Error loading experience:", e);
        alert(e?.message || "Failed to load experience.");
      }
    })();
  }, [isEditing, id]);

  // Auto-save draft
  useEffect(() => {
    if (!autoSave) return;
    const t = setTimeout(() => {
      try { localStorage.setItem("draft_experience", JSON.stringify(formData)); } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [formData, autoSave]);

  const validateForm = () => {
    const e = {};
    if (!formData.company.trim()) e.company = "Company is required";
    if (!formData.startDate) e.startDate = "Start date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const buildPayload = () => {
    const toolsArray = formData.tags ? 
      formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : 
      [];
    return {
      company: formData.company.trim(),
      role: formData.role.trim(),
      project: formData.project.trim(),
      location: formData.location.trim(),
      startDate: formData.startDate || null,
      endDate: formData.isCurrentRole ? null : (formData.endDate || null),
      descriptionHtml: formData.description,
      tools: toolsArray,
      projectName: formData.project.trim(),
      tags: toolsArray,
      skills: toolsArray,
      description: formData.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEditing) {
        await updateExperience(id, payload);
      } else {
        await createExperience(payload);
      }
      try { localStorage.removeItem("draft_experience"); } catch {}
      window.dispatchEvent(new Event("experience:saved"));
      navigate("/experience");
    } catch (err) {
      console.error("Save error:", err);
      alert(err?.message || "Failed to save experience");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/experience");
  const handleBack = () => navigate("/experience");

  const commonInputClasses = `w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-0 ${
    isDark
      ? "bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
  }`;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={handleBack} className={`p-2 rounded-xl transition-colors ${isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}>
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {isEditing ? "Edit Experience" : "Add Experience"}
              </h1>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
                Share your professional journey and achievements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Preview toggle */}
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showPreview ? "bg-blue-600 text-white" : isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
            >
              <Info size={16} />
              <span className="text-sm font-medium">Preview</span>
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all duration-200 ${isDark ? "bg-gray-800 text-yellow-400 hover:bg-gray-700" : "bg-white text-gray-600 hover:bg-gray-100 shadow-sm"}`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {showPreview ? (
          /* ============================== Preview ============================== */
          <div className={`rounded-2xl border p-8 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Preview</h2>
              <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mt-2`}>How your experience will appear</p>
            </div>

            <div className={`border rounded-xl p-6 ${isDark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formData.role || "Your Role"}
                  </h3>
                  <p className={`text-lg ${isDark ? "text-blue-400" : "text-blue-600"} font-medium`}>
                    {formData.company || "Company Name"}
                  </p>
                  {formData.project && (
                    <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-1`}>
                      Project: {formData.project}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`${isDark ? "text-gray-200" : "text-gray-700"} font-medium`}>
                    {ymToText(formData.startDate) || "Start Date"} - {formData.isCurrentRole ? "Present" : ymToText(formData.endDate) || "End Date"}
                  </p>
                  {formData.location && (
                    <p className={`${isDark ? "text-gray-300" : "text-gray-600"} text-sm mt-1`}>
                      {formData.location}
                    </p>
                  )}
                </div>
              </div>

              {formData.description && (
                <div className={`preview-description mb-4 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                  <div dangerouslySetInnerHTML={{ __html: formData.description }} />
                </div>
              )}

              {formData.tags && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <style>{`
              .preview-description ul {
                list-style: disc outside !important;
                margin: 1rem 0 !important;
                padding-left: 1.5rem !important;
              }
              .preview-description ol {
                list-style: decimal outside !important;
                margin: 1rem 0 !important;
                padding-left: 1.5rem !important;
              }
              .preview-description li {
                display: list-item !important;
                margin: 0.25rem 0 !important;
              }
              .preview-description li::marker { color: currentColor !important; }
            `}</style>
          </div>
        ) : (
          /* =============================== Form =============================== */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Basic Information</h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Company, role, and project details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                      Company Name <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    className={`${commonInputClasses} ${errors.company ? "border-red-500" : ""}`}
                    placeholder="e.g., Google, Microsoft, Startup Inc."
                  />
                  {errors.company && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.company}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <User size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                      Position / Role
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => updateField("role", e.target.value)}
                    className={commonInputClasses}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                      Project Name
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.project}
                    onChange={(e) => updateField("project", e.target.value)}
                    className={commonInputClasses}
                    placeholder="e.g., E-commerce Platform"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                      Location
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    className={commonInputClasses}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Calendar size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Timeline</h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Employment period</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <SmartDatePicker
                    label="Start Date"
                    value={formData.startDate}
                    onChange={(value) => updateField("startDate", value)}
                    required
                    isDark={isDark}
                  />
                  {errors.startDate && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                        End Date
                      </div>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isCurrentRole}
                        onChange={(e) => { 
                          updateField("isCurrentRole", e.target.checked); 
                          if (e.target.checked) updateField("endDate", ""); 
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>Current role</span>
                    </label>
                  </div>

                  {!formData.isCurrentRole ? (
                    <SmartDatePicker 
                      label="" 
                      value={formData.endDate} 
                      onChange={(value) => updateField("endDate", value)} 
                      isDark={isDark} 
                    />
                  ) : (
                    <div className={`w-full px-4 py-3 rounded-xl border-2 border-dashed text-center ${isDark ? "border-gray-600 bg-gray-700 text-gray-400" : "border-gray-300 bg-gray-50 text-gray-500"}`}>
                      Present
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Award size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Work Description</h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Describe your responsibilities and achievements</p>
                </div>
              </div>

              <AdvancedEditor 
                html={formData.description} 
                onChange={(value) => updateField("description", value)} 
                isDark={isDark} 
              />
            </div>

            {/* Skills & Technologies */}
            <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Tag size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Skills & Technologies</h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Tools and technologies used</p>
                </div>
              </div>

              <SmartTagInput
                value={formData.tags}
                onChange={(value) => updateField("tags", value)}
                placeholder="Type skills and press Enter (e.g., React, Node.js)"
                isDark={isDark}
                suggestions={["React","JavaScript","Python","Node.js","TypeScript","MongoDB","PostgreSQL","AWS","Docker","Kubernetes"]}
              />
            </div>

            {/* Actions */}
            <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}>
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      saving ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        {isEditing ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        {isEditing ? "Update Experience" : "Save Experience"}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 transition-all duration-200 ${
                      isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
