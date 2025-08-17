// src/pages/BlogEdit.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost as apiDeletePost,
} from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";

/* ----------------------------- Local drafts (autosave only) ----------------------------- */
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
  const needle = String(idOrSlug).toLowerCase();
  return (
    all.find((p) => String(p.id).toLowerCase() === needle) ||
    all.find((p) => String(p.slug).toLowerCase() === needle)
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
const removeLocal = (id) => {
  const all = readLocal();
  writeLocal(all.filter((p) => String(p.id) !== String(id)));
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
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));

const looksLocal = (s) => /^local-\d+$/i.test(String(s || ""));

/** Minimal but practical Markdown → HTML */
const mdToHtml = (md) => {
  if (!md) return "";
  let txt = md.replace(/\r\n?/g, "\n");

  const inline = (s) =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  txt = txt
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

  const blocks = txt.split(/\n{2,}/);
  const htmlBlocks = blocks.map((block) => {
    const hasHtml =
      /<\/?(div|h[1-6]|ul|ol|li|pre|blockquote|table|thead|tbody|tr|td|th|p|img|code|span)/i.test(block);

    const lines = block.split("\n");
    const isUL = lines.every((l) => /^(\s*[-*]\s+)/.test(l)) && lines.length > 0;
    const isOL = lines.every((l) => /^(\s*\d+\.\s+)/.test(l)) && lines.length > 0;

    if (isUL) {
      const items = lines
        .map((l) => l.replace(/^(\s*[-*]\s+)/, ""))
        .map((li) => `<li>${inline(li)}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    if (isOL) {
      const items = lines
        .map((l) => l.replace(/^(\s*\d+\.\s+)/, ""))
        .map((li) => `<li>${inline(li)}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }

    if (hasHtml) {
      try {
        const parts = block.split(/(<[^>]+>)/g);
        return parts
          .map((part) => (part.startsWith("<") ? part : inline(part)))
          .join("")
          .trim();
      } catch {
        return block;
      }
    }
    return `<p>${inline(block).replace(/\n/g, "<br/>")}</p>`;
  });

  return htmlBlocks.join("");
};

/** Strip HTML to plain text (for excerpt) */
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
  Code: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="7 8 3 12 7 16" strokeWidth="2" />
      <polyline points="17 8 21 12 17 16" strokeWidth="2" />
      <line x1="14" y1="4" x2="10" y2="20" strokeWidth="2" />
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
  AlignLeft: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="10" x2="14" y2="10" /><line x1="4" y1="14" x2="20" y2="14" /><line x1="4" y1="18" x2="12" y2="18" />
    </svg>
  ),
  AlignCenter: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="6" y1="6" x2="18" y2="6" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="6" y1="14" x2="18" y2="14" /><line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  ),
  AlignRight: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="10" y1="10" x2="20" y2="10" /><line x1="4" y1="14" x2="20" y2="14" /><line x1="12" y1="18" x2="20" y2="18" />
    </svg>
  ),
  AlignJustify: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="4" y1="14" x2="20" y2="14" /><line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  ),
};

/* ----------------------------- Component ----------------------------- */
export default function BlogEdit() {
  const { id: routeId } = useParams(); // "new" | id | slug
  const nav = useNavigate();
  const { owner } = useOwnerMode();    // <-- gate server writes

  const [isEdit, setIsEdit] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // serverId is the DB GUID; id may be a local placeholder
  const [serverId, setServerId] = useState(null);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [theme, setTheme] = useState({ fontFamily: "", basePx: 16, headingScale: 1.15 });

  const [markdown, setMarkdown] = useState("");
  const bodyHtml = useMemo(() => mdToHtml(markdown), [markdown]);

  const autosaveTimer = useRef(null);
  const taRef = useRef(null);
  const [showTextColor, setShowTextColor] = useState(false);

  const presetAccent = [
    "#4f46e5", "#7c3aed", "#db2777", "#ea580c",
    "#16a34a", "#059669", "#0ea5e9", "#2563eb",
    "#111827", "#f59e0b"
  ];
  const textColorPalette = [
    "#000000", "#111827", "#374151", "#6b7280", "#9ca3af",
    "#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#7c3aed"
  ];

  const loadFromApi = useCallback(async (needle) => {
    try {
      // Don't hit the API for local temp ids
      if (looksLocal(needle)) return null;

      // Prefer a dedicated getPost(slug) if needle isn't a GUID
      try {
        const mod = await import("../lib/api.js");
        if (typeof mod.getPost === "function" && !isGuid(needle)) {
          const p = await mod.getPost(needle);
          if (p) return p;
        }
      } catch {
        /* ignore, fallback to list */
      }

      // Fallback: fetch many posts and search
      const list = await getPosts({ page: 1, pageSize: 200 });
      const items = Array.isArray(list?.items) ? list.items : Array.isArray(list) ? list : [];
      const lower = String(needle).toLowerCase();
      const found =
        items.find((x) => String(x.id).toLowerCase() === lower) ||
        items.find((x) => String(x.slug).toLowerCase() === lower);
      if (!found) return null;

      // Normalize fields
      return {
        id: found.id,
        slug: found.slug,
        title: found.title,
        tags: found.tags || [],
        color: found.color || (found.meta?.color ?? "#4f46e5"),
        theme: found.theme || found.meta?.theme || { fontFamily: "", basePx: 16, headingScale: 1.15 },
        bodyHtml: found.content_html || found.body_html || found.bodyHtml || found.contentHtml || "",
        createdAt: found.created_at,
        updatedAt: found.updated_at,
      };
    } catch {
      return null;
    }
  }, []);

  // load data
  useEffect(() => {
    let mounted = true;

    const init = async () => {
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
        setMarkdown("");
        setLoaded(true);
        return;
      }

      // Try API first, then local draft
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

        // naive HTML→md to seed editor if we have body
        const html = post.bodyHtml || "";
        const reverse = html
          ? html
              .replace(/<\/h1>/g, "\n\n").replace(/<h1[^>]*>/g, "# ")
              .replace(/<\/h2>/g, "\n\n").replace(/<h2[^>]*>/g, "## ")
              .replace(/<\/h3>/g, "\n\n").replace(/<h3[^>]*>/g, "### ")
              .replace(/<\/?p[^>]*>/g, "\n\n")
              .replace(/<br\s*\/?>/g, "\n")
              .replace(/<\/?strong>/g, "**")
              .replace(/<\/?em>/g, "*")
              .replace(/<\/?code>/g, "`")
              .replace(/<li>(.*?)<\/li>/g, "- $1")
              .replace(/<\/?ul>/g, "")
              .replace(/<ol>[\s\S]*?<\/ol>/g, (m) =>
                m.replace(/<\/?ol>/g, "").replace(/<li>(.*?)<\/li>/g, (_, a) => `${a}`)
              )
              .replace(/<[^>]+>/g, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim()
          : "";
        setMarkdown(reverse);
        setLoaded(true);
      } else {
        // Unknown id/slug → treat as NEW
        const nowId = `local-${Date.now()}`;
        setIsEdit(false);
        setServerId(null);
        setId(nowId);
        setTitle("");
        setSlug("");
        setTagsText("");
        setColor("#4f46e5");
        setTheme({ fontFamily: "", basePx: 16, headingScale: 1.15 });
        setMarkdown("");
        setLoaded(true);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [routeId, loadFromApi]);

  // keep slug in sync while creating
  useEffect(() => {
    if (isEdit && slug) return;
    setSlug(slugify(title || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, isEdit]);

  // autosave (local draft only)
  useEffect(() => {
    if (!loaded || !id) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      doSave(false, false); // local only, no redirect
    }, 1500);
    return () => clearTimeout(autosaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, markdown, tagsText, color, theme, id, loaded]);

  const tags = useMemo(
    () =>
      tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsText]
  );

  // Build an excerpt from HTML (first ~200 chars)
  const buildExcerpt = (html) => {
    const txt = stripHtml(html);
    return txt.length > 200 ? `${txt.slice(0, 197)}…` : txt;
  };

  const doSave = useCallback(
    async (toServer = true, redirectAfter = true) => {
      if (!id) return;

      // Always keep a local draft (so we never lose edits)
      const now = new Date().toISOString();
      const existed = getLocalByIdOrSlug(id);
      const createdAt = existed?.createdAt || now;
      const titleSafe = title?.trim() || "Untitled";
      const draft = {
        id,
        slug: slug || slugify(titleSafe),
        title: titleSafe,
        bodyHtml,
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
          excerpt: buildExcerpt(bodyHtml),
          coverImageUrl: null, // add UI later to pick a cover
          tags,
          status: "published", // or "draft" if you add a toggle
          publishedAt: new Date().toISOString(),
          // Back-end compatibility: send both field names and a meta blob
          bodyHtml,                // camelCase
          contentHtml: bodyHtml,   // snake->camel compat
          color: clampAccent(color),
          theme,                   // if your backend stores these columns
          meta: { color: clampAccent(color), theme }, // if backend uses JSONB meta
        };

        let nextSlug = payload.slug;

        if (isEdit && serverId && isGuid(serverId)) {
          const saved = await updatePost(serverId, payload);       // PUT /api/posts/{guid}
          if (saved?.slug) {
            nextSlug = saved.slug;
            setSlug(saved.slug);
          }
        } else {
          const created = await createPost(payload);                // POST /api/posts
          if (created?.id) {
            setServerId(created.id);
            setIsEdit(true);
            setId(created.id); // switch to real server id moving forward
          }
          if (created?.slug) {
            nextSlug = created.slug;
            setSlug(created.slug);
          }
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
    [id, isEdit, serverId, slug, title, bodyHtml, tags, color, theme, nav]
  );

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!confirm("Delete this post?")) return;

    try {
      if (serverId && isGuid(serverId)) {
        await apiDeletePost(serverId);
      }
      removeLocal(id);
      nav("/blog");
    } catch (e) {
      const msg =
        e?.message?.includes("401") || e?.message?.includes("403")
          ? "Owner mode required to delete from the database. Unlock and try again."
          : e?.message || "Failed to delete the post.";
      setError(msg);
    }
  }, [id, serverId, nav]);

  /* ----------------------------- Editor helpers ----------------------------- */
  const replaceRange = (text, start, end, insert) => text.slice(0, start) + insert + text.slice(end);

  const getSelection = () => {
    const ta = taRef.current;
    if (!ta) return null;
    const { selectionStart, selectionEnd, value } = ta;
    return { ta, selectionStart, selectionEnd, value };
  };

  const setSelection = (ta, start, end) => {
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, end);
    });
  };

  const wrapSelection = (before, after, placeholder = "") => {
    const sel = getSelection();
    if (!sel) return;
    const { ta, selectionStart, selectionEnd, value } = sel;
    const selected = value.slice(selectionStart, selectionEnd) || placeholder;
    const insert = before + selected + after;
    const out = replaceRange(value, selectionStart, selectionEnd, insert);
    setMarkdown(out);
    const newStart = selectionStart + before.length;
    const newEnd = newStart + selected.length;
    setSelection(ta, newStart, newEnd);
  };

  const toggleHeading = (level) => {
    const sel = getSelection();
    if (!sel) return;
    const { ta, selectionStart, selectionEnd, value } = sel;
    const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const end = value.indexOf("\n", selectionEnd);
    const lineEnd = end === -1 ? value.length : end;
    const line = value.slice(start, lineEnd);
    const hash = "#".repeat(level) + " ";
    const newLine = line.replace(/^(#{1,6}\s+)?/, (m) => (m === hash ? "" : hash));
    const out = value.slice(0, start) + newLine + value.slice(lineEnd);
    setMarkdown(out);
    setSelection(ta, start, start + newLine.length);
  };

  const toggleList = (ordered = false) => {
    const sel = getSelection();
    if (!sel) return;
    const { ta, selectionStart, selectionEnd, value } = sel;
    const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const end = selectionEnd === value.length ? selectionEnd : value.indexOf("\n", selectionEnd) + 1;
    const region = value.slice(start, end === 0 ? value.length : end);
    const lines = region.split("\n");

    let counter = 1;
    const processed = lines.map((l) => {
      if (!l.trim()) return l;
      if (ordered) {
        if (/^\s*\d+\.\s/.test(l)) return l.replace(/^\s*\d+\.\s/, ""); // toggle off
        return `${counter++}. ${l}`;
      } else {
        if (/^\s*[-*]\s/.test(l)) return l.replace(/^\s*[-*]\s/, ""); // toggle off
        return `- ${l}`;
      }
    });

    const insert = processed.join("\n");
    const out = value.slice(0, start) + insert + value.slice(start + region.length);
    setMarkdown(out);
    setSelection(ta, start, start + insert.length);
  };

  const wrapAlign = (align) => {
    wrapSelection(`<div style="text-align:${align}">`, "</div>", "Aligned text");
  };

  const applyTextColor = (hex) => {
    wrapSelection(`<span style="color:${hex}">`, "</span>", "colored text");
    setShowTextColor(false);
  };

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
              onClick={() => doSave(owner, true)} // <-- only hit server if Owner Mode is on
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow"
              title="Save"
            >
              <Icons.Save />
              {saving ? "Saving…" : owner ? "Save" : "Save (local)"}
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
                    max={20}
                    value={theme.basePx}
                    onChange={(e) =>
                      setTheme((t) => ({ ...t, basePx: Number(e.target.value) || 16 }))
                    }
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heading scale</label>
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
                    onClick={() => toggleHeading(1)}
                  >
                    <Icons.H n={1} />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Heading 2"
                    onClick={() => toggleHeading(2)}
                  >
                    <Icons.H n={2} />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Heading 3"
                    onClick={() => toggleHeading(3)}
                  >
                    <Icons.H n={3} />
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <div className="flex items-center gap-1">
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Bold"
                    onClick={() => wrapSelection("**", "**", "bold")}
                  >
                    <Icons.Bold />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Italic"
                    onClick={() => wrapSelection("*", "*", "italic")}
                  >
                    <Icons.Italic />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Inline code"
                    onClick={() => wrapSelection("`", "`", "code")}
                  >
                    <Icons.Code />
                  </button>

                  {/* Text color popover */}
                  <div className="relative">
                    <button
                      className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                      title="Text color"
                      onClick={() => setShowTextColor((s) => !s)}
                    >
                      <Icons.Code />
                    </button>
                    {showTextColor && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowTextColor(false)} />
                        <div className="absolute z-20 mt-2 p-3 bg-white border rounded-xl shadow-xl grid grid-cols-6 gap-2">
                          {textColorPalette.map((c) => (
                            <button
                              key={c}
                              className="h-6 w-6 rounded-full border"
                              style={{ backgroundColor: c, borderColor: "#e5e7eb" }}
                              onClick={() => applyTextColor(c)}
                              title={c}
                            />
                          ))}
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
                    onClick={() => toggleList(false)}
                  >
                    <Icons.UL />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Numbered list"
                    onClick={() => toggleList(true)}
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
                    onClick={() => wrapAlign("left")}
                  >
                    <Icons.AlignLeft />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Align center"
                    onClick={() => wrapAlign("center")}
                  >
                    <Icons.AlignCenter />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Align right"
                    onClick={() => wrapAlign("right")}
                  >
                    <Icons.AlignRight />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded hover:bg-gray-100 border"
                    title="Justify"
                    onClick={() => wrapAlign("justify")}
                  >
                    <Icons.AlignJustify />
                  </button>
                </div>

                <div className="ml-auto">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                    onClick={() =>
                      setMarkdown((m) =>
                        m ||
                        `# ${title || "Untitled"}\n\nStart writing here...\n\n- Supports **bold**, *italic*, and \`code\`\n- Use toolbar for colors 🎨, lists •/1., and alignment ↔`
                      )
                    }
                    title="Start with a helper"
                  >
                    <Icons.Magic />
                    Quick start
                  </button>
                </div>
              </div>

              {/* Editor */}
              <textarea
                ref={taRef}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Write your story in Markdown…"
                className="w-full min-h-[360px] p-4 font-mono text-sm outline-none rounded-b-2xl"
                style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
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
                    color,
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
                  style={{ fontFamily: theme.fontFamily || "", fontSize: theme.basePx || 16 }}
                  dangerouslySetInnerHTML={{ __html: bodyHtml || "<p><em>Preview…</em></p>" }}
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
        .prose code {
          background: #f3f4f6;
          padding: .15rem .35rem;
          border-radius: .35rem;
        }
      `}</style>
    </section>
  );
}
