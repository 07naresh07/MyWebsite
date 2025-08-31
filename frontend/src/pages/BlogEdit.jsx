// src/pages/BlogEdit.jsx
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

/** remove highlights, preserve text color & alignment, convert <font color> to span style */
function sanitizeHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");

    // <mark> → span (strip highlight)
    doc.querySelectorAll("mark").forEach((m) => {
      const span = doc.createElement("span");
      span.innerHTML = m.innerHTML;
      m.replaceWith(span);
    });

    // convert <font color> → <span style="color:...">
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
        /** @type {HTMLElement} */
        const node = el;
        const keepColor = node.style?.color;
        const keepAlign = node.style?.textAlign;
        // Nuke style then restore color/align only (kills pasted bg highlights)
        node.removeAttribute("style");
        if (keepColor) node.style.color = keepColor;
        if (keepAlign && allowedAlign.has(keepAlign)) node.style.textAlign = keepAlign;
        node.removeAttribute("dir"); // avoid bidi overrides
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

/* ----------------------------- Icons ----------------------------- */
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
      <text x="3" y="7" fontSize="8" fontFamily="monospace">
        1.
      </text>
      <line x1="9" y1="6" x2="21" y2="6" />
      <text x="3" y="13" fontSize="8" fontFamily="monospace">
        2.
      </text>
      <line x1="9" y1="12" x2="21" y2="12" />
      <text x="3" y="19" fontSize="8" fontFamily="monospace">
        3.
      </text>
      <line x1="9" y1="18" x2="21" y2="18" />
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

  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const historyRef = useRef({ stack: [""], index: 0, inhibit: false });
  const autosaveTimer = useRef(null);
  const [showTextColor, setShowTextColor] = useState(false);

  // Prefer CSS inline for execCommand color
  useEffect(() => {
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch {}
  }, []);

  const presetAccent = [
    "#4f46e5",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#16a34a",
    "#059669",
    "#0ea5e9",
    "#2563eb",
    "#111827",
    "#f59e0b",
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

  /* ----------------------------- Initial write to editor ----------------------------- */
  useEffect(() => {
    if (editorRef.current && loaded) {
      editorRef.current.innerHTML = editorHtml || "<p><em>Write your story…</em></p>";
      // place caret at end on first mount to avoid “reverse typing” feel
      placeCaretAtEnd(editorRef.current);
    }
  }, [loaded, editorHtml]);

  /* ----------------------------- Selection helpers ----------------------------- */
  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    selectionRef.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const range = selectionRef.current;
    if (!range) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  // keep the selected range up-to-date
  useEffect(() => {
    const onSel = () => saveSelection();
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  /* ----------------------------- History (undo/redo) ----------------------------- */
  const pushHistory = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML || "";
    const h = historyRef.current;
    if (h.inhibit) return;
    if (h.stack[h.index] === html) return;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(html);
    h.index++;
    setEditorHtml(html); // update preview
  };
  const placeCaretAtEnd = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };
  const undo = () => {
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index--;
    h.inhibit = true;
    const html = h.stack[h.index];
    editorRef.current.innerHTML = html;
    setEditorHtml(html);
    placeCaretAtEnd(editorRef.current);
    h.inhibit = false;
  };
  const redo = () => {
    const h = historyRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index++;
    h.inhibit = true;
    const html = h.stack[h.index];
    editorRef.current.innerHTML = html;
    setEditorHtml(html);
    placeCaretAtEnd(editorRef.current);
    h.inhibit = false;
  };

  /* ----------------------------- Editor events ----------------------------- */
  const onEditorInput = () => {
    // DO NOT sanitize on every keystroke (this causes caret bugs).
    // Just read the HTML and push to history/preview.
    setEditorHtml(editorRef.current?.innerHTML || "");
    pushHistory();
  };

  const onEditorPaste = (e) => {
    // Plain text paste to avoid highlights/backgrounds
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const onEditorKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
  };

  const onEditorFocus = () => {
    // If no saved selection, keep caret natural at end
    if (editorRef.current && !selectionRef.current) {
      placeCaretAtEnd(editorRef.current);
    }
  };

  /* ----------------------------- Toolbar actions ----------------------------- */
  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(cmd, false, val);
    onEditorInput();
    saveSelection();
  };

  const setHeadingToggle = (level) => {
    editorRef.current?.focus();
    restoreSelection();
    const current = (document.queryCommandValue("formatBlock") || "").toUpperCase();
    if (current === `H${level}`) {
      document.execCommand("formatBlock", false, "P");
    } else {
      document.execCommand("formatBlock", false, `H${level}`);
    }
    onEditorInput();
    saveSelection();
  };

  const toggleUL = () => exec("insertUnorderedList");
  const toggleOL = () => exec("insertOrderedList");

  // alignment (with justify fallback)
  const align = (how) => {
    const map = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    editorRef.current?.focus();
    restoreSelection();
    const ok = document.execCommand(map[how] || "justifyLeft", false, null);
    if (!ok || how === "justify") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const r = sel.getRangeAt(0);
        applyAlignToBlocks(r, how);
      }
      onEditorInput();
    } else {
      onEditorInput();
    }
    saveSelection();
  };

  const applyAlignToBlocks = (range, how) => {
    const container =
      range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentNode;
    // gather intersecting blocks
    const blocks = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null);
    let n = walker.currentNode;
    while (n) {
      const el = n;
      const tag = el.tagName;
      if (["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"].includes(tag)) {
        const elRange = document.createRange();
        elRange.selectNodeContents(el);
        const intersects =
          range.compareBoundaryPoints(Range.END_TO_START, elRange) < 0 &&
          range.compareBoundaryPoints(Range.START_TO_END, elRange) > 0;
        if (intersects || range.collapsed) blocks.push(el);
      }
      n = walker.nextNode();
    }
    if (!blocks.length && container.closest) {
      const b = container.closest("p,div,li,h1,h2,h3,h4,h5,h6,blockquote") || container;
      blocks.push(b);
    }
    blocks.forEach((b) => (b.style.textAlign = how));
  };

  // Text color (keep selection intact)
  const setTextColor = (hex) => {
    editorRef.current?.focus();
    restoreSelection();
    const ok = document.execCommand("foreColor", false, hex);
    if (!ok) {
      // Manual span wrap fallback
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const r = sel.getRangeAt(0);
        const span = document.createElement("span");
        span.style.color = hex;
        const frag = r.extractContents();
        span.appendChild(frag);
        r.insertNode(span);
        sel.removeAllRanges();
        const nr = document.createRange();
        nr.selectNodeContents(span);
        sel.addRange(nr);
      }
    }
    onEditorInput();
    saveSelection();
  };

  const removeFormatting = () => exec("removeFormat");

  // ASSIGN: apply accent color to ALL body text + headings, and scale sizes using theme
  const assignThemeToContent = () => {
    if (!editorRef.current) return;
    const root = editorRef.current;
    const base = Number(theme.basePx) || 16;
    const hs = Number(theme.headingScale) || 1.15;

    const size = (mult) => `${Math.round(base * mult)}px`;
    const map = { H1: 2.0 * hs, H2: 1.6 * hs, H3: 1.35 * hs, H4: 1.2 * hs, H5: 1.1 * hs, H6: 1.0 * hs };

    // Body text
    root.querySelectorAll("p,li,blockquote,code,pre,div,span").forEach((el) => {
      if (theme.fontFamily) el.style.fontFamily = theme.fontFamily;
      el.style.fontSize = `${base}px`;
      el.style.color = color; // apply accent to body per your request
    });

    // Headings
    root.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((el) => {
      if (theme.fontFamily) el.style.fontFamily = theme.fontFamily;
      const mult = map[el.tagName] || 1.0;
      el.style.fontSize = size(mult);
      el.style.color = color; // only on assign, not automatic
    });

    // bullet marker color for editor
    root.style.setProperty("--marker-color", color);

    setAssignedOK(true);
    setTimeout(() => setAssignedOK(false), 1200);

    onEditorInput();
  };

  /* ----------------------------- Autosave local ----------------------------- */
  useEffect(() => {
    if (!loaded || !id) return;
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
    }, 800);
    return () => clearTimeout(autosaveTimer.current);
  }, [loaded, id, slug, title, editorHtml, tagsText, color, theme]);

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
          bodyHtml: sanitizeHtml(editorHtml), // sanitize on save (safe + keeps color/align)
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
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-gray-700"
            >
              <Icons.Back />
              <span className="font-medium">Back to Blog</span>
            </Link>
            <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700 border border-indigo-200">
              {isEdit ? "Edit Post" : "Create Post"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white text-red-600 hover:bg-red-50"
                title="Delete post"
              >
                <Icons.Trash />
                Delete
              </button>
            )}
            <button
              onClick={() => doSave(true, true)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow"
              title="Save"
            >
              <Icons.Save />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border bg-red-50 border-red-200 text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: meta */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border bg-white p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your amazing title"
                className="w-full rounded-lg border px-3 py-2"
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
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="design, react, tips"
                className="w-full rounded-lg border px-3 py-2"
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
                    className="h-6 w-6 rounded-full border"
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
                  className="flex-1 rounded-lg border px-3 py-2"
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
                  className="w-full rounded-lg border px-3 py-2"
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
                    className="w-full rounded-lg border px-3 py-2"
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
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
              </div>

              {/* Assign button */}
              <button
                type="button"
                onClick={assignThemeToContent}
                className="inline-flex items-center justify-center w-full mt-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                title="Assign accent color, heading scale and base px to your content"
              >
                Assign to content
              </button>
              {assignedOK && (
                <div className="text-xs text-green-700 mt-2">
                  Applied accent color, base size and heading scale to content.
                </div>
              )}
            </div>
          </div>

          {/* Right: editor + preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border bg-white">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b">
                <div className="flex items-center gap-1">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Heading 1"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setHeadingToggle(1)}
                  >
                    <Icons.H n={1} />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Heading 2"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setHeadingToggle(2)}
                  >
                    <Icons.H n={2} />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Heading 3"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setHeadingToggle(3)}
                  >
                    <Icons.H n={3} />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <div className="flex items-center gap-1">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Bold"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec("bold")}
                  >
                    <Icons.Bold />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Italic"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec("italic")}
                  >
                    <Icons.Italic />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Underline"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec("underline")}
                  >
                    <Icons.Underline />
                  </button>

                  {/* Text color */}
                  <div className="relative">
                    <button
                      className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                      title="Text color"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        saveSelection(); // snapshot before opening popover
                        setShowTextColor((s) => !s);
                      }}
                    >
                      <Icons.TextColor />
                    </button>
                    {showTextColor && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowTextColor(false)} />
                        <div className="absolute z-20 mt-2 p-3 bg-white border rounded-xl shadow-xl">
                          <div className="grid grid-cols-5 gap-2 w-48">
                            {[
                              "#111827",
                              "#374151",
                              "#000000",
                              "#dc2626",
                              "#2563eb",
                              "#16a34a",
                              "#f59e0b",
                              "#7c3aed",
                              "#0ea5e9",
                              "#059669",
                            ].map((c) => (
                              <button
                                key={c}
                                className="h-7 w-7 rounded-full border hover:scale-110 transition-transform"
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

                <div className="w-px h-6 bg-gray-200 mx-1" />

                {/* Lists */}
                <div className="flex items-center gap-1">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Bulleted list"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleUL}
                  >
                    <Icons.UL />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Numbered list"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleOL}
                  >
                    <Icons.OL />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                {/* Alignment */}
                <div className="flex items-center gap-1">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Align left"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => align("left")}
                  >
                    <Icons.AlignLeft />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Align center"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => align("center")}
                  >
                    <Icons.AlignCenter />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Align right"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => align("right")}
                  >
                    <Icons.AlignRight />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Justify"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => align("justify")}
                  >
                    <Icons.AlignJustify />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <div className="flex items-center gap-1">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Undo (Ctrl+Z)"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={undo}
                  >
                    <Icons.Undo />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Redo (Ctrl+Y)"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={redo}
                  >
                    <Icons.Redo />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Clear formatting"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={removeFormatting}
                  >
                    <Icons.RemoveFormat />
                  </button>
                </div>

                <div className="ml-auto">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editorRef.current.focus();
                      document.execCommand(
                        "insertHTML",
                        false,
                        `<p><strong>${title || "Untitled"}</strong></p><p>Start writing here…</p><ul><li>Bulleted list works</li><li><em>Italic</em>, <strong>bold</strong>, <u>underline</u></li></ul>`
                      );
                      onEditorInput();
                    }}
                    title="Start with a helper"
                  >
                    <Icons.Magic />
                    Quick start
                  </button>
                </div>
              </div>

              {/* Editor */}
              <div
                ref={editorRef}
                className="editor-content w-full min-h-[360px] p-4 outline-none rounded-b-2xl"
                contentEditable
                suppressContentEditableWarning
                onInput={onEditorInput}
                onPaste={onEditorPaste}
                onKeyDown={onEditorKeyDown}
                onMouseUp={saveSelection}
                onKeyUp={saveSelection}
                onFocus={onEditorFocus}
                style={{
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  direction: "ltr",
                  unicodeBidi: "normal",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  color: "#111827", // no faded look
                  fontFamily: theme.fontFamily || "inherit",
                  fontSize: (theme.basePx || 16) + "px",
                  ["--marker-color"]: "#111827",
                }}
                role="textbox"
                aria-multiline="true"
                spellCheck={true}
                dir="ltr"
              />
            </div>

            {/* Preview */}
            <div className="rounded-2xl border bg-white">
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Live Preview</span>
              </div>
              <article className="px-6 py-5 prose max-w-none">
                <h1
                  className="!mt-0"
                  style={{
                    color, // stays with your accent color
                    fontFamily: theme.fontFamily || "",
                    fontSize: `${(theme.headingScale || 1.15) * 2}em`,
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
                    ["--marker-color"]: color || "#1f2937",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: editorHtml || "<p><em>Preview…</em></p>",
                  }}
                />
              </article>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .container {
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem;
          padding-right: 1rem;
        }
        /* Darker markers in both editor & preview */
        .editor-content ul li::marker,
        .editor-content ol li::marker,
        .prose-content ul li::marker,
        .prose-content ol li::marker {
          color: var(--marker-color, #111827);
        }
        /* kill highlight backgrounds */
        .prose-content mark { background: transparent; }
        .prose-content code {
          background: #f3f4f6;
          padding: .15rem .35rem;
          border-radius: .35rem;
        }
        .prose-content span[style*="background"] { background: transparent !important; }
      `}</style>
    </section>
  );
}
