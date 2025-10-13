import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Save, Plus, ArrowLeft, Trash2,
  Type, Image, Code, Heading,
  Upload, Check, Copy, ChevronUp, ChevronDown,
  ChevronsUp, ChevronsDown, GripVertical,
  RotateCcw, RotateCw, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered,
  Minus, Circle, Square,
  ChevronDown as ChevronDownIcon, Smile, Wand2
} from "lucide-react";

/* ---------- AUTH: reuse the same login helper your display page uses ---------- */
import { loginAsOwner } from "../lib/owner.js";

/* ---------- API & Auth ---------- */
const RAW_API = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "").trim();
const API_BASE = RAW_API.replace(/\/+$/, "");
const api = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const ownerHeaders = () => {
  const t = localStorage.getItem("owner_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function fetchJSON(path, options = {}) {
  let res = await fetch(api(path), options);
  if (res.status === 404 && !path.endsWith("/")) res = await fetch(api(path + "/"), options);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      if (data?.detail) msg = JSON.stringify(data.detail);
      else if (data?.message) msg = data.message;
      else msg = JSON.stringify(data);
    } catch {
      msg = (await res.text()) || res.statusText;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

const useOwnerMode = () => {
  const [owner, setOwner] = useState(true);
  return { owner, setOwner };
};

/* ---------- AUTH: ensure we actually have a token; prompt once if missing ---------- */
async function ensureOwnerToken() {
  let tok = localStorage.getItem("owner_token");
  if (tok) return tok;
  const pwd = window.prompt("Owner password required:");
  if (!pwd) throw new Error("Authentication cancelled");
  const result = await loginAsOwner(pwd, API_BASE);
  if (!result?.success || !result?.token) {
    throw new Error(result?.error || "Authentication failed");
  }
  localStorage.setItem("owner_token", result.token);
  return result.token;
}

/* ---------- Add Block Menu ---------- */
function AddBlockMenu({ onAdd, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const blocks = [
    { type: "h1", icon: Heading, label: "Heading 1", color: "text-purple-600", desc: "Main section heading" },
    { type: "h2", icon: Heading, label: "Heading 2", color: "text-purple-500", desc: "Subsection heading" },
    { type: "text", icon: Type, label: "Paragraph", color: "text-slate-600", desc: "Regular text block" },
    { type: "image", icon: Image, label: "Image", color: "text-blue-600", desc: "Upload an image" },
    { type: "code", icon: Code, label: "Code", color: "text-green-600", desc: "Code snippet" },
  ];

  return (
    <div
      className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50"
      ref={menuRef}
    >
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50">
        Add Block
      </div>
      {blocks.map(({ type, icon: Icon, label, color, desc }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition text-left group border-b border-slate-100 last:border-0"
        >
          <div className="p-2 rounded-lg bg-slate-50 group-hover:scale-110 transition">
            <Icon size={18} className={color} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-700">{label}</div>
            <div className="text-xs text-slate-500">{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ---------- Block Toolbar ---------- */
function BlockToolbar({
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  canMoveUp,
  canMoveDown
}) {
  return (
    <div className="absolute -left-16 top-0 flex flex-col gap-1 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-[100]">
      <div
        className="p-2 rounded-lg hover:bg-slate-100 transition cursor-grab active:cursor-grabbing drag-handle"
        title="Drag to reorder"
        draggable="true"
      >
        <GripVertical size={16} className="text-slate-400 pointer-events-none" />
      </div>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        className="p-2 rounded-lg hover:bg-red-50 transition group/btn"
        title="Delete block"
      >
        <Trash2 size={16} className="text-slate-400 group-hover/btn:text-red-600" />
      </button>

      <div className="border-t border-slate-200 my-1" />

      {canMoveUp && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToTop(); }}
            className="p-2 rounded-lg hover:bg-purple-50 transition group/btn"
            title="Move to top"
          >
            <ChevronsUp size={16} className="text-slate-400 group-hover/btn:text-purple-600" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveUp(); }}
            className="p-2 rounded-lg hover:bg-blue-50 transition group/btn"
            title="Move up"
          >
            <ChevronUp size={16} className="text-slate-400 group-hover/btn:text-blue-600" />
          </button>
        </>
      )}

      {canMoveDown && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveDown(); }}
            className="p-2 rounded-lg hover:bg-blue-50 transition group/btn"
            title="Move down"
          >
            <ChevronDown size={16} className="text-slate-400 group-hover/btn:text-blue-600" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToBottom(); }}
            className="p-2 rounded-lg hover:bg-purple-50 transition group/btn"
            title="Move to bottom"
          >
            <ChevronsDown size={16} className="text-slate-400 group-hover/btn:text-purple-600" />
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Heading Block ---------- */
function HeadingBlock({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom, canMoveUp, canMoveDown, isDragging }) {
  const [value, setValue] = useState(block.value || "");

  useEffect(() => { setValue(block.value || ""); }, [block.value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    onUpdate(index, { ...block, value: newValue });
  };

  const isH1 = block.type === "h1";
  const Tag = isH1 ? "h1" : "h2";
  const className = isH1
    ? "text-5xl font-extrabold text-slate-900 tracking-tight leading-tight"
    : "text-4xl font-bold text-purple-800 leading-snug";
  const placeholder = isH1 ? "Main Heading" : "Subheading";

  return (
    <div
      className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      data-block-index={index}
    >
      {isH1 && index > 0 && (
        <div className="mb-12 pt-12 border-t-2 border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">
            New Section
          </div>
        </div>
      )}
      <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
        <BlockToolbar
          onDelete={() => onDelete(index)}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onMoveToTop={() => onMoveToTop(index)}
          onMoveToBottom={() => onMoveToBottom(index)}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>
      {isH1 && index === 0 && (
        <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-purple-600 rounded-full"></span>
          Main Heading
        </div>
      )}
      <Tag className={className}>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full bg-transparent focus:outline-none placeholder-slate-300 focus:placeholder-slate-400 caret-slate-900"
          style={{ caretColor: '#0f172a' }}
        />
      </Tag>
    </div>
  );
}

/* ---------- Enhanced Text Block with Advanced Features ---------- */
function TextBlock({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom, canMoveUp, canMoveDown, isDragging }) {
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showListStyleMenu, setShowListStyleMenu] = useState(false);
  const [showNumberStyleMenu, setShowNumberStyleMenu] = useState(false);

  // INSERT DROPDOWN (new)
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [insertTab, setInsertTab] = useState("arrows"); // arrows | emojis | symbols
  const insertMenuRef = useRef(null);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const editorRef = useRef(null);
  const colorPickerRef = useRef(null);
  const highlightPickerRef = useRef(null);
  const listStyleMenuRef = useRef(null);
  const numberStyleMenuRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && block.value && editorRef.current.innerHTML !== block.value) {
      editorRef.current.innerHTML = block.value;
      updateWordCount();
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && block.value != null && editorRef.current.innerHTML !== block.value) {
      editorRef.current.innerHTML = block.value;
      updateWordCount();
    }
  }, [block.value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) setShowColorPicker(false);
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(e.target)) setShowHighlightPicker(false);
      if (listStyleMenuRef.current && !listStyleMenuRef.current.contains(e.target)) setShowListStyleMenu(false);
      if (numberStyleMenuRef.current && !numberStyleMenuRef.current.contains(e.target)) setShowNumberStyleMenu(false);
      if (insertMenuRef.current && !insertMenuRef.current.contains(e.target)) setShowInsertMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || "";
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      setWordCount(words.length);
    }
  };

  const saveToUndo = () => {
    if (editorRef.current) {
      setUndoStack(prev => [...prev.slice(-19), editorRef.current.innerHTML]);
      setRedoStack([]);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      onUpdate(index, { ...block, value: newValue });
      updateWordCount();
    }
  };

  const execCommand = (command, value = null) => {
    saveToUndo();
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleUndo = () => {
    if (undoStack.length > 0 && editorRef.current) {
      const previous = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, editorRef.current.innerHTML]);
      setUndoStack(prev => prev.slice(0, -1));
      editorRef.current.innerHTML = previous;
      onUpdate(index, { ...block, value: previous });
      updateWordCount();
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0 && editorRef.current) {
      const next = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, editorRef.current.innerHTML]);
      setRedoStack(prev => prev.slice(0, -1));
      editorRef.current.innerHTML = next;
      onUpdate(index, { ...block, value: next });
      updateWordCount();
    }
  };

  const handleKeyDown = (e) => {
    // Tab for indent, Shift+Tab for outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) execCommand('outdent');
      else execCommand('indent');
    }

    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }

    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
    if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
      e.preventDefault();
      handleRedo();
    }
  };

  const applyListStyle = (styleType) => {
    saveToUndo();

    // First ensure we have a list
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    document.execCommand('insertUnorderedList', false, null);

    // Get all list items in the selection
    if (editorRef.current) {
      const lists = editorRef.current.querySelectorAll('ul');
      lists.forEach(list => {
        list.style.listStyleType = styleType;
        list.classList.add('custom-list');
      });
    }

    handleInput();
    setShowListStyleMenu(false);
  };

  const applyNumberStyle = (styleType) => {
    saveToUndo();

    document.execCommand('insertOrderedList', false, null);

    if (editorRef.current) {
      const lists = editorRef.current.querySelectorAll('ol');
      lists.forEach(list => {
        list.style.listStyleType = styleType;
        list.classList.add('custom-list');
      });
    }

    handleInput();
    setShowNumberStyleMenu(false);
  };

  // ---------- INSERT HELPERS (new) ----------
  const insertAtCaret = (text) => {
    saveToUndo();
    const ok = document.execCommand?.("insertText", false, text);
    if (!ok) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.setStart(range.endContainer, range.endOffset);
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (editorRef.current) {
        editorRef.current.appendChild(document.createTextNode(text));
      }
    }
    handleInput();
  };

  const arrows = ["→","←","↑","↓","➜","➤","➥","➦","⇒","⇐","⇑","⇓","⇔","⇕","↪","↩","↗","↘","↖","↙","⟶","⟵","⟷","▶","◀","▲","▼","↠","↞","⇢","⇠","➔","➙","➛"];
  const emojis = ["✅","✨","🔥","⭐","💡","📌","🧠","🚀","👍","💯","📝","✅","⚠️","❗","🔗","📎","📷","⏱️","📦","🧩","📈","📊","🧪","🔧","🛠️","🗂️","🧭","🗓️","💬","🧵"];
  const symbols = ["•","‣","◦","▪","–","—","·","◇","◆","▹","▸","▻","▾","▿","☐","☑","☒","✓","✗","★","☆","♥","♡","“","”","‘","’","§","†","‡","∞","≈","±","→"];

  const colors = [
    { hex: '#000000', name: 'Black' }, { hex: '#374151', name: 'Gray 700' },
    { hex: '#6B7280', name: 'Gray 500' }, { hex: '#9CA3AF', name: 'Gray 400' },
    { hex: '#EF4444', name: 'Red' }, { hex: '#DC2626', name: 'Red 600' },
    { hex: '#F59E0B', name: 'Amber' }, { hex: '#D97706', name: 'Amber 600' },
    { hex: '#10B981', name: 'Emerald' }, { hex: '#059669', name: 'Emerald 600' },
    { hex: '#3B82F6', name: 'Blue' }, { hex: '#2563EB', name: 'Blue 600' },
    { hex: '#8B5CF6', name: 'Violet' }, { hex: '#7C3AED', name: 'Violet 600' },
    { hex: '#EC4899', name: 'Pink' }, { hex: '#DB2777', name: 'Pink 600' },
    { hex: '#14B8A6', name: 'Teal' }, { hex: '#0D9488', name: 'Teal 600' },
    { hex: '#F97316', name: 'Orange' }, { hex: '#EA580C', name: 'Orange 600' },
    { hex: '#06B6D4', name: 'Cyan' }, { hex: '#0891B2', name: 'Cyan 600' },
    { hex: '#84CC16', name: 'Lime' }, { hex: '#65A30D', name: 'Lime 600' }
  ];

  const highlightColors = [
    { hex: 'transparent', name: 'None' },
    { hex: '#FEF3C7', name: 'Yellow' }, { hex: '#FDE68A', name: 'Yellow 300' }, { hex: '#FCD34D', name: 'Yellow 400' },
    { hex: '#FED7AA', name: 'Orange' }, { hex: '#FDBA74', name: 'Orange 300' }, { hex: '#FB923C', name: 'Orange 400' },
    { hex: '#FECACA', name: 'Red' }, { hex: '#FCA5A5', name: 'Red 300' }, { hex: '#F87171', name: 'Red 400' },
    { hex: '#FBCFE8', name: 'Pink' }, { hex: '#F9A8D4', name: 'Pink 300' }, { hex: '#F472B6', name: 'Pink 400' },
    { hex: '#DDD6FE', name: 'Purple' }, { hex: '#C4B5FD', name: 'Purple 300' }, { hex: '#A78BFA', name: 'Purple 400' },
    { hex: '#BFDBFE', name: 'Blue' }, { hex: '#93C5FD', name: 'Blue 300' }, { hex: '#60A5FA', name: 'Blue 400' },
    { hex: '#BAE6FD', name: 'Sky' }, { hex: '#7DD3FC', name: 'Sky 300' }, { hex: '#38BDF8', name: 'Sky 400' },
    { hex: '#A5F3FC', name: 'Cyan' }, { hex: '#67E8F9', name: 'Cyan 300' }, { hex: '#22D3EE', name: 'Cyan 400' },
    { hex: '#99F6E4', name: 'Teal' }, { hex: '#5EEAD4', name: 'Teal 300' }, { hex: '#2DD4BF', name: 'Teal 400' },
    { hex: '#BBF7D0', name: 'Green' }, { hex: '#86EFAC', name: 'Green 300' }, { hex: '#4ADE80', name: 'Green 400' },
    { hex: '#D9F99D', name: 'Lime' }, { hex: '#BEF264', name: 'Lime 300' }, { hex: '#A3E635', name: 'Lime 400' },
    { hex: '#E5E7EB', name: 'Gray' }, { hex: '#D1D5DB', name: 'Gray 300' }, { hex: '#9CA3AF', name: 'Gray 400' }
  ];

  const fontSizes = Array.from({ length: 33 }, (_, i) => i + 8);
  const fontFamilies = [
    { value: 'serif', name: 'Serif' }, { value: 'Georgia, serif', name: 'Georgia' },
    { value: '"Times New Roman", serif', name: 'Times New Roman' },
    { value: 'sans-serif', name: 'Sans Serif' }, { value: 'Arial, sans-serif', name: 'Arial' },
    { value: 'Helvetica, sans-serif', name: 'Helvetica' }, { value: 'Verdana, sans-serif', name: 'Verdana' },
    { value: 'Tahoma, sans-serif', name: 'Tahoma' }, { value: '"Trebuchet MS", sans-serif', name: 'Trebuchet MS' },
    { value: '"Segoe UI", sans-serif', name: 'Segoe UI' }, { value: 'monospace', name: 'Monospace' },
    { value: '"Courier New", monospace', name: 'Courier New' }, { value: 'Monaco, monospace', name: 'Monaco' },
    { value: 'cursive', name: 'Cursive' }, { value: '"Comic Sans MS", cursive', name: 'Comic Sans' },
    { value: '"Brush Script MT", cursive', name: 'Brush Script' }, { value: 'Garamond, serif', name: 'Garamond' },
    { value: '"Palatino Linotype", serif', name: 'Palatino' }, { value: '"Book Antiqua", serif', name: 'Book Antiqua' },
    { value: 'Impact, sans-serif', name: 'Impact' }
  ];

  const bulletStyles = [
    { type: 'disc', icon: Circle, label: 'Disc', preview: '●' },
    { type: 'circle', icon: Circle, label: 'Circle', preview: '○' },
    { type: 'square', icon: Square, label: 'Square', preview: '■' },
    { type: 'none', icon: Minus, label: 'None', preview: '−' },
  ];

  const numberStyles = [
    { type: 'decimal', icon: ListOrdered, label: '1, 2, 3', preview: '1.' },
    { type: 'lower-alpha', icon: ListOrdered, label: 'a, b, c', preview: 'a.' },
    { type: 'upper-alpha', icon: ListOrdered, label: 'A, B, C', preview: 'A.' },
    { type: 'lower-roman', icon: ListOrdered, label: 'i, ii, iii', preview: 'i.' },
    { type: 'upper-roman', icon: ListOrdered, label: 'I, II, III', preview: 'I.' },
  ];

  return (
    <div
      className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      data-block-index={index}
    >
      <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
        <BlockToolbar
          onDelete={() => onDelete(index)}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onMoveToTop={() => onMoveToTop(index)}
          onMoveToBottom={() => onMoveToBottom(index)}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>

      {showFormatBar && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 p-2.5 bg-white rounded-xl shadow-2xl border border-slate-200 z-[90]">
          {/* Undo/Redo */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <button
              onMouseDown={(e)=>{e.preventDefault();handleUndo();}}
              disabled={undoStack.length === 0}
              className="p-2 rounded-lg hover:bg-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed group"
              title="Undo (Ctrl+Z)"
              type="button"
            >
              <RotateCcw size={16} className="text-slate-600 group-hover:text-slate-900" />
            </button>
            <button
              onMouseDown={(e)=>{e.preventDefault();handleRedo();}}
              disabled={redoStack.length === 0}
              className="p-2 rounded-lg hover:bg-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed group"
              title="Redo (Ctrl+Y)"
              type="button"
            >
              <RotateCw size={16} className="text-slate-600 group-hover:text-slate-900" />
            </button>
          </div>

          {/* Bold / Italic / Underline / Strike */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <button onMouseDown={(e)=>{e.preventDefault();execCommand('bold');}} className="p-2 rounded-lg hover:bg-slate-100 transition group" title="Bold (Ctrl+B)" type="button">
              <span className="font-bold text-slate-600 group-hover:text-slate-900">B</span>
            </button>
            <button onMouseDown={(e)=>{e.preventDefault();execCommand('italic');}} className="p-2 rounded-lg hover:bg-slate-100 transition group" title="Italic (Ctrl+I)" type="button">
              <span className="italic text-slate-600 group-hover:text-slate-900">I</span>
            </button>
            <button onMouseDown={(e)=>{e.preventDefault();execCommand('underline');}} className="p-2 rounded-lg hover:bg-slate-100 transition group" title="Underline (Ctrl+U)" type="button">
              <span className="underline text-slate-600 group-hover:text-slate-900">U</span>
            </button>
            <button onMouseDown={(e)=>{e.preventDefault();execCommand('strikeThrough');}} className="p-2 rounded-lg hover:bg-slate-100 transition group" title="Strikethrough" type="button">
              <span className="line-through text-slate-600 group-hover:text-slate-900">S</span>
            </button>
          </div>

          {/* Alignment */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <button onMouseDown={(e)=>{e.preventDefault();execCommand('justifyLeft');}} className="p-2 rounded-lg hover:bg-slate-100 transition group" title="Align Left" type="button">
              <AlignLeft size={16} className="text-slate-600 group-hover:text-slate-900" />
            </button>
            <button onMouseDown={(e)=>{e.preventDefault();execCommand('justifyCenter');}} className="p-2 rounded-lg hover:bg-slate-100 transition group" title="Align Center" type="button">
              <AlignCenter size={16} className="text-slate-600 group-hover:text-slate-900" />
            </button>
            <button onMouseDown={(e)=>{e.preventDefault();execCommand('justifyRight');}} className="p-2 rounded-lg hover:bg-slate-100 transition group" title="Align Right" type="button">
              <AlignRight size={16} className="text-slate-600 group-hover:text-slate-900" />
            </button>
            <button onMouseDown={(e)=>{e.preventDefault();execCommand('justifyFull');}} className="p-2 rounded-lg hover:bg-slate-100 transition group" title="Justify" type="button">
              <AlignJustify size={16} className="text-slate-600 group-hover:text-slate-900" />
            </button>
          </div>

          {/* Enhanced Lists with Styles */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <div className="relative" ref={listStyleMenuRef}>
              <button
                onMouseDown={(e)=>{e.preventDefault();setShowListStyleMenu(!showListStyleMenu);}}
                className="p-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-1 group"
                title="Bullet List Styles"
                type="button"
              >
                <List size={16} className="text-slate-600 group-hover:text-slate-900" />
                <ChevronDownIcon size={12} className="text-slate-400" />
              </button>

              {showListStyleMenu && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-[110] min-w-[200px]">
                  <div className="text-xs font-semibold text-slate-500 mb-2 px-2">Bullet Styles</div>
                  {bulletStyles.map((style) => (
                    <button
                      key={style.type}
                      onMouseDown={(e) => { e.preventDefault(); applyListStyle(style.type); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition text-left group"
                      type="button"
                    >
                      <span className="text-sm font-bold text-slate-600 w-5 flex items-center justify-center">{style.preview}</span>
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">{style.label}</span>
                    </button>
                  ))}
                  <div className="border-t border-slate-200 my-2" />
                  <div className="px-2 py-1 text-xs text-slate-400">Press Tab to indent</div>
                </div>
              )}
            </div>

            <div className="relative" ref={numberStyleMenuRef}>
              <button
                onMouseDown={(e)=>{e.preventDefault();setShowNumberStyleMenu(!showNumberStyleMenu);}}
                className="p-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-1 group"
                title="Numbered List Styles"
                type="button"
              >
                <ListOrdered size={16} className="text-slate-600 group-hover:text-slate-900" />
                <ChevronDownIcon size={12} className="text-slate-400" />
              </button>

              {showNumberStyleMenu && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-[110] min-w-[200px]">
                  <div className="text-xs font-semibold text-slate-500 mb-2 px-2">Number Styles</div>
                  {numberStyles.map((style) => (
                    <button
                      key={style.type}
                      onMouseDown={(e) => { e.preventDefault(); applyNumberStyle(style.type); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition text-left group"
                      type="button"
                    >
                      <span className="text-sm font-bold text-slate-600 w-5 flex items-center justify-center">{style.preview}</span>
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">{style.label}</span>
                    </button>
                  ))}
                  <div className="border-t border-slate-200 my-2" />
                  <div className="px-2 py-1 text-xs text-slate-400">Press Tab to indent</div>
                </div>
              )}
            </div>
          </div>

          {/* Text color */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker); }}
              className="p-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-1 group"
              title="Text Color"
              type="button"
            >
              <div className="flex items-center">
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">A</span>
                <div className="w-3 h-0.5 bg-blue-600 ml-0.5"></div>
              </div>
            </button>
            {showColorPicker && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-[100] min-w-[280px]">
                <div className="text-xs font-semibold text-slate-500 mb-2 px-1">Text Color</div>
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.hex}
                      onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', color.hex); setShowColorPicker(false); }}
                      className="w-9 h-9 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:scale-110 transition-all shadow-sm hover:shadow-md"
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight color */}
          <div className="relative" ref={highlightPickerRef}>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowHighlightPicker(!showHighlightPicker); }}
              className="p-2 rounded-lg hover:bg-slate-100 transition group"
              title="Highlight"
              type="button"
            >
              <div className="relative">
                <Type size={16} className="text-slate-600 group-hover:text-slate-900" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-300 rounded"></div>
              </div>
            </button>
            {showHighlightPicker && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-[100] min-w-[320px]">
                <div className="text-xs font-semibold text-slate-500 mb-2 px-1">Highlight</div>
                <div className="grid grid-cols-6 gap-2">
                  {highlightColors.map((color) => (
                    <button
                      key={color.hex}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (color.hex === 'transparent') {
                          document.execCommand('removeFormat', false, null);
                          document.execCommand('backColor', false, 'transparent');
                        } else {
                          execCommand('backColor', color.hex);
                        }
                        setShowHighlightPicker(false);
                      }}
                      className={`w-9 h-9 rounded-lg border-2 ${color.hex === 'transparent' ? 'border-slate-400 border-dashed' : 'border-slate-200'} hover:border-slate-400 hover:scale-110 transition-all shadow-sm hover:shadow-md ${color.hex === 'transparent' ? 'bg-white relative' : ''}`}
                      style={color.hex !== 'transparent' ? { backgroundColor: color.hex } : {}}
                      title={color.name}
                      type="button"
                    >
                      {color.hex === 'transparent' && (
                        <svg className="w-full h-full text-slate-400 p-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Font Family */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <select
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => { execCommand('fontName', e.target.value); }}
              className="text-sm px-2 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] bg-white"
              defaultValue="serif"
            >
              {fontFamilies.map(font => (
                <option key={font.value} value={font.value}>{font.name}</option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <select
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const size = parseInt(e.target.value);
                const fontSize = size <= 10 ? '1' : size <= 13 ? '2' : size <= 16 ? '3' : size <= 18 ? '4' : size <= 24 ? '5' : size <= 32 ? '6' : '7';
                execCommand('fontSize', fontSize);
              }}
              className="text-sm px-2 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[70px] bg-white"
              defaultValue="14"
            >
              {fontSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* INSERT DROPDOWN (new) */}
          <div className="relative" ref={insertMenuRef}>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowInsertMenu(!showInsertMenu); }}
              className="p-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-1 group"
              title="Insert arrows, emojis, symbols"
              type="button"
            >
              <Smile size={16} className="text-slate-600 group-hover:text-slate-900" />
              <ChevronDownIcon size={12} className="text-slate-400" />
            </button>

            {showInsertMenu && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 z-[120] min-w-[340px]">
                {/* Tabs */}
                <div className="flex items-center justify-between px-2 pt-2">
                  <div className="inline-flex bg-slate-100 rounded-lg p-1">
                    <button
                      type="button"
                      onMouseDown={(e)=>{e.preventDefault();setInsertTab("arrows");}}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${insertTab==="arrows" ? "bg-white shadow border border-slate-200 text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Arrows
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e)=>{e.preventDefault();setInsertTab("emojis");}}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${insertTab==="emojis" ? "bg-white shadow border border-slate-200 text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Emojis
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e)=>{e.preventDefault();setInsertTab("symbols");}}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${insertTab==="symbols" ? "bg-white shadow border border-slate-200 text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Tools
                    </button>
                  </div>
                  <div className="pr-2 pl-3 py-1 text-[11px] text-slate-400 flex items-center gap-1">
                    <Wand2 size={12} />
                    Click to insert at cursor
                  </div>
                </div>

                {/* Panels */}
                <div className="p-3">
                  {insertTab === "arrows" && (
                    <div className="grid grid-cols-10 gap-2">
                      {arrows.map((a,i)=>(
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e)=>{e.preventDefault(); insertAtCaret(a); setShowInsertMenu(false);}}
                          className="h-9 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow text-lg leading-none flex items-center justify-center"
                          title="Insert arrow"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}

                  {insertTab === "emojis" && (
                    <div className="grid grid-cols-10 gap-2">
                      {emojis.map((ej,i)=>(
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e)=>{e.preventDefault(); insertAtCaret(ej); setShowInsertMenu(false);}}
                          className="h-9 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow text-lg leading-none flex items-center justify-center"
                          title="Insert emoji"
                        >
                          {ej}
                        </button>
                      ))}
                    </div>
                  )}

                  {insertTab === "symbols" && (
                    <div className="grid grid-cols-10 gap-2">
                      {symbols.map((s,i)=>(
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e)=>{e.preventDefault(); insertAtCaret(s); setShowInsertMenu(false);}}
                          className="h-9 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow text-lg leading-none flex items-center justify-center"
                          title="Insert symbol"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* END INSERT DROPDOWN */}
        </div>
      )}

      {/* Word Count */}
      {showFormatBar && wordCount > 0 && (
        <div className="mb-2 text-xs text-slate-400 px-1">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      )}

      <style>{`
        [contenteditable] ul,
        [contenteditable] ol {
          padding-left: 2.5rem;
          margin: 0.75rem 0;
        }

        [contenteditable] ul { list-style-type: disc; }
        [contenteditable] ul ul { list-style-type: circle; margin: 0.25rem 0; }
        [contenteditable] ul ul ul { list-style-type: square; margin: 0.25rem 0; }

        [contenteditable] ol { list-style-type: decimal; }
        [contenteditable] ol ol { list-style-type: lower-alpha; margin: 0.25rem 0; }
        [contenteditable] ol ol ol { list-style-type: lower-roman; margin: 0.25rem 0; }

        [contenteditable] li { margin: 0.5rem 0; padding-left: 0.5rem; line-height: 1.6; }
        [contenteditable] li::marker { color: inherit; font-weight: 600; }

        [contenteditable] p { margin: 0.75rem 0; line-height: 1.7; }
        [contenteditable] p:first-child { margin-top: 0; }
        [contenteditable] p:last-child { margin-bottom: 0; }

        [contenteditable] code {
          background-color: rgba(135,131,120,.15);
          color: #eb5757;
          border-radius: 4px;
          font-size: 90%;
          padding: 0.2em 0.4em;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        }

        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.2s;
        }
        [contenteditable] a:hover { color: #1d4ed8; }

        [contenteditable] ul.custom-list, [contenteditable] ol.custom-list {
          list-style-position: outside;
        }
      `}</style>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowFormatBar(true)}
        onBlur={(e) => {
          const toolbar = e.currentTarget.parentElement?.querySelector('.shadow-2xl');
          if (!toolbar?.contains(e.relatedTarget)) {
            setTimeout(() => setShowFormatBar(false), 150);
          }
        }}
        data-placeholder="Start typing... Use Tab to indent lists, Ctrl+Z to undo"
        className="w-full text-lg leading-relaxed focus:outline-none bg-transparent hover:bg-slate-50/50 rounded-lg px-4 py-3 -mx-4 -my-3 transition focus:bg-slate-50/50 font-normal min-h-[60px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"
        style={{ wordBreak: 'break-word', color: '#000000', fontFamily: 'serif', fontSize: '16px' }}
      />
    </div>
  );
}

/* ---------- Image Block ---------- */
function ImageBlock({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom, canMoveUp, canMoveDown, onUpload, isDragging }) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(block.value || "");
  const [imageError, setImageError] = useState(false); // <- fixed (removed invisible char)
  const [dragActive, setDragActive] = useState(false);
  const [imageSize, setImageSize] = useState(block.size || "full");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setImageUrl(block.value || "");
    setImageSize(block.size || "full");
    setImageError(false);
  }, [block.value, block.size]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
    setImageError(false);
    onUpdate(index, { ...block, value: localUrl });

    setUploading(true);
    try {
      const uploadedUrl = await onUpload(file);
      setImageUrl(uploadedUrl);
      onUpdate(index, { ...block, value: uploadedUrl });
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
      setImageUrl("");
      onUpdate(index, { ...block, value: "" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleEdit = () => fileInputRef.current?.click();
  const handleImageError = () => setImageError(true);

  const handleSizeChange = (size) => {
    setImageSize(size);
    onUpdate(index, { ...block, size });
  };

  const sizeClasses = { small: "max-w-md", medium: "max-w-2xl", large: "max-w-4xl", full: "max-w-full" };

  if (!imageUrl || imageError) {
    return (
      <div className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`} data-block-index={index}>
        <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
          <BlockToolbar
            onDelete={() => onDelete(index)}
            onMoveUp={() => onMoveUp(index)}
            onMoveDown={() => onMoveDown(index)}
            onMoveToTop={() => onMoveToTop(index)}
            onMoveToBottom={() => onMoveToBottom(index)}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
          />
        </div>
        <div
          className={`border-2 border-dashed ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50'} rounded-2xl p-16 text-center hover:border-blue-400 hover:shadow-lg transition-all`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e.target.files?.[0])} className="hidden" />
          <div className="flex flex-col items-center gap-4">
            <div className="p-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg">
              <Upload size={32} className="text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-700 mb-1">Upload an Image</h4>
              <p className="text-sm text-slate-500">Drag and drop or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF up to 10MB</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Choose Image"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`} data-block-index={index}>
      <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
        <BlockToolbar
          onDelete={() => onDelete(index)}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onMoveToTop={() => onMoveToTop(index)}
          onMoveToBottom={() => onMoveToBottom(index)}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>
      <div className={`mx-auto ${sizeClasses[imageSize]}`}>
        <div className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all relative ring-1 ring-slate-200 group/img">
          <img src={imageUrl} alt="" className="w-full" onError={handleImageError} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition" />
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-all">
            <button onClick={handleEdit} className="px-4 py-2 bg-white/95 backdrop-blur-sm rounded-lg text-sm font-semibold text-slate-700 shadow-lg hover:shadow-xl hover:bg-white">
              Change
            </button>
          </div>
          <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-all">
            {['small','medium','large','full'].map(size => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  imageSize === size ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/95 text-slate-700 hover:bg-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm font-medium text-slate-700">Uploading...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Code Block ---------- */
function CodeBlock({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom, canMoveUp, canMoveDown, isDragging }) {
  const [value, setValue] = useState(block.value || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setValue(block.value || ""); }, [block.value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    onUpdate(index, { ...block, value: newValue });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languages = [
    "javascript","typescript","python","java","csharp","cpp","c",
    "ruby","go","rust","php","swift","kotlin","scala",
    "html","css","sql","bash","powershell","json","yaml","xml"
  ];

  const themes = {
    dark:     { name: "Dark",     bg: "bg-slate-900",  headerBg: "bg-gradient-to-r from-slate-800 to-slate-700", text: "text-slate-100", border: "border-slate-700" },
    monokai:  { name: "Monokai",  bg: "bg-[#272822]", headerBg: "bg-gradient-to-r from-[#1e1f1c] to-[#272822]", text: "text-[#f8f8f2]", border: "border-[#3e3d32]" },
    github:   { name: "GitHub",   bg: "bg-[#f6f8fa]", headerBg: "bg-gradient-to-r from-[#e1e4e8] to-[#f6f8fa]", text: "text-[#24292e]", border: "border-[#d1d5da]" },
    dracula:  { name: "Dracula",  bg: "bg-[#282a36]", headerBg: "bg-gradient-to-r from-[#21222c] to-[#282a36]", text: "text-[#f8f8f2]", border: "border-[#44475a]" },
    nord:     { name: "Nord",     bg: "bg-[#2e3440]", headerBg: "bg-gradient-to-r from-[#3b4252] to-[#2e3440]", text: "text-[#d8dee9]", border: "border-[#4c566a]" },
  };

  const currentLang = block.language || "javascript";
  const currentTheme = themes[block.theme || "dark"];

  return (
    <div className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`} data-block-index={index}>
      <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
        <BlockToolbar
          onDelete={() => onDelete(index)}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onMoveToTop={() => onMoveToTop(index)}
          onMoveToBottom={() => onMoveToBottom(index)}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>

      <div className={`rounded-2xl overflow-hidden ${currentTheme.bg} shadow-xl border ${currentTheme.border}`}>
        <div className={`px-5 py-3 ${currentTheme.headerBg} flex items-center justify-between border-b ${currentTheme.border}`}>
          <div className="flex items-center gap-3">
            <select
              value={currentLang}
              onChange={(e) => onUpdate(index, { ...block, language: e.target.value })}
              className={`text-sm bg-slate-700/50 rounded-lg px-4 py-2 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold cursor-pointer hover:bg-slate-700 transition ${currentTheme.text} min-w-[140px]`}
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
              ))}
            </select>
            <select
              value={block.theme || "dark"}
              onChange={(e) => onUpdate(index, { ...block, theme: e.target.value })}
              className={`text-sm bg-slate-700/50 rounded-lg px-4 py-2 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-slate-700 transition ${currentTheme.text}`}
            >
              {Object.entries(themes).map(([key, theme]) => (
                <option key={key} value={key}>{theme.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition bg-slate-700/50 hover:bg-slate-600 rounded-lg font-medium ${currentTheme.text}`}
          >
            {copied ? (
              <>
                <Check size={16} className="text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
        </div>

        <textarea
          value={value}
          onChange={handleChange}
          placeholder="// Write your code here..."
          className={`w-full h-64 p-5 ${currentTheme.bg} ${currentTheme.text} font-mono text-sm leading-relaxed focus:outline-none resize-none placeholder-slate-500`}
          spellCheck="false"
        />
      </div>
    </div>
  );
}

/* ---------- Main Editor ---------- */
export default function BIMEditor() {
  const { owner } = useOwnerMode();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const [blocks, setBlocks] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const addButtonRef = useRef(null);

  // Load existing post (edit mode)
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setBusy(true);
        const data = await fetchJSON(`/api/bim/${encodeURIComponent(id)}`);
        const loadedBlocks = Array.isArray(data?.blocks) ? data.blocks : [];
        const blocksWithIds = loadedBlocks.map((block, idx) => ({
          ...block,
          id: block.id || `${Date.now()}-${idx}`,
        }));
        setBlocks(blocksWithIds);
        setErr("");
      } catch (e) {
        setErr(e?.message || "Failed to load");
      } finally {
        setBusy(false);
      }
    })();
  }, [id, isEdit]);

  // Basic drag-to-reorder (using a handle)
  useEffect(() => {
    const handleDragStart = (e) => {
      const dragHandle = e.target.closest?.('.drag-handle');
      if (!dragHandle) return;
      const blockContainer = dragHandle.closest?.('[data-block-index]');
      if (!blockContainer) return;
      const index = parseInt(blockContainer.dataset.blockIndex);
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", blockContainer.innerHTML);
      setTimeout(() => { blockContainer.style.opacity = "0.4"; }, 0);
    };

    const handleDragEnd = (e) => {
      const blockContainer = e.target.closest?.('[data-block-index]');
      if (blockContainer) blockContainer.style.opacity = "1";
      setDraggedIndex(null);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      const blockContainer = e.target.closest?.('[data-block-index]');
      if (!blockContainer || draggedIndex === null) return;
      const index = parseInt(blockContainer.dataset.blockIndex);
      if (draggedIndex === index) return;

      const newBlocks = [...blocks];
      const draggedBlock = newBlocks[draggedIndex];

      // Avoid placing an H1 immediately adjacent to another H1
      if (draggedBlock?.type === "h1" && newBlocks[index]?.type === "h1") return;

      newBlocks.splice(draggedIndex, 1);
      newBlocks.splice(index, 0, draggedBlock);
      setBlocks(newBlocks);
      setDraggedIndex(index);
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('dragover', handleDragOver);
    };
  }, [blocks, draggedIndex]);

  /* ---------- Block helpers ---------- */
  const addBlock = (type) => {
    const newBlock = { type, value: "", id: Date.now() + Math.random() };
    if (type === "code") {
      newBlock.language = "javascript";
      newBlock.theme = "dark";
    }
    setBlocks((prev) => [...prev, newBlock]);
    setShowAddMenu(false);
  };

  const updateBlock = (index, updatedBlock) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = updatedBlock;
      return next;
    });
  };

  const deleteBlock = (index) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const findPreviousH1 = (index) => {
    for (let i = index - 1; i >= 0; i--) if (blocks[i].type === "h1") return i;
    return -1;
  };
  const findNextH1 = (index) => {
    for (let i = index + 1; i < blocks.length; i++) if (blocks[i].type === "h1") return i;
    return blocks.length;
  };

  const moveBlockUp = (index) => {
    if (index <= 0) return;
    if (blocks[index].type === "h1") {
      const prevH1Index = findPreviousH1(index);
      if (prevH1Index >= 0 && index - 1 === prevH1Index) return;
    }
    if (blocks[index - 1].type === "h1") return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const moveBlockDown = (index) => {
    if (index >= blocks.length - 1) return;
    if (blocks[index].type === "h1" && blocks[index + 1].type === "h1") return;
    if (blocks[index + 1].type === "h1") return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const moveBlockToTop = (index) => {
    if (index <= 0) return;
    const newBlocks = [...blocks];
    const movedBlock = newBlocks[index];
    const targetIndex =
      movedBlock.type === "h1" ? 0 : (findPreviousH1(index) >= 0 ? findPreviousH1(index) + 1 : 0);
    if (targetIndex === index) return;
    newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);
    setBlocks(newBlocks);
  };

  const moveBlockToBottom = (index) => {
    if (index >= blocks.length - 1) return;
    const newBlocks = [...blocks];
    const movedBlock = newBlocks[index];
    const targetIndex =
      movedBlock.type === "h1" ? blocks.length - 1 : findNextH1(index) - 1;
    if (targetIndex === index) return;
    newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);
    setBlocks(newBlocks);
  };

  /* ---------- Upload helper ---------- */
  const onUpload = async (file) => {
    await ensureOwnerToken();
    const formData = new FormData();
    formData.append("file", file);
    const data = await fetchJSON("/api/bim/upload-image", {
      method: "POST",
      headers: { ...ownerHeaders() },
      body: formData,
    });
    if (!data?.url) throw new Error("No URL returned");
    return data.url;
  };

  /* ---------- Save helpers ---------- */
  const saveWithMethod = async (method, url, payload) => {
    return fetchJSON(url, {
      method,
      headers: { "Content-Type": "application/json", ...ownerHeaders() },
      body: JSON.stringify(payload),
    });
  };

  const handleSave = async () => {
    try {
      await ensureOwnerToken();
    } catch (e) {
      alert(e.message || "Authentication failed");
      return;
    }

    if (blocks.length === 0) {
      alert("Please add at least one block");
      return;
    }

    const rawTitle = blocks.find(b => b.type === "h1" || b.type === "h2")?.value || "";
    const title = (rawTitle || "").trim() || "Untitled";

    const langMap = {
      javascript: "js", typescript: "ts", python: "py", html: "html", css: "css",
      java: "java", csharp: "cs", cpp: "cpp", c: "c", ruby: "rb", go: "go",
      rust: "rs", php: "php", swift: "swift", kotlin: "kt", scala: "scala",
      sql: "sql", bash: "sh", powershell: "ps1", json: "json", yaml: "yaml", xml: "xml",
    };

    const normalizedBlocks = blocks.map((b) => {
      const base = { type: b.type, value: (b.value ?? "").toString() };
      if (b.type === "code") {
        const uiLang = (b.language || "javascript").toLowerCase();
        base.language = langMap[uiLang] || "js";
        base.theme = b.theme || "dark";
      }
      if (b.type === "image" && b.size) base.size = b.size;
      return base;
    });

    const payload = { title, blocks: normalizedBlocks };

    try {
      setBusy(true);
      if (isEdit) {
        const url = `/api/bim/${encodeURIComponent(id)}`;
        try {
          await saveWithMethod("PUT", url, payload);
        } catch (err) {
          // Retry with token refresh and PATCH fallback
          if (/403/.test(String(err))) {
            await ensureOwnerToken();
            try {
              await saveWithMethod("PUT", url, payload);
            } catch {
              await saveWithMethod("PATCH", url, payload);
            }
          } else {
            await saveWithMethod("PATCH", url, payload);
          }
        }
      } else {
        await saveWithMethod("POST", "/api/bim", payload);
      }
      nav("/bim", { replace: true });
    } catch (e) {
      alert(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
          <button
            onClick={() => nav("/bim")}
            className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all font-semibold"
          >
            <ArrowLeft size={20} />
            Back to Posts
          </button>

          <button
            onClick={handleSave}
            disabled={!owner || busy || blocks.length === 0}
            className="flex items-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 transition-all text-sm font-bold shadow-xl shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-purple-500/40"
          >
            <Save size={20} />
            {busy ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 pt-36 pb-32">
        {err && (
          <div className="mb-6 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {err}
          </div>
        )}

        {blocks.length === 0 ? (
          <div className="text-center py-32">
            <div className="mb-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shadow-lg">
                <Type size={36} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                Start Creating Your Content
              </h3>
              <p className="text-slate-500">Add your first block to begin writing</p>
            </div>

            <div className="relative inline-block" ref={addButtonRef}>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all text-base font-semibold text-slate-600 hover:text-purple-700 shadow-lg hover:shadow-xl"
              >
                <Plus size={22} />
                Add Your First Block
              </button>
              {showAddMenu && (
                <AddBlockMenu onAdd={addBlock} onClose={() => setShowAddMenu(false)} />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pl-20">
            {blocks.map((block, index) => {
              let canMoveUp = index > 0;
              let canMoveDown = index < blocks.length - 1;

              if (canMoveUp && blocks[index - 1].type === "h1") canMoveUp = false;
              if (canMoveDown && blocks[index + 1].type === "h1") canMoveDown = false;

              if (block.type === "h1" && canMoveUp) {
                for (let i = index - 1; i >= 0; i--) {
                  if (blocks[i].type === "h1" && i === index - 1) {
                    canMoveUp = false;
                    break;
                  }
                }
              }

              const blockProps = {
                block,
                index,
                onUpdate: updateBlock,
                onDelete: deleteBlock,
                onMoveUp: moveBlockUp,
                onMoveDown: moveBlockDown,
                onMoveToTop: moveBlockToTop,
                onMoveToBottom: moveBlockToBottom,
                canMoveUp,
                canMoveDown,
                isDragging: draggedIndex === index,
              };

              return (
                <div key={block.id || index}>
                  {(block.type === "h1" || block.type === "h2") ? (
                    <HeadingBlock {...blockProps} />
                  ) : block.type === "text" ? (
                    <TextBlock {...blockProps} />
                  ) : block.type === "image" ? (
                    <ImageBlock {...blockProps} onUpload={onUpload} />
                  ) : block.type === "code" ? (
                    <CodeBlock {...blockProps} />
                  ) : null}
                </div>
              );
            })}

            {/* Add more blocks at the bottom */}
            <div className="relative pt-6" ref={addButtonRef}>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-slate-100 hover:to-transparent transition-all text-sm text-slate-400 hover:text-slate-700 font-semibold border border-dashed border-transparent hover:border-slate-300"
              >
                <Plus size={18} />
                Add block
              </button>
              {showAddMenu && (
                <AddBlockMenu onAdd={addBlock} onClose={() => setShowAddMenu(false)} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
