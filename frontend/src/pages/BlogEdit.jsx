import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getPosts as apiGetPosts,
  getPost as apiGetPost,
  createPost as apiCreatePost,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
} from "../lib/api.js";

/* ----------------------------- Local drafts ----------------------------- */
const LS_KEY = "localBlogs";

const readLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocal = (rows) => localStorage.setItem(LS_KEY, JSON.stringify(rows));

const getLocalByIdOrSlug = (idOrSlug) => {
  const all = readLocal();
  const needle = String(idOrSlug || "").toLowerCase();
  return (
    all.find((p) => String(p.id || "").toLowerCase() === needle) ||
    all.find((p) => String(p.slug || "").toLowerCase() === needle)
  );
};

const upsertLocal = (row) => {
  const all = readLocal();
  const idx = all.findIndex(
    (p) => String(p.id) === String(row.id) || (row.slug && String(p.slug) === String(row.slug))
  );
  if (idx >= 0) all[idx] = row;
  else all.push(row);
  writeLocal(all);
  return row;
};

const removeLocalByIdOrSlug = (idOrSlug) => {
  const needle = String(idOrSlug || "").toLowerCase();
  const all = readLocal();
  writeLocal(
    all.filter(
      (p) =>
        String(p.id || "").toLowerCase() !== needle &&
        String(p.slug || "").toLowerCase() !== needle
    )
  );
  return true;
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
  /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex || "") ? hex : "#4f46e5";

const isGuid = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s || "")
  );

const pickBodyHtml = (src) => {
  if (!src) return "";
  const cands = ["bodyHtml", "bodyHTML", "body_html", "content_html", "content", "body", "html"];
  for (const k of cands) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) return v;
    if (v && typeof v === "object") {
      if (typeof v.html === "string" && v.html.trim()) return v.html;
      if (typeof v.content === "string" && v.content.trim()) return v.content;
    }
  }
  return "";
};

// Enhanced sanitization that preserves formatting
function sanitizeHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");

    // Remove mark tags but preserve content
    doc.querySelectorAll("mark").forEach((m) => {
      const span = doc.createElement("span");
      span.innerHTML = m.innerHTML;
      m.replaceWith(span);
    });

    // Convert <font color> to <span style="color:...">
    doc.querySelectorAll("font[color]").forEach((f) => {
      const span = doc.createElement("span");
      span.style.color = f.getAttribute("color");
      span.innerHTML = f.innerHTML;
      f.replaceWith(span);
    });

    const allowedAlign = new Set(["left", "right", "center", "justify"]);
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    let el = walker.currentNode;
    
    while (el) {
      if (el.nodeType === 1) {
        const node = el;
        const keepColor = node.style?.color;
        const keepAlign = node.style?.textAlign;
        const keepBold = node.style?.fontWeight;
        const keepItalic = node.style?.fontStyle;
        const keepUnderline = node.style?.textDecoration;
        const keepFontFamily = node.style?.fontFamily;
        const keepFontSize = node.style?.fontSize;
        
        // Clear style but preserve formatting
        node.removeAttribute("style");
        
        if (keepColor && keepColor !== 'inherit') node.style.color = keepColor;
        if (keepAlign && allowedAlign.has(keepAlign)) node.style.textAlign = keepAlign;
        if (keepBold) node.style.fontWeight = keepBold;
        if (keepItalic) node.style.fontStyle = keepItalic;
        if (keepUnderline) node.style.textDecoration = keepUnderline;
        if (keepFontFamily) node.style.fontFamily = keepFontFamily;
        if (keepFontSize) node.style.fontSize = keepFontSize;
        
        node.removeAttribute("dir");
      }
      el = walker.nextNode();
    }
    
    return doc.body.innerHTML;
  } catch {
    return html || "";
  }
}

const stripHtml = (html) => {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
};

// Enhanced caret and selection utilities
const saveSelectionRange = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0);
  return {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset,
    collapsed: range.collapsed
  };
};

const restoreSelectionRange = (savedRange, element) => {
  if (!savedRange || !element) return false;
  
  try {
    const selection = window.getSelection();
    const range = document.createRange();
    
    // Ensure containers are still valid and within the element
    if (!element.contains(savedRange.startContainer) || 
        !element.contains(savedRange.endContainer)) {
      return false;
    }
    
    range.setStart(savedRange.startContainer, savedRange.startOffset);
    range.setEnd(savedRange.endContainer, savedRange.endOffset);
    
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch {
    return false;
  }
};

/* ----------------------------- Enhanced Icons ----------------------------- */
const Icons = {
  Back: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Save: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V7a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2z" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 21V13H7v8" />
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M7 3v4h8" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  Magic: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 5l7 7-9 9H5v-7z" />
      <path d="M6 11l7 7" />
    </svg>
  ),
  Bold: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M7 5h6a3 3 0 010 6H7zM7 11h7a3 3 0 110 6H7z" strokeWidth="2" />
    </svg>
  ),
  Italic: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="10" y1="4" x2="20" y2="4" strokeWidth="2" />
      <line x1="4" y1="20" x2="14" y2="20" strokeWidth="2" />
      <line x1="12" y1="4" x2="8" y2="20" strokeWidth="2" />
    </svg>
  ),
  Underline: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M6 3v6a6 6 0 0012 0V3" strokeWidth="2" />
      <line x1="4" y1="21" x2="20" y2="21" strokeWidth="2" />
    </svg>
  ),
  Strikethrough: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6" strokeWidth="2" />
      <line x1="4" y1="12" x2="20" y2="12" strokeWidth="2" />
    </svg>
  ),
  H: ({ n = 1 }) => <span className="text-xs font-bold">{`H${n}`}</span>,
  UL: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="5" cy="6" r="1.5" />
      <line x1="9" y1="6" x2="21" y2="6" />
      <circle cx="5" cy="12" r="1.5" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <circle cx="5" cy="18" r="1.5" />
      <line x1="9" y1="18" x2="21" y2="18" />
    </svg>
  ),
  OL: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <text x="3" y="7" fontSize="8" fontFamily="monospace">1.</text>
      <line x1="9" y1="6" x2="21" y2="6" />
      <text x="3" y="13" fontSize="8" fontFamily="monospace">2.</text>
      <line x1="9" y1="12" x2="21" y2="12" />
      <text x="3" y="19" fontSize="8" fontFamily="monospace">3.</text>
      <line x1="9" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Quote: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" strokeWidth="2" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" strokeWidth="2" />
    </svg>
  ),
  Code: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="16,18 22,12 16,6" strokeWidth="2" />
      <polyline points="8,6 2,12 8,18" strokeWidth="2" />
    </svg>
  ),
  Link: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeWidth="2" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeWidth="2" />
    </svg>
  ),
  Image: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
      <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2" />
      <polyline points="21,15 16,10 5,21" strokeWidth="2" />
    </svg>
  ),
  Table: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
      <line x1="3" y1="9" x2="21" y2="9" strokeWidth="2" />
      <line x1="9" y1="21" x2="9" y2="9" strokeWidth="2" />
    </svg>
  ),
  AlignLeft: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="10" x2="14" y2="10" />
      <line x1="4" y1="14" x2="20" y2="14" />
      <line x1="4" y1="18" x2="12" y2="18" />
    </svg>
  ),
  AlignCenter: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="6" y1="6" x2="18" y2="6" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="6" y1="14" x2="18" y2="14" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  ),
  AlignRight: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="10" y1="10" x2="20" y2="10" />
      <line x1="4" y1="14" x2="20" y2="14" />
      <line x1="12" y1="18" x2="20" y2="18" />
    </svg>
  ),
  AlignJustify: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="4" y1="14" x2="20" y2="14" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  ),
  RemoveFormat: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M6 7h12M6 11h8M6 15h4" strokeWidth="2" />
      <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" />
    </svg>
  ),
  TextColor: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4L8 20" />
      <path d="M12 4l4 16" />
    </svg>
  ),
  Undo: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20a9 9 0 0 0-9-9H4" />
    </svg>
  ),
  Redo: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="15 4 20 9 15 14" />
      <path d="M4 20a9 9 0 0 1 9-9h7" />
    </svg>
  ),
  Expand: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="15,3 21,3 21,9" strokeWidth="2" />
      <polyline points="9,21 3,21 3,15" strokeWidth="2" />
      <line x1="21" y1="3" x2="14" y2="10" strokeWidth="2" />
      <line x1="3" y1="21" x2="10" y2="14" strokeWidth="2" />
    </svg>
  ),
  Compress: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="4,14 10,14 10,20" strokeWidth="2" />
      <polyline points="20,10 14,10 14,4" strokeWidth="2" />
      <line x1="14" y1="10" x2="21" y2="3" strokeWidth="2" />
      <line x1="3" y1="21" x2="10" y2="14" strokeWidth="2" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
    </svg>
  )
};

/* ----------------------------- Component ----------------------------- */
export default function BlogEdit() {
  const { id: routeId } = useParams();
  const nav = useNavigate();

  const [isEdit, setIsEdit] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serverId, setServerId] = useState(null);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [theme, setTheme] = useState({ fontFamily: "", basePx: 16, headingScale: 1.15 });

  const [editorHtml, setEditorHtml] = useState("");
  const [assignedOK, setAssignedOK] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const historyRef = useRef({ stack: [""], index: 0, inhibit: false });
  const autosaveTimer = useRef(null);
  const [showTextColor, setShowTextColor] = useState(false);

  // Enhanced cursor management
  const [isUpdating, setIsUpdating] = useState(false);

  // Prefer CSS inline for execCommand color
  useEffect(() => {
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch {}
  }, []);

  const presetAccent = [
    "#4f46e5", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#059669", 
    "#0ea5e9", "#2563eb", "#111827", "#f59e0b", "#ef4444", "#8b5cf6"
  ];

  const looksLocal = (s) => /^local-\d+$/i.test(String(s || ""));

  const loadFromApi = useCallback(async (needle) => {
    try {
      if (!needle || looksLocal(needle)) return null;
      let p = null;
      if (!isGuid(needle)) {
        try {
          p = await apiGetPost(needle);
        } catch {}
      }
      if (!p) {
        const list = await apiGetPosts({ page: 1, pageSize: 200 });
        const items = Array.isArray(list?.items) ? list.items : Array.isArray(list) ? list : [];
        const lower = String(needle).toLowerCase();
        p =
          items.find((x) => String(x.id || "").toLowerCase() === lower) ||
          items.find((x) => String(x.slug || "").toLowerCase() === lower) ||
          null;
      }
      if (!p) return null;
      const meta = p.meta || {};
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        tags: p.tags || [],
        color: p.color || meta.color || "#4f46e5",
        theme: p.theme || meta.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 },
        bodyHtml: pickBodyHtml(p),
        createdAt: p.createdAt || p.created_at || p.publishedAt || p.published_at,
        updatedAt: p.updatedAt || p.updated_at,
      };
    } catch {
      return null;
    }
  }, []);

  /* ----------------------------- Load ----------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setError("");
      setLoaded(false);

      if (routeId === "new") {
        const nowId = `local-${Date.now()}`;
        if (!mounted) return;
        setIsEdit(false);
        setServerId(null);
        setId(nowId);
        setTitle("");
        setSlug("");
        setTagsText("");
        setColor("#4f46e5");
        setTheme({ fontFamily: "", basePx: 16, headingScale: 1.15 });
        setEditorHtml("");
        historyRef.current = { stack: [""], index: 0, inhibit: false };
        setLoaded(true);
        return;
      }

      let post = await loadFromApi(routeId);
      if (!post) post = getLocalByIdOrSlug(routeId);
      if (!mounted) return;

      if (post) {
        setIsEdit(true);
        setServerId(post.id && isGuid(post.id) ? post.id : null);
        setId(post.id || routeId);
        setTitle(post.title || "");
        setSlug(post.slug || slugify(post.title || ""));
        setTagsText(Array.isArray(post.tags) ? post.tags.join(", ") : "");
        setColor(clampAccent(post.color || "#4f46e5"));
        setTheme({
          fontFamily: post.theme?.fontFamily || "",
          basePx: Number(post.theme?.basePx) || 16,
          headingScale: Number(post.theme?.headingScale) || 1.15,
        });
        const clean = sanitizeHtml(post.bodyHtml || "");
        setEditorHtml(clean);
        historyRef.current = { stack: [clean], index: 0, inhibit: false };
        setLoaded(true);
      } else {
        const nowId = `local-${Date.now()}`;
        setIsEdit(false);
        setServerId(null);
        setId(nowId);
        setTitle("");
        setSlug("");
        setTagsText("");
        setColor("#4f46e5");
        setTheme({ fontFamily: "", basePx: 16, headingScale: 1.15 });
        setEditorHtml("");
        historyRef.current = { stack: [""], index: 0, inhibit: false };
        setLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [routeId, loadFromApi]);

  useEffect(() => {
    if (isEdit && slug) return;
    setSlug(slugify(title || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, isEdit]);

  /* ----------------------------- Enhanced editor initialization ----------------------------- */
  useEffect(() => {
    if (editorRef.current && loaded && !isUpdating) {
      const currentHtml = editorHtml || "<p><em>Write your story…</em></p>";
      
      // Only update if content is significantly different
      if (editorRef.current.innerHTML !== currentHtml) {
        setIsUpdating(true);
        
        const savedSelection = saveSelectionRange();
        editorRef.current.innerHTML = currentHtml;
        
        // Try to restore selection, otherwise place caret at end
        if (!restoreSelectionRange(savedSelection, editorRef.current)) {
          placeCaretAtEnd(editorRef.current);
        }
        
        setIsUpdating(false);
      }
    }
  }, [loaded, editorHtml, isUpdating]);

  /* ----------------------------- Enhanced selection helpers ----------------------------- */
  const saveSelection = useCallback(() => {
    if (isUpdating || !editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    try {
      const range = selection.getRangeAt(0);
      // Only save if range is within our editor
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        selectionRef.current = range.cloneRange();
      }
    } catch {}
  }, [isUpdating]);

  const restoreSelection = useCallback(() => {
    if (isUpdating || !selectionRef.current || !editorRef.current) return;
    
    try {
      const selection = window.getSelection();
      if (editorRef.current.contains(selectionRef.current.commonAncestorContainer)) {
        selection.removeAllRanges();
        selection.addRange(selectionRef.current);
      }
    } catch {}
  }, [isUpdating]);

  // Enhanced selection tracking
  useEffect(() => {
    const onSelectionChange = () => {
      if (!isUpdating) {
        saveSelection();
      }
    };
    
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [saveSelection, isUpdating]);

  /* ----------------------------- Enhanced History (undo/redo) ----------------------------- */
  const pushHistory = useCallback(() => {
    if (!editorRef.current || isUpdating) return;
    
    const html = editorRef.current.innerHTML || "";
    const h = historyRef.current;
    
    if (h.inhibit || h.stack[h.index] === html) return;
    
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(html);
    if (h.stack.length > 50) {  // Limit history size
      h.stack.shift();
    } else {
      h.index++;
    }
    
    setEditorHtml(html);
  }, [isUpdating]);

  const placeCaretAtEnd = useCallback((el) => {
    if (!el || isUpdating) return;
    
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      
      selectionRef.current = range.cloneRange();
    } catch {}
  }, [isUpdating]);

  const undo = useCallback(() => {
    if (isUpdating) return;
    
    const h = historyRef.current;
    if (h.index <= 0) return;
    
    setIsUpdating(true);
    h.index--;
    h.inhibit = true;
    
    const html = h.stack[h.index];
    const savedSelection = saveSelectionRange();
    
    editorRef.current.innerHTML = html;
    setEditorHtml(html);
    
    if (!restoreSelectionRange(savedSelection, editorRef.current)) {
      placeCaretAtEnd(editorRef.current);
    }
    
    h.inhibit = false;
    setIsUpdating(false);
  }, [isUpdating, placeCaretAtEnd]);

  const redo = useCallback(() => {
    if (isUpdating) return;
    
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    
    setIsUpdating(true);
    h.index++;
    h.inhibit = true;
    
    const html = h.stack[h.index];
    const savedSelection = saveSelectionRange();
    
    editorRef.current.innerHTML = html;
    setEditorHtml(html);
    
    if (!restoreSelectionRange(savedSelection, editorRef.current)) {
      placeCaretAtEnd(editorRef.current);
    }
    
    h.inhibit = false;
    setIsUpdating(false);
  }, [isUpdating, placeCaretAtEnd]);

  /* ----------------------------- Enhanced Editor events ----------------------------- */
  const onEditorInput = useCallback(() => {
    if (isUpdating) return;
    
    const newHtml = editorRef.current?.innerHTML || "";
    setEditorHtml(newHtml);
    
    // Debounced history push
    setTimeout(() => {
      if (!isUpdating) {
        pushHistory();
      }
    }, 300);
  }, [isUpdating, pushHistory]);

  const onEditorPaste = useCallback((e) => {
    if (isUpdating) return;
    
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    
    // Use insertText to maintain cursor position
    if (document.queryCommandSupported('insertText')) {
      document.execCommand("insertText", false, text);
    } else {
      // Fallback for older browsers
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }
    }
    
    onEditorInput();
  }, [isUpdating, onEditorInput]);

  const onEditorKeyDown = useCallback((e) => {
    if (isUpdating) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }

    // Enhanced keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      execCommand("bold");
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      execCommand("italic");
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      execCommand("underline");
      return;
    }

    // Auto-format shortcuts
    if (e.key === "Enter" && !e.shiftKey) {
      // Allow normal enter behavior but push history
      setTimeout(() => {
        if (!isUpdating) {
          pushHistory();
        }
      }, 100);
    }
  }, [isUpdating, redo, undo, pushHistory]);

  const onEditorFocus = useCallback(() => {
    if (isUpdating) return;
    
    // Restore selection if available, otherwise place at end
    if (!restoreSelection()) {
      setTimeout(() => {
        if (editorRef.current && !isUpdating) {
          placeCaretAtEnd(editorRef.current);
        }
      }, 0);
    }
  }, [isUpdating, restoreSelection, placeCaretAtEnd]);

  /* ----------------------------- Enhanced Toolbar actions ----------------------------- */
  const execCommand = useCallback((cmd, val = null) => {
    if (isUpdating || !editorRef.current) return;
    
    editorRef.current.focus();
    restoreSelection();
    
    try {
      const success = document.execCommand(cmd, false, val);
      if (success) {
        onEditorInput();
        saveSelection();
      }
    } catch (err) {
      console.warn('execCommand failed:', cmd, err);
    }
  }, [isUpdating, restoreSelection, onEditorInput, saveSelection]);

  const setHeadingToggle = useCallback((level) => {
    if (isUpdating || !editorRef.current) return;
    
    editorRef.current.focus();
    restoreSelection();
    
    try {
      const current = (document.queryCommandValue("formatBlock") || "").toUpperCase();
      if (current === `H${level}`) {
        document.execCommand("formatBlock", false, "P");
      } else {
        document.execCommand("formatBlock", false, `H${level}`);
      }
      onEditorInput();
      saveSelection();
    } catch (err) {
      console.warn('setHeading failed:', level, err);
    }
  }, [isUpdating, restoreSelection, onEditorInput, saveSelection]);

  const toggleUL = useCallback(() => execCommand("insertUnorderedList"), [execCommand]);
  const toggleOL = useCallback(() => execCommand("insertOrderedList"), [execCommand]);

  // Enhanced alignment with better fallback
  const align = useCallback((how) => {
    if (isUpdating || !editorRef.current) return;
    
    const map = {
      left: "justifyLeft",
      center: "justifyCenter", 
      right: "justifyRight",
      justify: "justifyFull",
    };
    
    editorRef.current.focus();
    restoreSelection();
    
    try {
      const success = document.execCommand(map[how] || "justifyLeft", false, null);
      if (!success && how === "justify") {
        // Manual justify fallback
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          applyAlignToBlocks(sel.getRangeAt(0), how);
        }
      }
      onEditorInput();
      saveSelection();
    } catch (err) {
      console.warn('align failed:', how, err);
    }
  }, [isUpdating, restoreSelection, onEditorInput, saveSelection]);

  const applyAlignToBlocks = useCallback((range, how) => {
    const container = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentNode;

    const blocks = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null);
    let n = walker.currentNode;
    
    while (n) {
      const tag = n.tagName;
      if (["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"].includes(tag)) {
        blocks.push(n);
      }
      n = walker.nextNode();
    }
    
    if (!blocks.length && container.closest) {
      const b = container.closest("p,div,li,h1,h2,h3,h4,h5,h6,blockquote") || container;
      blocks.push(b);
    }
    
    blocks.forEach((b) => (b.style.textAlign = how));
  }, []);

  // Enhanced text color with better selection handling
  const setTextColor = useCallback((hex) => {
    if (isUpdating || !editorRef.current) return;
    
    editorRef.current.focus();
    restoreSelection();
    
    try {
      const success = document.execCommand("foreColor", false, hex);
      if (!success) {
        // Manual span wrap fallback
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const r = sel.getRangeAt(0);
          if (!r.collapsed) {
            const span = document.createElement("span");
            span.style.color = hex;
            try {
              const contents = r.extractContents();
              span.appendChild(contents);
              r.insertNode(span);
              
              // Select the colored text
              const newRange = document.createRange();
              newRange.selectNodeContents(span);
              sel.removeAllRanges();
              sel.addRange(newRange);
            } catch {}
          }
        }
      }
      onEditorInput();
      saveSelection();
    } catch (err) {
      console.warn('setTextColor failed:', hex, err);
    }
  }, [isUpdating, restoreSelection, onEditorInput, saveSelection]);

  const removeFormatting = useCallback(() => execCommand("removeFormat"), [execCommand]);

  // Enhanced insert functions
  const insertBlockquote = useCallback(() => {
    if (isUpdating || !editorRef.current) return;
    
    editorRef.current.focus();
    restoreSelection();
    
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const blockquote = document.createElement("blockquote");
        blockquote.innerHTML = "<p>Quote text here...</p>";
        
        range.deleteContents();
        range.insertNode(blockquote);
        
        // Place cursor inside the blockquote
        const newRange = document.createRange();
        newRange.selectNodeContents(blockquote.querySelector('p'));
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      onEditorInput();
      saveSelection();
    } catch (err) {
      console.warn('insertBlockquote failed:', err);
    }
  }, [isUpdating, restoreSelection, onEditorInput, saveSelection]);

  const insertCodeBlock = useCallback(() => {
    if (isUpdating || !editorRef.current) return;
    
    editorRef.current.focus();
    restoreSelection();
    
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = "// Your code here";
        pre.appendChild(code);
        
        range.deleteContents();
        range.insertNode(pre);
        
        // Place cursor inside the code block
        const newRange = document.createRange();
        newRange.selectNodeContents(code);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      onEditorInput();
      saveSelection();
    } catch (err) {
      console.warn('insertCodeBlock failed:', err);
    }
  }, [isUpdating, restoreSelection, onEditorInput, saveSelection]);

  const insertTable = useCallback(() => {
    if (isUpdating || !editorRef.current) return;
    
    editorRef.current.focus();
    restoreSelection();
    
    try {
      const tableHtml = `
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="padding: 8px; border: 1px solid #ddd;">Header 1</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Header 2</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Header 3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Row 1, Cell 1</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Row 1, Cell 2</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Row 1, Cell 3</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Row 2, Cell 1</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Row 2, Cell 2</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Row 2, Cell 3</td>
            </tr>
          </tbody>
        </table>
        <p><br></p>
      `;
      
      document.execCommand("insertHTML", false, tableHtml);
      onEditorInput();
      saveSelection();
    } catch (err) {
      console.warn('insertTable failed:', err);
    }
  }, [isUpdating, onEditorInput, saveSelection]);

  // ASSIGN: enhanced theme application
  const assignThemeToContent = useCallback(() => {
    if (!editorRef.current || isUpdating) return;
    
    const root = editorRef.current;
    const base = Number(theme.basePx) || 16;
    const hs = Number(theme.headingScale) || 1.15;

    const size = (mult) => `${Math.round(base * mult)}px`;
    const headingMultipliers = { 
      H1: 2.5 * hs, 
      H2: 2.0 * hs, 
      H3: 1.75 * hs, 
      H4: 1.5 * hs, 
      H5: 1.25 * hs, 
      H6: 1.1 * hs 
    };

    // Apply to body text elements
    root.querySelectorAll("p,li,blockquote,td,th,div,span").forEach((el) => {
      if (theme.fontFamily && !el.closest('pre,code')) {
        el.style.fontFamily = theme.fontFamily;
      }
      if (!el.closest('h1,h2,h3,h4,h5,h6')) {
        el.style.fontSize = `${base}px`;
      }
      // Apply accent color selectively - not to all text
      if (el.tagName === 'STRONG' || el.classList.contains('highlight')) {
        el.style.color = color;
      }
    });

    // Apply to headings with better spacing
    root.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((el) => {
      if (theme.fontFamily) el.style.fontFamily = theme.fontFamily;
      const mult = headingMultipliers[el.tagName] || 1.0;
      el.style.fontSize = size(mult);
      el.style.color = color;
      
      // Enhanced spacing
      el.style.marginTop = "2rem";
      el.style.marginBottom = "1rem";
      el.style.lineHeight = "1.3";
    });

    // Set CSS custom property for consistent styling
    root.style.setProperty("--theme-accent", color);
    root.style.setProperty("--theme-base-size", `${base}px`);

    setAssignedOK(true);
    setTimeout(() => setAssignedOK(false), 1500);

    onEditorInput();
  }, [theme, color, isUpdating, onEditorInput]);

  /* ----------------------------- Enhanced Autosave ----------------------------- */
  useEffect(() => {
    if (!loaded || !id || isUpdating) return;
    
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      const now = new Date().toISOString();
      const existed = getLocalByIdOrSlug(id);
      const createdAt = existed?.createdAt || now;
      
      const draft = {
        id,
        slug: slug || slugify(title || "Untitled"),
        title: title || "Untitled",
        bodyHtml: editorHtml,
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        color: clampAccent(color),
        theme: {
          fontFamily: theme?.fontFamily || "",
          basePx: Number(theme?.basePx) || 16,
          headingScale: Number(theme?.headingScale) || 1.15,
        },
        createdAt,
        updatedAt: now,
      };
      upsertLocal(draft);
    }, 1000);
    
    return () => clearTimeout(autosaveTimer.current);
  }, [loaded, id, slug, title, editorHtml, tagsText, color, theme, isUpdating]);

  const tags = useMemo(
    () => tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    [tagsText]
  );

  const buildExcerpt = (html) => {
    const txt = stripHtml(html);
    return txt.length > 200 ? `${txt.slice(0, 197)}…` : txt;
  };

  const doSave = useCallback(
    async (toServer = true, redirectAfter = true) => {
      if (!id) return;

      const now = new Date().toISOString();
      const existed = getLocalByIdOrSlug(id);
      const createdAt = existed?.createdAt || now;
      const titleSafe = title?.trim() || "Untitled";

      const draft = {
        id,
        slug: slug || slugify(titleSafe),
        title: titleSafe,
        bodyHtml: editorHtml,
        tags,
        color: clampAccent(color),
        theme: {
          fontFamily: theme?.fontFamily || "",
          basePx: Number(theme?.basePx) || 16,
          headingScale: Number(theme?.headingScale) || 1.15,
        },
        createdAt,
        updatedAt: now,
      };
      upsertLocal(draft);

      if (!toServer) return;

      setSaving(true);
      setError("");

      try {
        const payload = {
          title: titleSafe,
          slug: slug || slugify(titleSafe),
          excerpt: buildExcerpt(editorHtml),
          coverImageUrl: null,
          tags,
          status: "published",
          publishedAt: now,
          bodyHtml: sanitizeHtml(editorHtml),
          content: sanitizeHtml(editorHtml),
          color: clampAccent(color),
          theme,
          meta: { color: clampAccent(color), theme },
        };

        let nextSlug = payload.slug;
        const prevId = id;

        if (isEdit && serverId && isGuid(serverId)) {
          const saved = await apiUpdatePost(serverId, payload);
          if (saved?.slug) {
            nextSlug = saved.slug;
            setSlug(saved.slug);
          }
          removeLocalByIdOrSlug(serverId);
          removeLocalByIdOrSlug(nextSlug);
        } else {
          const created = await apiCreatePost(payload);
          if (created?.id) {
            setServerId(created.id);
            setIsEdit(true);
            setId(created.id);
          }
          if (created?.slug) {
            nextSlug = created.slug;
            setSlug(created.slug);
          }
          removeLocalByIdOrSlug(prevId);
          removeLocalByIdOrSlug(nextSlug);
        }

        if (redirectAfter) nav(`/blog/${nextSlug}`);
      } catch (e) {
        const msg =
          e?.message?.includes("401") || e?.message?.includes("403")
            ? "Owner mode required to save to the database. Unlock from the navbar and try again."
            : e?.message || "Failed to save the post.";
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [id, isEdit, serverId, slug, title, editorHtml, tags, color, theme, nav]
  );

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!confirm("Delete this post?")) return;

    try {
      if (serverId && isGuid(serverId)) {
        await apiDeletePost(serverId);
      }
      removeLocalByIdOrSlug(id);
      removeLocalByIdOrSlug(slug);
      nav("/blog");
    } catch (e) {
      const msg =
        e?.message?.includes("401") || e?.message?.includes("403")
          ? "Owner mode required to delete from the database. Unlock and try again."
          : e?.message || "Failed to delete the post.";
      setError(msg);
    }
  }, [id, serverId, slug, nav]);

  /* ----------------------------- Render ----------------------------- */
  if (!loaded) {
    return (
      <section className="container py-10">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600" />
            <span>Loading editor…</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className={`${isFullscreen ? 'h-full flex flex-col' : 'container py-8'}`}>
        {/* Enhanced Header */}
        <div className={`flex items-center justify-between mb-6 ${isFullscreen ? 'px-6 py-4 border-b bg-white' : ''}`}>
          <div className="flex items-center gap-3">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-gray-700 transition-all duration-200"
            >
              <Icons.Back />
              <span className="font-medium">Back to Blog</span>
            </Link>
            <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700 border border-indigo-200">
              {isEdit ? "Edit Post" : "Create Post"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-gray-700 transition-all duration-200"
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              <Icons.Eye />
              <span className="hidden sm:inline">{showPreview ? "Hide" : "Show"} Preview</span>
            </button>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-gray-700 transition-all duration-200"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Icons.Compress /> : <Icons.Expand />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Focus"}</span>
            </button>

            {isEdit && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-red-600 hover:bg-red-50 transition-all duration-200"
                title="Delete post"
              >
                <Icons.Trash />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            
            <button
              onClick={() => doSave(true, true)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow transition-all duration-200 disabled:opacity-50"
              title="Save and publish"
            >
              <Icons.Save />
              {saving ? "Saving…" : "Save & Publish"}
            </button>
          </div>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-xl border bg-red-50 border-red-200 text-red-700 ${isFullscreen ? 'mx-6' : ''}`}>
            {error}
          </div>
        )}

        {/* Enhanced Form Layout */}
        <div className={`${isFullscreen ? 'flex-1 flex overflow-hidden px-6 pb-6' : 'grid lg:grid-cols-3 gap-6'}`}>
          {/* Enhanced Left Sidebar */}
          {(!isFullscreen || !showPreview) && (
            <div className={`space-y-6 ${isFullscreen ? 'w-80 flex-shrink-0 overflow-y-auto' : 'lg:col-span-1'}`}>
              <div className="rounded-2xl border bg-white p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Your amazing title"
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                />
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span className="text-gray-400">(auto from title, editable)</span>
                </label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="my-awesome-post"
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                />
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="design, react, tips"
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                />
                <p className="mt-1 text-xs text-gray-500">Comma-separated</p>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border bg-white p-5 space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {presetAccent.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setColor(c)}
                      className="h-6 w-6 rounded-full border-2 transition-all duration-200 hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: c === color ? "#111827" : "#e5e7eb",
                        boxShadow: c === color ? "0 0 0 2px rgba(0,0,0,.15)" : "none",
                      }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 p-1 rounded border"
                  />
                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                  <input
                    value={theme.fontFamily || ""}
                    onChange={(e) => setTheme((t) => ({ ...t, fontFamily: e.target.value }))}
                    placeholder="Inter, system-ui, -apple-system"
                    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base px</label>
                    <input
                      type="number"
                      min={12}
                      max={22}
                      value={theme.basePx}
                      onChange={(e) =>
                        setTheme((t) => ({ ...t, basePx: Number(e.target.value) || 16 }))
                      }
                      className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Heading scale
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min={1}
                      max={2}
                      value={theme.headingScale}
                      onChange={(e) =>
                        setTheme((t) => ({ ...t, headingScale: Number(e.target.value) || 1.15 }))
                      }
                      className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={assignThemeToContent}
                  className="inline-flex items-center justify-center w-full mt-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-200"
                  title="Apply theme settings to your content"
                >
                  <Icons.Magic className="w-4 h-4 mr-2" />
                  Apply Theme to Content
                </button>
                {assignedOK && (
                  <div className="text-xs text-green-700 mt-2 text-center">
                    ✓ Theme applied successfully!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Editor + Preview */}
          <div className={`space-y-6 ${isFullscreen ? 'flex-1 flex flex-col' : showPreview ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
            <div className={`rounded-2xl border bg-white ${isFullscreen ? 'flex-1 flex flex-col' : ''}`}>
              {/* Enhanced Toolbar */}
              <div className="flex flex-wrap items-center gap-1 px-4 py-3 border-b bg-gray-50 rounded-t-2xl">
                {/* Headings */}
                <div className="flex items-center gap-0.5 mr-2">
                  {[1,2,3,4,5,6].map(n => (
                    <button
                      key={n}
                      className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                      title={`Heading ${n}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setHeadingToggle(n)}
                    >
                      <Icons.H n={n} />
                    </button>
                  ))}
                </div>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Formatting */}
                <div className="flex items-center gap-0.5 mr-2">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Bold (Ctrl+B)"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand("bold")}
                  >
                    <Icons.Bold />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Italic (Ctrl+I)"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand("italic")}
                  >
                    <Icons.Italic />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Underline (Ctrl+U)"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand("underline")}
                  >
                    <Icons.Underline />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Strikethrough"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand("strikeThrough")}
                  >
                    <Icons.Strikethrough />
                  </button>

                  {/* Text color */}
                  <div className="relative">
                    <button
                      className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                      title="Text color"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        saveSelection();
                        setShowTextColor((s) => !s);
                      }}
                    >
                      <Icons.TextColor />
                    </button>
                    {showTextColor && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowTextColor(false)} />
                        <div className="absolute z-20 mt-2 p-3 bg-white border rounded-xl shadow-xl">
                          <div className="grid grid-cols-6 gap-2 w-60">
                            {[
                              "#111827", "#374151", "#6b7280", "#dc2626", "#2563eb", "#16a34a",
                              "#f59e0b", "#7c3aed", "#0ea5e9", "#059669", "#8b5cf6", "#ef4444"
                            ].map((c) => (
                              <button
                                key={c}
                                className="h-7 w-7 rounded-full border hover:scale-110 transition-transform duration-200"
                                style={{ backgroundColor: c, borderColor: "#e5e7eb" }}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setShowTextColor(false);
                                  setTextColor(c);
                                }}
                                title={c}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Lists & Blocks */}
                <div className="flex items-center gap-0.5 mr-2">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Bullet list"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleUL}
                  >
                    <Icons.UL />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Numbered list"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleOL}
                  >
                    <Icons.OL />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Quote block"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={insertBlockquote}
                  >
                    <Icons.Quote />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Code block"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={insertCodeBlock}
                  >
                    <Icons.Code />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Insert table"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={insertTable}
                  >
                    <Icons.Table />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Alignment */}
                <div className="flex items-center gap-0.5 mr-2">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Align left"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => align("left")}
                  >
                    <Icons.AlignLeft />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Align center"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => align("center")}
                  >
                    <Icons.AlignCenter />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Align right"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => align("right")}
                  >
                    <Icons.AlignRight />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Justify"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => align("justify")}
                  >
                    <Icons.AlignJustify />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {/* Actions */}
                <div className="flex items-center gap-0.5 mr-2">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Undo (Ctrl+Z)"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={undo}
                  >
                    <Icons.Undo />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Redo (Ctrl+Y)"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={redo}
                  >
                    <Icons.Redo />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200"
                    title="Clear formatting"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={removeFormatting}
                  >
                    <Icons.RemoveFormat />
                  </button>
                </div>

                {/* Quick start */}
                <div className="ml-auto">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 px-2 py-1.5 rounded hover:bg-indigo-50 transition-all duration-200"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editorRef.current?.focus();
                      document.execCommand(
                        "insertHTML",
                        false,
                        `<h1>${title || "Your Title Here"}</h1><p>Start writing your amazing content here...</p><p>You can use <strong>bold</strong>, <em>italic</em>, and <u>underlined</u> text.</p><ul><li>Create bulleted lists</li><li>Add <code>code snippets</code></li><li>And much more!</li></ul>`
                      );
                      onEditorInput();
                    }}
                    title="Insert starter template"
                  >
                    <Icons.Magic />
                    Quick Start
                  </button>
                </div>
              </div>

              {/* Enhanced Editor */}
              <div className={`${isFullscreen ? 'flex-1' : ''}`}>
                <div
                  ref={editorRef}
                  className={`editor-content w-full outline-none p-6 ${isFullscreen ? 'h-full overflow-y-auto' : 'min-h-[400px]'}`}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={onEditorInput}
                  onPaste={onEditorPaste}
                  onKeyDown={onEditorKeyDown}
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                  onFocus={onEditorFocus}
                  style={{
                    direction: "ltr",
                    unicodeBidi: "normal",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    color: "#111827",
                    fontFamily: theme.fontFamily || "inherit",
                    fontSize: (theme.basePx || 16) + "px",
                  }}
                  role="textbox"
                  aria-multiline="true"
                  spellCheck={true}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Enhanced Preview */}
            {showPreview && !isFullscreen && (
              <div className="rounded-2xl border bg-white">
                <div className="px-5 py-3 border-b flex items-center justify-between bg-gray-50 rounded-t-2xl">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Icons.Eye />
                    Live Preview
                  </span>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    ×
                  </button>
                </div>
                <article className="px-6 py-5 prose max-w-none">
                  <h1
                    className="!mt-0"
                    style={{
                      color,
                      fontFamily: theme.fontFamily || "",
                      fontSize: `${(theme.headingScale || 1.15) * 2.5}em`,
                    }}
                  >
                    {title || "Untitled"}
                  </h1>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 text-xs rounded-full border"
                        style={{ color, borderColor: `${color}66`, backgroundColor: `${color}10` }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <div
                    className="prose-content"
                    style={{
                      fontFamily: theme.fontFamily || "",
                      fontSize: (theme.basePx || 16) + "px",
                      color: "#1f2937",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: editorHtml || "<p><em>Start writing to see preview...</em></p>",
                    }}
                  />
                </article>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Styles */}
      <style>{`
        .container {
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        /* Enhanced editor styling */
        .editor-content {
          caret-color: ${color};
        }

        .editor-content:focus {
          outline: none;
          box-shadow: 0 0 0 2px ${color}20;
        }

        /* Enhanced content styling with better spacing */
        .editor-content h1,
        .editor-content h2,
        .editor-content h3,
        .editor-content h4,
        .editor-content h5,
        .editor-content h6 {
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          font-weight: 600;
          line-height: 1.3;
        }

        .editor-content h1 { font-size: 2.5em; }
        .editor-content h2 { font-size: 2em; }
        .editor-content h3 { font-size: 1.75em; }
        .editor-content h4 { font-size: 1.5em; }
        .editor-content h5 { font-size: 1.25em; }
        .editor-content h6 { font-size: 1.1em; }

        .editor-content p {
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .editor-content ul,
        .editor-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .editor-content li {
          margin-bottom: 0.25rem;
        }

        .editor-content blockquote {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          border-left: 4px solid ${color};
          background-color: ${color}08;
          font-style: italic;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .editor-content pre {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1.5rem 0;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.9em;
        }

        .editor-content code {
          background: #f1f5f9;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.9em;
        }

        .editor-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }

        .editor-content th,
        .editor-content td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
        }

        .editor-content th {
          background-color: #f9fafb;
          font-weight: 600;
        }

        /* Preview styling */
        .prose-content h1,
        .prose-content h2,
        .prose-content h3,
        .prose-content h4,
        .prose-content h5,
        .prose-content h6 {
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          font-weight: 600;
          line-height: 1.3;
        }

        .prose-content code {
          background: #f3f4f6;
          padding: 0.15rem 0.35rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
        }

        .prose-content blockquote {
          border-left: 4px solid ${color};
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          background: ${color}08;
          font-style: italic;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .prose-content pre {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1.5rem 0;
          overflow-x: auto;
        }

        /* Scrollbar styling */
        .editor-content::-webkit-scrollbar,
        .prose-content::-webkit-scrollbar {
          width: 8px;
        }

        .editor-content::-webkit-scrollbar-track,
        .prose-content::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .editor-content::-webkit-scrollbar-thumb,
        .prose-content::-webkit-scrollbar-thumb {
          background: ${color}40;
          border-radius: 4px;
        }

        .editor-content::-webkit-scrollbar-thumb:hover,
        .prose-content::-webkit-scrollbar-thumb:hover {
          background: ${color}60;
        }
      `}</style>
    </section>
  );
}