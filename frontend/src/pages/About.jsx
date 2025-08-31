// src/pages/About.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  getProfile,
  uploadProfileImage,
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  apiUrl,
} from "../lib/api.js";
import { useOwnerMode, getToken } from "../lib/owner.js";
import Avatar from "../components/Avatar.jsx";

/* ------------------------- Theme ------------------------- */
const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} });
const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.body.className = isDark ? "dark bg-slate-900" : "bg-gray-50";
  }, [isDark]);
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function FloatingThemeButton() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={`fixed z-50 bottom-5 right-5 px-4 py-2 rounded-full border shadow-lg transition-all duration-300 hover:scale-105 ${
        isDark
          ? "border-gray-600 bg-gray-800 hover:bg-gray-700 text-white"
          : "border-gray-300 bg-white hover:bg-gray-100 text-gray-800"
      }`}
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      {isDark ? "🌙 Dark" : "☀️ Light"} Mode
    </button>
  );
}

/* ------------------------- Styles ------------------------- */
const getStyles = (isDark) => ({
  page: `min-h-screen transition-all duration-300 ${
    isDark
      ? "bg-slate-900"
      : "bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20"
  }`,
  card: `group relative rounded-2xl border backdrop-blur-sm transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-black/5 ${
    isDark
      ? "border-slate-700/50 bg-slate-800/80 text-slate-100"
      : "border-slate-200/60 bg-white/80 text-gray-900"
  }`,
  btnGhost: `px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
    isDark
      ? "bg-slate-700/80 text-slate-300 border-slate-600 hover:bg-slate-600"
      : "bg-white/90 text-gray-700 border-gray-200 hover:bg-gray-50"
  }`,
  btnPrimary: `px-5 py-2 rounded-xl border text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
    isDark
      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/25"
      : "bg-gradient-to-r from-gray-900 to-gray-700 text-white border-gray-900 hover:from-gray-800 hover:to-gray-600 shadow-lg shadow-gray-900/25"
  }`,
  inputBase: `w-full rounded-xl border backdrop-blur-sm transition-all duration-200 px-4 py-3 focus:ring-2 focus:ring-offset-0 hover:border-opacity-80 ${
    isDark
      ? "border-slate-600/50 bg-slate-700/80 text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
      : "border-gray-300/60 bg-white/90 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
  }`,
  textArea: `w-full rounded-xl border backdrop-blur-sm transition-all duration-200 px-4 py-3 min-h-[140px] resize-none focus:ring-2 focus:ring-offset-0 ${
    isDark
      ? "border-slate-600/50 bg-slate-800 text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
      : "border-gray-300/60 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
  }`,
  paragraphMain: `leading-relaxed text-[16px] md:text-[17px] ${
    isDark ? "text-slate-200" : "text-gray-800"
  }`,
  text: {
    primary: isDark ? "text-slate-100" : "text-gray-900",
    secondary: isDark ? "text-slate-300" : "text-gray-600",
    muted: isDark ? "text-slate-400" : "text-gray-500",
  },
});

/* ------------------------- Toast & Modal ------------------------- */
function Toast({ message, type = "info", onClose }) {
  const { isDark } = useTheme();
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  const typeStyles = {
    success: isDark
      ? "bg-green-700/90 text-green-100 border-green-600 shadow-green-500/20"
      : "bg-green-100 text-green-800 border-green-300 shadow-green-500/20",
    error: isDark
      ? "bg-red-700/90 text-red-100 border-red-600 shadow-red-500/20"
      : "bg-red-100 text-red-800 border-red-300 shadow-red-500/20",
    info: isDark
      ? "bg-blue-700/90 text-blue-100 border-blue-600 shadow-blue-500/20"
      : "bg-blue-100 text-blue-800 border-blue-300 shadow-blue-500/20",
  };
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg max-w-sm border backdrop-blur-sm ${typeStyles[type]} animate-in slide-in-from-right duration-300`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}
          </span>
          <span className="text-sm font-medium">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="text-lg leading-none opacity-70 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function Modal({ open, title, onClose, children, width = "w-[min(90vw,680px)]" }) {
  const { isDark } = useTheme();
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div
        className={`relative ${width} max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-300`}
      >
        <div
          className={`rounded-2xl shadow-2xl ring-1 backdrop-blur-sm ${
            isDark ? "bg-slate-800/95 ring-slate-700/50" : "bg-white/95 ring-slate-200/60"
          }`}
        >
          <div
            className={`px-6 py-4 border-b flex justify-between items-center ${
              isDark ? "border-slate-700/50" : "border-slate-100/60"
            }`}
          >
            <h4 className={`font-semibold text-lg ${isDark ? "text-slate-200" : "text-gray-900"}`}>
              {title}
            </h4>
            <button
              className={`text-2xl leading-none transition-all duration-200 hover:scale-110 ${
                isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Header ----------------------------- */
function Header({ fullName, quote, editable, onOpenQuoteModal }) {
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  return (
    <div
      className={`group rounded-2xl p-6 border relative ${
        isDark ? "border-slate-700/50 bg-slate-800/60" : "border-slate-200/60 bg-white/90"
      }`}
    >
      <div className="flex flex-col gap-1 relative">
        <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
          {fullName || "Your Name"}
        </h1>

        {quote && (
          <p
            className={`absolute right-4 bottom-2 text-sm italic ${
              isDark ? "text-slate-300" : "text-gray-600"
            }`}
          >
            “{quote}”
          </p>
        )}

        {editable && (
          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className={`${styles.btnGhost} text-xs`} onClick={onOpenQuoteModal}>
              ✏️ Edit quote
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Enhanced Editable Card ------------------------------ */
function EditableCard({ title, canEdit, editing, onEdit, onSave, onCancel, children }) {
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  return (
    <div className={`${styles.card} group p-5 space-y-4 hover:shadow-2xl transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className={`font-semibold text-base flex items-center gap-2 ${styles.text.primary}`}>
          {title}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300">
          {canEdit &&
            (!editing ? (
              <button className={`${styles.btnGhost} text-xs`} onClick={onEdit}>
                ✏️ Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button className={`${styles.btnPrimary} text-xs`} onClick={onSave}>
                  ✓ Save
                </button>
                <button className={`${styles.btnGhost} text-xs`} onClick={onCancel}>
                  ✕ Cancel
                </button>
              </div>
            ))}
        </div>
      </div>
      <div className="transition-all duration-300">{children}</div>
    </div>
  );
}

/* ------------------------------ Enhanced Skills Card ------------------------------ */
function SkillsCard({ grouped, onAdd, onDelete, openEditModal, busy, isOwner }) {
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");

  const add = async () => {
    await onAdd(name, cat);
    setName("");
    setCat("");
  };

  return (
    <div className={`${styles.card} p-6 overflow-hidden hover:shadow-2xl transition-all duration-300`}>
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`w-1 h-8 rounded-full ${
            isDark ? "bg-gradient-to-b from-green-400 to-blue-500" : "bg-gradient-to-b from-green-500 to-blue-600"
          }`}
        />
        <h3
          className={`text-xl md:text-2xl font-bold bg-gradient-to-r ${
            isDark ? "from-green-400 to-blue-400" : "from-green-600 to-blue-600"
          } bg-clip-text text-transparent`}
        >
          🛠️ Skills & Expertise
        </h3>
      </div>

      {isOwner && (
        <div
          className={`mb-8 p-5 rounded-xl border backdrop-blur-sm ${
            isDark ? "border-slate-600/50 bg-slate-700/30" : "border-slate-200/60 bg-slate-50/80"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-blue-500">➕</span>
            <span className={`text-sm font-medium ${styles.text.primary}`}>Add New Skill</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className={`${styles.inputBase} text-base`}
              placeholder="💡 Skill name (e.g., React)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className={`${styles.inputBase} text-base`}
              placeholder="📂 Category (e.g., Frontend)"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
            />
            <button
              disabled={busy || !name.trim()}
              onClick={add}
              className={`px-5 py-3 rounded-xl font-medium text-base transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 border border-blue-600 shadow-lg shadow-blue-500/25"
                  : "bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 border border-gray-900 shadow-lg shadow-gray-900/25"
              }`}
            >
              {busy ? "✨ Adding..." : "➕ Add Skill"}
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Object.entries(grouped).map(([catName, list]) => (
          <div
            key={catName}
            className={`rounded-xl border p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
              isDark ? "border-slate-600/50 bg-slate-700/30 hover:bg-slate-700/40" : "border-slate-200/60 bg-slate-50/80 hover:bg-slate-50"
            }`}
          >
            <div className={`text-lg font-semibold mb-4 flex items-center gap-2 ${styles.text.primary}`}>
              <span className="text-sm">🎯</span>
              {catName}
            </div>
            <div className="space-y-2">
              {list.map((s) => (
                <SkillChip
                  key={s.id || s.name}
                  skill={s}
                  onStartEdit={() => openEditModal(s)}
                  onDelete={() => onDelete(s.id)}
                  isOwner={isOwner}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Enhanced Skill Chip */
function SkillChip({ skill, onStartEdit, onDelete, isOwner }) {
  const { isDark } = useTheme();
  return (
    <div
      className={`group/skill relative w-full transition-all duration-300 rounded-lg border px-4 py-3 hover:scale-[1.02] hover:shadow-md ${
        isDark
          ? "border-slate-600/50 bg-slate-700/50 text-slate-200 hover:bg-slate-600/60 hover:border-slate-500/60"
          : "border-slate-300/60 bg-white/80 text-slate-800 hover:bg-slate-50 hover:border-slate-400/60"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm select-none">🔹</span>
          <span className="truncate font-medium">{skill.name}</span>
          {skill.level && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ml-1 whitespace-nowrap ${
                isDark ? "bg-emerald-700/30 text-emerald-200" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {skill.level}
            </span>
          )}
        </div>
        {isOwner && (
          <div className="opacity-0 group-hover/skill:opacity-100 transition-opacity flex items-center gap-2 shrink-0">
            <button
              className={`text-xs px-2 py-1 rounded-lg border ${
                isDark ? "border-slate-600 hover:bg-slate-600" : "border-slate-300 hover:bg-slate-100"
              }`}
              onClick={onStartEdit}
            >
              ✏️ Edit
            </button>
            <button
              className={`text-xs px-2 py-1 rounded-lg border ${
                isDark ? "border-red-700 text-red-200 hover:bg-red-800/40" : "border-red-300 text-red-700 hover:bg-red-50"
              }`}
              onClick={onDelete}
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------- Small Editors ------------------------- */
function EditableList({ items, setItems, placeholder = "Add item..." }) {
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setItems([...(items || []), v]);
    setDraft("");
  };
  const remove = (idx) => setItems(items.filter((_, i) => i !== idx));
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className={`${styles.inputBase} h-12`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
        />
        <button className={styles.btnPrimary} onClick={add}>
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {(items || []).map((v, i) => (
          <li
            key={`${v}-${i}`}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
              isDark ? "border-slate-600/50" : "border-slate-200/60"
            }`}
          >
            <span className="truncate">{v}</span>
            <button className={styles.btnGhost} onClick={() => remove(i)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------- Languages helpers ------------------------- */
const stripEmoji = (s = "") =>
  s.replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{FE0F}]/gu, "").trim();

/* ---------- About HTML sanitization ---------- */
function sanitizeAboutHtml(raw = "") {
  if (typeof window === "undefined") return raw;
  const container = document.createElement("div");
  container.innerHTML = raw;

  const ALLOWED = new Set(["P", "UL", "OL", "LI", "BR", "STRONG", "EM", "B", "I", "A"]);
  const walk = (node, parent) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === 1) {
        if (!ALLOWED.has(child.tagName)) {
          while (child.firstChild) parent.insertBefore(child.firstChild, child);
          parent.removeChild(child);
          continue;
        }
        child.removeAttribute("style");
        child.removeAttribute("class");
        child.removeAttribute("bgcolor");
        if (child.tagName === "A") {
          const href = child.getAttribute("href");
          if (!href) {
            while (child.firstChild) parent.insertBefore(child.firstChild, child);
            parent.removeChild(child);
            continue;
          }
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }
        walk(child, child);
      }
    }
  };
  walk(container, container);
  return container.innerHTML;
}

/* ------------------------- Languages View ------------------------- */
function LanguagesView({ items = [], onRemove }) {
  const { isDark } = useTheme();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((l, i) => {
        const name = stripEmoji(l.name || "");
        const level = l.level || "";
        return (
          <div
            key={`${name}-${i}`}
            className={`rounded-xl border p-4 ${
              isDark ? "border-slate-600/50 bg-slate-700/30" : "border-slate-200/60 bg-white/70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{name}</p>
                {level && <p className="text-sm opacity-80">Level: {level}</p>}
              </div>
              {typeof onRemove === "function" && (
                <button
                  className={`w-6 h-6 leading-none rounded-md border text-xs grid place-items-center ${
                    isDark
                      ? "border-slate-600 text-slate-300 hover:bg-slate-700/60"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                  onClick={() => onRemove(i)}
                  title="Remove"
                  aria-label="Remove language"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
      {(!items || items.length === 0) && (
        <p className={isDark ? "text-slate-300" : "text-gray-600"}>No languages added yet.</p>
      )}
    </div>
  );
}

/* ------------------------- Languages Editor ------------------------- */
function LanguagesEditor({ items, onChange }) {
  const { isDark } = useTheme();
  const styles = getStyles(isDark);
  const [list, setList] = useState(items || []);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  useEffect(() => onChange(list), [list, onChange]);

  const levelsForLanguage = (n = "") => {
    const nl = n.toLowerCase();
    if (nl.includes("japanese")) return ["N1", "N2", "N3", "N4", "N5", "Native"];
    if (nl.includes("english")) return ["C2", "C1", "B2", "B1", "A2", "A1", "Native"];
    if (nl.includes("hindi")) return ["Business", "Normal", "Daily", "Native"];
    if (nl.includes("nepali")) return ["Native", "Fluent", "Conversational"];
    if (nl.includes("chinese") || nl.includes("mandarin"))
      return ["HSK 6", "HSK 5", "HSK 4", "HSK 3", "HSK 2", "HSK 1", "Native"];
    return ["Native", "Fluent", "Professional", "Business", "Conversational", "Elementary", "Beginner"];
  };

  const addLang = () => {
    if (!name.trim() || !level.trim()) return;
    setList([...(list || []), { name: stripEmoji(name.trim()), level: level.trim() }]);
    setName("");
    setLevel("");
  };

  const removeLang = (idx) => {
    setList((arr) => arr.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-stretch">
        <input
          className={`${styles.inputBase} h-12`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Language"
        />
        <div className="relative">
          <select
            className={`${styles.inputBase} h-12 pr-10 appearance-none w-full`}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Select level</option>
            {levelsForLanguage(name).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm opacity-60">
            ▾
          </span>
        </div>
        <button className={styles.btnPrimary} onClick={addLang}>
          Add
        </button>
      </div>

      <LanguagesView items={list} onRemove={removeLang} />
    </div>
  );
}

/* ----------------------------- About Page ----------------------------- */
export default function About() {
  return (
    <ThemeProvider>
      <AboutInner />
      <FloatingThemeButton />
    </ThemeProvider>
  );
}

function AboutInner() {
  const { owner: isOwner } = useOwnerMode();
  const { isDark } = useTheme();
  const styles = getStyles(isDark);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState(null);

  // No hardcoded defaults — start empty
  const [profile, setProfile] = useState({
    fullName: "",
    quote: "",
    avatarUrl: "",
    about: "",
    interests: [],
    languages: [],
    focus: [],
    motto: "",
    socials: { extras: {} },
  });

  const [edit, setEdit] = useState({ about: false, interests: false, languages: false, focus: false, motto: false });

  // Uncontrolled editor state + ref (fixes caret jumping / “reverse typing”)
  const [aboutDraftHtml, setAboutDraftHtml] = useState("");
  const aboutEditorRef = useRef(null);

  // Avatar
  const [imgPreview, setImgPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Skills
  const [skills, setSkills] = useState([]);
  const [busySkill, setBusySkill] = useState(false);

  // Modals
  const [quoteModal, setQuoteModal] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState("");

  const [skillModal, setSkillModal] = useState(false);
  const [skillDraft, setSkillDraft] = useState({ id: null, name: "", category: "" });
  const [skillInlineError, setSkillInlineError] = useState("");

  const showToast = useCallback((message, type = "info") => setToast({ message, type }), []);
  const hideToast = useCallback(() => setToast(null), []);

  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([getProfile(), getSkills()])
      .then(([pr, sk]) => {
        if (pr) {
          const extras = pr?.socials?.extras || {};
          setProfile({
            fullName: pr.fullName || "",
            quote: pr.quote || "",
            avatarUrl: pr.avatarUrl || pr.avatar_url || "",
            about: pr.about || pr.bio || "",
            interests: extras.interests || [],
            languages: extras.languages || [],
            focus: extras.focus || [],
            motto: extras.motto || "",
            socials: { extras },
          });
        }
        if (sk) setSkills(sk.map(normalizeSkill));
      })
      .catch((e) => {
        const message = e?.message || "Failed to load data";
        setErr(message);
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  // Owner guard for About editor
  useEffect(() => {
    if (!isOwner && edit.about) setEdit((e) => ({ ...e, about: false }));
  }, [isOwner, edit.about]);

  /* ---------- Save profile (POST first; fallback PUT) ---------- */
  async function saveProfileApi(body) {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Try POST
    let res = await fetch(apiUrl("/api/profile"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (res.status === 405) {
      // Fallback to PUT if server only allows that
      res = await fetch(apiUrl("/api/profile"), {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `${res.status} ${res.statusText}`);
    }
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  async function saveProfilePatch(patch) {
    const merged = { ...profile, ...patch };
    const extras = {
      interests: merged.interests || [],
      languages: merged.languages || [],
      focus: merged.focus || [],
      motto: merged.motto || "",
    };
    const payload = {
      fullName: merged.fullName || "",
      quote: merged.quote || "",
      avatarUrl: merged.avatarUrl || "",
      about: merged.about || "",
      socials: { ...(profile.socials || {}), extras },
    };

    try {
      const saved = await saveProfileApi(payload);
      setProfile((cur) => ({ ...cur, ...saved, ...merged }));
      showToast("Profile saved successfully", "success");
    } catch (e) {
      const m = e?.message || "Failed to save profile";
      setErr(m);
      showToast(m, "error");
      if (/401|403/i.test(m)) {
        alert("Unauthorized. Click 'Owner → Unlock' in the navbar, then retry.");
      }
      throw e;
    }
  }

  /* ---------- Avatar ---------- */
  const handleChangePhotoClick = () => fileInputRef.current?.click();

  async function handleAvatarFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size must be less than 5MB", "error");
      return;
    }
    setUploadingAvatar(true);
    const localUrl = URL.createObjectURL(file);
    setImgPreview(localUrl);
    try {
      const res = await uploadProfileImage(file);
      await saveProfilePatch({ avatarUrl: res.url || "" });
      showToast("Avatar updated successfully", "success");
    } catch (error) {
      const message = error?.message || "Failed to upload image";
      setErr(message);
      showToast(message, "error");
      setImgPreview("");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  /* ---------- Skills ---------- */
  function normalizeSkill(s) {
    return {
      id: s.id ?? s.Id,
      name: s.name ?? s.Name ?? "",
      category: s.category ?? s.Category ?? null,
      level: s.level ?? s.Level ?? null,
      sortOrder: s.sortOrder ?? s.sort_order ?? s.SortOrder ?? 0,
    };
  }

  const groupedSkills = useMemo(() => {
    const acc = {};
    (skills || []).forEach((s) => {
      const cat = s.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
    });
    Object.keys(acc).forEach((k) => {
      acc[k].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
    });
    return acc;
  }, [skills]);

  const addSkill = async (name, category) => {
    const nm = (name || "").trim();
    const cat = (category || "").trim();
    if (!nm) return;
    try {
      setBusySkill(true);
      const created = await createSkill({ name: nm, category: cat || null, sortOrder: 0 });
      const normalized = normalizeSkill(created);
      if (!normalized.name) normalized.name = nm;
      if (normalized.category == null && cat) normalized.category = cat;
      setSkills((arr) => [...arr, normalized]);
      showToast("Skill added successfully", "success");
    } catch (e) {
      const message = e?.message || "Failed to add skill";
      setErr(message);
      showToast(message, "error");
    } finally {
      setBusySkill(false);
    }
  };

  const changeSkill = async (id, patch) => {
    if (patch.name !== undefined && !String(patch.name).trim()) {
      setSkillInlineError("Field cannot be empty. Please delete this skill instead or enter a value.");
      return;
    }
    const curItem = skills.find((s) => s.id === id) || {};
    const full = normalizeSkill({ ...curItem, ...patch });
    setSkills((arr) => arr.map((s) => (s.id === id ? { ...s, ...full } : s)));
    try {
      await updateSkill(id, full);
      showToast("Skill updated successfully", "success");
    } catch (e) {
      const message = e?.message || "Failed to update skill";
      setErr(message);
      showToast(message, "error");
    }
  };

  const removeSkill = async (id) => {
    if (!window.confirm("Are you sure you want to delete this skill?")) return;
    const prev = skills;
    setSkills((arr) => arr.filter((s) => s.id !== id));
    try {
      await deleteSkill(id);
      showToast("Skill deleted successfully", "success");
    } catch (e) {
      const message = e?.message || "Failed to delete skill";
      setErr(message);
      showToast(message, "error");
      setSkills(prev);
    }
  };

  const openEditSkillModal = (s) => {
    setSkillInlineError("");
    setSkillDraft({ id: s.id, name: s.name || "", category: s.category || "" });
    setSkillModal(true);
  };

  const saveSkillFromModal = async () => {
    const nm = (skillDraft.name || "").trim();
    if (!nm) {
      setSkillInlineError("Name is required");
      return;
    }
    await changeSkill(skillDraft.id, { name: nm, category: skillDraft.category || null });
    setSkillModal(false);
  };

  /* ---------- About editor (fixed caret) ---------- */
  const onAboutPaste = useCallback((e) => {
    const html = e.clipboardData?.getData("text/html");
    if (html) {
      e.preventDefault();
      const clean = sanitizeAboutHtml(html);
      document.execCommand("insertHTML", false, clean);
    }
  }, []);

  // When entering edit mode, set editor content once and focus caret at end
  useEffect(() => {
    if (!edit.about) return;
    const clean = sanitizeAboutHtml(profile.about || "");
    setAboutDraftHtml(clean);
    const el = aboutEditorRef.current;
    if (el) {
      el.innerHTML = clean;
      // caret to end
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      el.focus();
    }
  }, [edit.about]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container min-h-screen flex items-center justify-center">
          <div className="relative">
            <div className={`w-16 h-16 border-4 rounded-full animate-spin ${isDark ? "border-slate-600" : "border-blue-200"}`} />
            <div className={`absolute top-0 left-0 w-16 h-16 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-blue-400" : "border-blue-600"}`} />
          </div>
        </div>
      </div>
    );
  }

  const avatarSrc = imgPreview || profile?.avatarUrl || "";

  return (
    <div className={styles.page}>
      <div className="container py-8 space-y-6 max-w-7xl mx-auto">
        <Header
          fullName={profile.fullName}
          quote={profile?.quote}
          editable={isOwner}
          onOpenQuoteModal={() => {
            setQuoteDraft(profile.quote || "");
            setQuoteModal(true);
          }}
        />

        <div className="grid lg:grid-cols-4 gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="lg:col-span-1 space-y-5">
            {/* Avatar Card */}
            <div className={`${styles.card} p-5`}>
              <div className="relative group/avatar">
                <div
                  className={`overflow-hidden rounded-2xl ring-2 w-full aspect-square transition-all duration-300 group-hover/avatar:ring-4 ${
                    isDark
                      ? "ring-slate-600/50 group-hover/avatar:ring-blue-500/50 bg-gradient-to-br from-slate-700 to-slate-800"
                      : "ring-slate-200/60 group-hover/avatar:ring-blue-400/50 bg-gradient-to-br from-slate-100 to-slate-200"
                  }`}
                >
                  <Avatar
                    src={avatarSrc}
                    alt={profile.fullName || "Profile photo"}
                    size="custom"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-105"
                  />
                  {uploadingAvatar && (
                    <div
                      className={`absolute inset-0 grid place-items-center text-sm backdrop-blur-sm ${
                        isDark ? "bg-slate-800/70 text-slate-200" : "bg-white/70 text-slate-700"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    </div>
                  )}
                </div>

                {isOwner && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300">
                    <button
                      className={`rounded-xl px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
                        isDark ? "bg-slate-800/95 ring-1 ring-slate-600 text-slate-200" : "bg-white/95 ring-1 ring-slate-200 text-slate-700"
                      }`}
                      onClick={handleChangePhotoClick}
                    >
                      📷 Change Photo
                    </button>
                  </div>
                )}

                {isOwner && (
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                )}
              </div>
            </div>

            {/* Interests */}
            <EditableCard
              title="🎯 Interests"
              canEdit={isOwner}
              editing={edit.interests}
              onEdit={() => isOwner && setEdit((e) => ({ ...e, interests: true }))}
              onCancel={() => setEdit((e) => ({ ...e, interests: false }))}
              onSave={async () => {
                await saveProfilePatch({ interests: profile.interests || [] });
                setEdit((e) => ({ ...e, interests: false }));
              }}
            >
              {!edit.interests ? (
                <ul className={`list-disc list-outside pl-5 space-y-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  {(profile?.interests || []).map((it, i) => (
                    <li key={`${it}-${i}`} className="transition-colors hover:text-blue-500">
                      {it}
                    </li>
                  ))}
                </ul>
              ) : (
                <EditableList
                  items={profile.interests || []}
                  setItems={(arr) => setProfile((p) => ({ ...p, interests: arr }))}
                  placeholder="Add a new interest..."
                />
              )}
            </EditableCard>

            {/* Languages */}
            <EditableCard
              title="🌍 Languages"
              canEdit={isOwner}
              editing={edit.languages}
              onEdit={() => isOwner && setEdit((e) => ({ ...e, languages: true }))}
              onCancel={() => setEdit((e) => ({ ...e, languages: false }))}
              onSave={async () => {
                await saveProfilePatch({ languages: profile.languages || [] });
                setEdit((e) => ({ ...e, languages: false }));
              }}
            >
              {!edit.languages ? (
                <LanguagesView items={profile.languages || []} />
              ) : (
                <LanguagesEditor
                  items={profile.languages || []}
                  onChange={(arr) => setProfile((p) => ({ ...p, languages: arr }))}
                />
              )}
            </EditableCard>

            {/* Current focus */}
            <EditableCard
              title="🚀 Current Focus"
              canEdit={isOwner}
              editing={edit.focus}
              onEdit={() => isOwner && setEdit((e) => ({ ...e, focus: true }))}
              onCancel={() => setEdit((e) => ({ ...e, focus: false }))}
              onSave={async () => {
                await saveProfilePatch({ focus: profile.focus || [] });
                setEdit((e) => ({ ...e, focus: false }));
              }}
            >
              {!edit.focus ? (
                <ul className={`list-disc list-outside pl-5 space-y-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  {(profile?.focus || []).map((f, i) => (
                    <li key={`${f}-${i}`} className="transition-colors hover:text-purple-500">
                      {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <EditableList
                  items={profile.focus || []}
                  setItems={(arr) => setProfile((p) => ({ ...p, focus: arr }))}
                  placeholder="Add a focus area..."
                />
              )}
            </EditableCard>

            {/* Motto */}
            <EditableCard
              title="💭 Motto"
              canEdit={isOwner}
              editing={edit.motto}
              onEdit={() => isOwner && setEdit((e) => ({ ...e, motto: true }))}
              onCancel={() => setEdit((e) => ({ ...e, motto: false }))}
              onSave={async () => {
                await saveProfilePatch({ motto: profile.motto || "" });
                setEdit((e) => ({ ...e, motto: false }));
              }}
            >
              {!edit.motto ? (
                <div
                  className={`text-[15px] leading-relaxed italic text-center py-2 px-3 rounded-lg ${
                    isDark ? "text-slate-300 bg-transparent" : "text-gray-700 bg-gradient-to-r from-purple-50 to-blue-50"
                  }`}
                >
                  {profile?.motto ? `“${profile.motto}”` : ""}
                </div>
              ) : (
                <input
                  className={`${styles.inputBase} h-12 text-[15px]`}
                  value={profile.motto || ""}
                  onChange={(e) => setProfile((p) => ({ ...p, motto: e.target.value }))}
                  placeholder="Your personal motto..."
                />
              )}
            </EditableCard>
          </aside>

          {/* MAIN CONTENT */}
          <section className="lg:col-span-3 space-y-6">
            {/* About Paragraph */}
            <div className={`${styles.card} p-6 group`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${styles.text.primary}`}>👋 About Me</h3>

                {isOwner && !edit.about && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className={`${styles.btnGhost} text-xs`}
                      onClick={() => setEdit((e) => ({ ...e, about: true }))}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>

              {!edit.about ? (
                <div
                  className={`${styles.paragraphMain} text-justify space-y-4 
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:leading-relaxed
                  [&_*]:bg-transparent`}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeAboutHtml((profile?.about || "").trim()) || "",
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {/* FIXED: uncontrolled contentEditable (no dangerouslySetInnerHTML binding) */}
                  <div
                    id="about-editor"
                    ref={aboutEditorRef}
                    dir="ltr"
                    className={`min-h-[220px] border rounded p-3 text-sm overflow-auto outline-none ${
                      isDark ? "bg-slate-800 text-slate-100 border-slate-600" : "bg-white text-slate-900 border-slate-300"
                    }`}
                    style={{ textAlign: "left" }}
                    contentEditable
                    suppressContentEditableWarning
                    onPaste={onAboutPaste}
                    onInput={(e) => setAboutDraftHtml(e.currentTarget.innerHTML)}
                  />
                  <div className="flex gap-2">
                    <button
                      className={styles.btnPrimary}
                      onClick={async () => {
                        const clean = sanitizeAboutHtml(aboutDraftHtml || "");
                        await saveProfilePatch({ about: clean });
                        setEdit((e) => ({ ...e, about: false }));
                        setProfile((p) => ({ ...p, about: clean }));
                      }}
                    >
                      ✓ Save
                    </button>
                    <button className={styles.btnGhost} onClick={() => setEdit((e) => ({ ...e, about: false }))}>
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Skills */}
            <SkillsCard
              grouped={groupedSkills}
              onAdd={addSkill}
              onDelete={removeSkill}
              openEditModal={openEditSkillModal}
              busy={busySkill}
              isOwner={isOwner}
            />
          </section>
        </div>
      </div>

      {/* Quote Modal */}
      <Modal open={quoteModal} title="Edit Quote" onClose={() => setQuoteModal(false)}>
        <div className="space-y-3">
          <input
            className={`${styles.inputBase} h-12`}
            value={quoteDraft}
            onChange={(e) => setQuoteDraft(e.target.value)}
            placeholder="Your personal quote..."
          />
        </div>
        <div className="p-6 pt-3 flex gap-2 justify-end">
          <button className={styles.btnGhost} onClick={() => setQuoteModal(false)}>
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            onClick={async () => {
              await saveProfilePatch({ quote: quoteDraft });
              setQuoteModal(false);
            }}
          >
            Save
          </button>
        </div>
      </Modal>

      {/* Skill Modal */}
      <Modal open={skillModal} title="Edit Skill" onClose={() => setSkillModal(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs opacity-70">Name</label>
              <input
                className={`${styles.inputBase} h-12 mt-1`}
                value={skillDraft.name}
                onChange={(e) => setSkillDraft((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g., React"
              />
            </div>
            <div>
              <label className="text-xs opacity-70">Category</label>
              <input
                className={`${styles.inputBase} h-12 mt-1`}
                value={skillDraft.category}
                onChange={(e) => setSkillDraft((s) => ({ ...s, category: e.target.value }))}
                placeholder="e.g., Frontend"
              />
            </div>
          </div>
          {skillInlineError && <div className="text-sm text-red-500">{skillInlineError}</div>}
          <div className="flex gap-2 justify-end">
            <button className={styles.btnGhost} onClick={() => setSkillModal(false)}>
              Cancel
            </button>
            <button className={styles.btnPrimary} onClick={saveSkillFromModal}>
              Save
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast {...toast} onClose={hideToast} />}
    </div>
  );
}
