// src/pages/Certificates.jsx
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getLocalCertificates, removeLocalCertificate } from "../lib/certsLocal.js";
import { useOwnerMode, setOwnerFlag } from "../lib/owner.js";

/* Normalize item shape */
function normalizeItem(it, idx) {
  const dateMonth = it.dateMonth || "";
  const dateLabel =
    it.date ||
    (dateMonth && /^\d{4}-\d{2}$/.test(dateMonth)
      ? `${dateMonth.split("-")[1]}/${dateMonth.split("-")[0]}`
      : "");
  return {
    id: it.id ?? `api-${idx}`,
    title: it.title || it.name || it.caption || "Certificate",
    issuer: it.issuer || it.provider || it.platform || "",
    dateMonth,
    date: dateLabel,
    image: it.imageUrl || it.image || it.url || "",
    credentialUrl: it.credentialUrl || it.verifyUrl || it.link || "",
    credentialId: it.credentialId || it.certificateId || "",
    type: it.type || it.category || "Certificate",
    _source: it._source || "api",
    skills: it.skills || [],
    description: it.description || "",
  };
}

const SKIP_TITLES = ["portfolio banner", "profile photo"];

/* Tiny hash → stable HSL tint (per issuer/title) */
function colorFor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 60% 40%)`;
}

/* ---------- UI bits that accept darkMode ---------- */
function StatsSection({ items, darkMode }) {
  const stats = useMemo(() => {
    const issuers = new Set(items.map((i) => i.issuer).filter(Boolean));
    const types = {};
    items.forEach((i) => {
      types[i.type || "Certificate"] = (types[i.type || "Certificate"] || 0) + 1;
    });
    const currentYear = new Date().getFullYear();
    const thisYear = items.filter((i) => {
      if (!i.dateMonth) return false;
      const year = parseInt(i.dateMonth.split("-")[0], 10);
      return year === currentYear;
    }).length;
    return { total: items.length, issuers: issuers.size, types, thisYear };
  }, [items]);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white transform hover:scale-105 transition-transform">
        <div className="text-3xl font-bold">{stats.total}</div>
        <div className="text-blue-100 text-sm">Total Certificates</div>
      </div>
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white transform hover:scale-105 transition-transform">
        <div className="text-3xl font-bold">{stats.issuers}</div>
        <div className="text-purple-100 text-sm">Platforms</div>
      </div>
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white transform hover:scale-105 transition-transform">
        <div className="text-3xl font-bold">{stats.thisYear}</div>
        <div className="text-green-100 text-sm">This Year</div>
      </div>
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white transform hover:scale-105 transition-transform">
        <div className="text-3xl font-bold">{Object.keys(stats.types).length}</div>
        <div className="text-orange-100 text-sm">Categories</div>
      </div>
    </div>
  );
}

function EnhancedSearchBar({ value, onChange, darkMode }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex-1 max-w-md">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search certificates... (⌘K)"
        className={`w-full h-10 pl-10 pr-10 rounded-xl border shadow-sm focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400
        ${darkMode
            ? "border-gray-700 bg-gray-800 text-gray-100 focus:ring-indigo-400"
            : "border-gray-200 bg-white text-gray-900 focus:ring-indigo-500"}`}
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
          aria-label="Clear search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ViewModeToggle({ mode, onChange, darkMode }) {
  return (
    <div className={`flex rounded-lg p-1 ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
      <button
        onClick={() => onChange("grid")}
        className={`px-3 py-1.5 rounded-md transition-all ${
          mode === "grid"
            ? darkMode
              ? "bg-gray-700 text-gray-100 shadow-sm"
              : "bg-white text-gray-900 shadow-sm"
            : darkMode
              ? "text-gray-300 hover:text-gray-100"
              : "text-gray-700 hover:text-gray-900"
        }`}
        aria-label="Grid view"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <button
        onClick={() => onChange("list")}
        className={`px-3 py-1.5 rounded-md transition-all ${
          mode === "list"
            ? darkMode
              ? "bg-gray-700 text-gray-100 shadow-sm"
              : "bg-white text-gray-900 shadow-sm"
            : darkMode
              ? "text-gray-300 hover:text-gray-100"
              : "text-gray-700 hover:text-gray-900"
        }`}
        aria-label="List view"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}

function PreviewModal({ item, onClose, onEdit, onDelete, owner, verified, darkMode }) {
  if (!item) return null;
  const tint = colorFor(item.issuer || item.title);
  const ok = verified === true;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden ${darkMode ? "bg-gray-900 text-gray-100 border border-gray-800" : "bg-white text-gray-900 border border-gray-200"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-start gap-4 p-4 ${darkMode ? "border-b border-gray-800" : "border-b border-gray-200"}`}>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {item.issuer && (
                <span className={`px-2 py-0.5 rounded-full ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                  {item.issuer}
                </span>
              )}
              {item.type && (
                <span
                  className="px-2 py-0.5 rounded-full border"
                  style={{ color: tint, borderColor: `${tint}55`, background: `${tint}0d` }}
                >
                  {item.type}
                </span>
              )}
              {item.date && (
                <span className={`px-2 py-0.5 rounded-full ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                  {item.date}
                </span>
              )}
              {item.credentialUrl && (
                <span
                  className={`px-2 py-0.5 rounded-full border text-xs ${
                    ok
                      ? `${darkMode ? "text-emerald-400 border-emerald-700" : "text-emerald-700 border-emerald-200"}`
                      : `${darkMode ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-200"}`
                  }`}
                >
                  {ok ? "Verified" : "Unverified"}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className={`w-full h-full object-cover rounded-xl border ${darkMode ? "border-gray-800" : "border-gray-200"}`}
            />
          ) : (
            <div className={`w-full h-64 grid place-items-center rounded-xl border border-dashed text-sm ${darkMode ? "border-gray-800 text-gray-300" : "border-gray-200 text-gray-500"}`}>
              No image
            </div>
          )}

          <div className="space-y-3">
            {item.description && <p className="text-sm whitespace-pre-wrap">{item.description}</p>}

            {item.skills && item.skills.length > 0 && (
              <div>
                <div className={`text-xs mb-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Skills</div>
                <div className="flex flex-wrap gap-1">
                  {item.skills.map((s) => (
                    <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm">
              {item.credentialId && (
                <div className="flex items-center gap-2">
                  <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>Credential ID:</span>
                  <span className="font-medium">{item.credentialId}</span>
                </div>
              )}
              {item.credentialUrl && (
                <div className="flex items-center gap-2 break-all">
                  <span className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>Verify:</span>
                  <a
                    href={item.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${darkMode ? "text-indigo-400" : "text-indigo-600"} hover:underline`}
                  >
                    {item.credentialUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              {owner && (
                <>
                  <button
                    onClick={() => onEdit(item)}
                    className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? "border-red-700 text-red-400 hover:bg-red-900/20" : "border-red-300 text-red-600 hover:bg-red-50"}`}
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="ml-auto px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page Component ---------- */
export default function Certificates() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [issuer, setIssuer] = useState("All");
  const [sortKey, setSortKey] = useState("newest");
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(null);
  const [verified, setVerified] = useState({});

  // persist view mode — no auto switching
  const VIEW_MODE_KEY = "certificatesViewMode";
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      return saved === "list" || saved === "grid" ? saved : "grid";
    } catch {
      return "grid";
    }
  });
  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch {}
  }, [viewMode]);

  const [showStats, setShowStats] = useState(true);

  // >>> Same dark-mode activation style as Contact.jsx <<<
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("darkModeCertificates");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("darkModeCertificates", JSON.stringify(darkMode));
    } catch {}
  }, [darkMode]);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const nav = useNavigate();
  const location = useLocation();
  const { owner } = useOwnerMode();

  // Close export menu automatically if owner mode turns off
  useEffect(() => {
    if (!owner && exportOpen) setExportOpen(false);
  }, [owner, exportOpen]);

  // Accept ?admin=1|true to toggle owner mode
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("admin")) {
      const on = params.get("admin") === "1" || params.get("admin") === "true";
      setOwnerFlag(on);
    }
  }, [location.search]);

  // Safe dynamic import of getGallery (avoids Vite named-export crash)
  const fetchGallery = useCallback(async () => {
    try {
      const mod = await import("../lib/api.js");
      const fn = mod?.getGallery;
      if (typeof fn !== "function") return [];
      const data = await fn();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, []);

  // Load (API + local) and merge
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apiData = await fetchGallery();
        const api = Array.isArray(apiData) ? apiData.map(normalizeItem) : [];
        const local = getLocalCertificates().map((c, i) =>
          normalizeItem({ ...c, _source: "local" }, i)
        );

        const map = new Map();
        [...api, ...local].forEach((c) => {
          const key = (c.title + "|" + c.issuer).toLowerCase();
          map.set(key, c);
        });

        const merged = Array.from(map.values()).filter(
          (c) => !SKIP_TITLES.includes((c.title || "").toLowerCase())
        );
        if (!cancelled) setItems(merged);
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load certificates");
          setItems([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [fetchGallery]);

  // Close export on outside click / ESC
  useEffect(() => {
    const onDocClick = (e) => {
      if (!exportOpen) return;
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setExportOpen(false);
        setPreview(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [exportOpen]);

  const issuers = useMemo(() => {
    const s = new Set();
    items.forEach((i) => i.issuer && s.add(i.issuer));
    return ["All", ...Array.from(s).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const arr = items.filter((i) => {
      const byIssuer = issuer === "All" || i.issuer === issuer;
      const hay = `${i.title} ${i.issuer} ${i.type}`.toLowerCase();
      const byQ = !q || hay.includes(q.toLowerCase());
      return byIssuer && byQ;
    });

    const parseYM = (ym) => {
      if (!/^\d{4}-\d{2}$/.test(ym || "")) return { y: 0, m: 0 };
      const [y, m] = ym.split("-").map(Number);
      return { y, m };
    };

    arr.sort((a, b) => {
      if (sortKey === "title") return a.title.localeCompare(b.title);
      if (sortKey === "issuer") return a.issuer.localeCompare(b.issuer);
      const A = parseYM(a.dateMonth), B = parseYM(b.dateMonth);
      const cmp = (B.y - A.y) || (B.m - A.m);
      return sortKey === "newest" ? cmp : -cmp;
    });

    return arr;
  }, [items, issuer, q, sortKey]);

  async function deleteApiCertificate(id) {
    try {
      const mod = await import("../lib/api.js");
      const delFn = mod?.deleteCertificate;
      if (typeof delFn !== "function") throw new Error("Delete API not available");
      await delFn(id); // requires owner token if your backend protects it
      return true;
    } catch (e) {
      alert(e?.message || "Delete failed (API). Ensure you're in Owner mode and backend supports DELETE /api/gallery/:id");
      return false;
    }
  }

  const onDelete = async (item) => {
    if (!owner) return;
    const ok = window.confirm("Delete this certificate?");
    if (!ok) return;

    if (item._source === "local") {
      const left = removeLocalCertificate(item.id).map((c, i) =>
        normalizeItem({ ...c, _source: "local" }, i)
      );
      const api = items.filter((x) => x._source !== "local");
      const map = new Map();
      [...api, ...left].forEach((c) => {
        const key = (c.title + "|" + c.issuer).toLowerCase();
        map.set(key, c);
      });
      setItems(Array.from(map.values()));
    } else {
      const okDel = await deleteApiCertificate(item.id);
      if (okDel) {
        setItems((prev) => prev.filter((c) => c.id !== item.id));
      }
    }
  };

  const goEdit = (c, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!owner) return;
    if (c._source === "local") nav(`/certificates/edit/${encodeURIComponent(c.id)}`);
    else nav("/certificates/new", { state: { prefill: c } });
  };

  async function verifyUrl(url) {
    if (!url) return false;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      try {
        const r = await fetch(url, { method: "HEAD", mode: "cors", signal: ctrl.signal });
        clearTimeout(t);
        return r.ok || r.type === "opaque";
      } catch {
        const r2 = await fetch(url, { method: "GET", mode: "no-cors", signal: ctrl.signal });
        clearTimeout(t);
        return !!r2;
      }
    } catch {
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const toCheck = filtered.filter((c) => c.credentialUrl && verified[c.id] == null);
      for (const c of toCheck) {
        const ok = await verifyUrl(c.credentialUrl);
        if (cancelled) break;
        setVerified((prev) => ({ ...prev, [c.id]: ok }));
      }
    })();
    return () => { cancelled = true; };
  }, [filtered, verified]);

  const tintFor = (c) => colorFor(c.issuer || c.title);

  // Export functionality (only used when owner is true)
  const exportData = (format) => {
    const data = filtered.map((c) => ({
      title: c.title,
      issuer: c.issuer,
      type: c.type,
      date: c.date,
      credentialId: c.credentialId,
      credentialUrl: c.credentialUrl,
    }));

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "certificates.json";
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "csv") {
      const csv = [
        ["Title", "Issuer", "Type", "Date", "Credential ID", "URL"],
        ...data.map((d) => [d.title, d.issuer, d.type, d.date, d.credentialId, d.credentialUrl]),
      ]
        .map((row) => row.map((cell) => `"${(cell ?? "").toString().replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "certificates.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <section>
        <div className="container mx-auto px-4 py-10">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Certificates & Licenses
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mt-2" />
            <p className={`mt-3 ${darkMode ? "text-gray-300" : "text-slate-600"}`}>
              Verified achievements from Udemy, Coursera, LinkedIn Learning, and professional bodies.
            </p>
          </div>

          {/* Stats */}
          {showStats && <StatsSection items={items} darkMode={darkMode} />}

          {/* Controls */}
          <div className={`${darkMode ? "bg-gray-800 text-gray-100 border border-gray-700" : "bg-white text-gray-900"} rounded-xl shadow-sm p-4 mb-6 transition-colors`}>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                {/* Search */}
                <EnhancedSearchBar value={q} onChange={setQ} darkMode={darkMode} />

                {/* Issuer Filter */}
                <div className="relative">
                  <select
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    className={`h-10 rounded-xl pr-10 pl-4 text-sm shadow-sm appearance-none transition-colors
                    ${darkMode ? "border border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700" : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"}`}
                  >
                    {issuers.map((v) => (
                      <option key={v} value={v} className={darkMode ? "bg-gray-800" : "bg-white"}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <span className={`pointer-events-none absolute inset-y-0 right-3 grid place-items-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className={`h-10 rounded-xl pr-10 pl-4 text-sm shadow-sm appearance-none transition-colors
                    ${darkMode ? "border border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700" : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"}`}
                  >
                    <option value="newest" className={darkMode ? "bg-gray-800" : "bg-white"}>Newest first</option>
                    <option value="oldest" className={darkMode ? "bg-gray-800" : "bg-white"}>Oldest first</option>
                    <option value="title" className={darkMode ? "bg-gray-800" : "bg-white"}>Title (A–Z)</option>
                    <option value="issuer" className={darkMode ? "bg-gray-800" : "bg-white"}>Issuer (A–Z)</option>
                  </select>
                  <span className={`pointer-events-none absolute inset-y-0 right-3 grid place-items-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode (persisted) */}
                <ViewModeToggle mode={viewMode} onChange={setViewMode} darkMode={darkMode} />

                {/* Stats Toggle */}
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  title="Toggle stats"
                >
                  <svg className={`${darkMode ? "text-gray-300" : "text-gray-700"} w-5 h-5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>

                {/* Export — Owner only */}
                {owner && (
                  <div className="relative" ref={exportRef}>
                    <button
                      onClick={() => setExportOpen((s) => !s)}
                      className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                      title="Export data"
                      aria-haspopup="menu"
                      aria-expanded={exportOpen ? "true" : "false"}
                    >
                      <svg className={`${darkMode ? "text-gray-300" : "text-gray-700"} w-5 h-5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    {exportOpen && (
                      <div
                        className={`absolute right-0 mt-2 w-32 rounded-lg shadow-lg z-10 border ${darkMode ? "bg-gray-800 text-gray-100 border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}
                        role="menu"
                      >
                        <button
                          onClick={() => { exportData("json"); setExportOpen(false); }}
                          className={`w-full px-4 py-2 text-left text-sm ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} rounded-t-lg`}
                          role="menuitem"
                        >
                          Export JSON
                        </button>
                        <button
                          onClick={() => { exportData("csv"); setExportOpen(false); }}
                          className={`w-full px-4 py-2 text-left text-sm ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} rounded-b-lg`}
                          role="menuitem"
                        >
                          Export CSV
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Dark/Light Mode — same UX as Contact.jsx */}
                <button
                  onClick={() => setDarkMode((v) => !v)}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    darkMode ? "border-gray-600 hover:bg-gray-800 text-gray-100" : "border-gray-300 hover:bg-gray-100 text-gray-700"
                  }`}
                  title="Toggle dark mode"
                >
                  {darkMode ? "🌙 Dark" : "☀️ Light"} Mode
                </button>

                {/* Add Certificate (owner only) */}
                {owner && (
                  <button
                    onClick={() => nav("/certificates/new")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700"
                    title="Add a new certificate"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Certificate
                  </button>
                )}
              </div>
            </div>

            {/* Count */}
            <div className={`mt-3 text-sm ${darkMode ? "text-gray-300" : "text-gray-500"}`}>
              Showing {filtered.length} of {items.length} certificate{items.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* Grid/List */}
          {err ? (
            <div className={`${darkMode ? "bg-red-900/20 border border-red-800 text-red-300" : "bg-red-50 border border-red-200 text-red-700"} rounded-xl p-4`}>
              {err}
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
              {filtered.map((c) => {
                const tint = tintFor(c);
                const ok = verified[c.id] === true;

                if (viewMode === "list") {
                  return (
                    <div
                      key={c.id}
                      className={`group rounded-xl border p-4 hover:shadow-lg transition-all cursor-pointer ${
                        darkMode ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"
                      }`}
                      onClick={() => setPreview(c)}
                    >
                      <div className="flex items-center gap-4">
                        {c.image && <img src={c.image} alt={c.title} className="w-20 h-20 object-cover rounded-lg" />}
                        <div className="flex-1">
                          <h3 className="font-semibold">{c.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span
                              className="text-xs px-2 py-1 rounded-full border"
                              style={{ color: tint, borderColor: `${tint}55`, background: `${tint}0d` }}
                            >
                              {c.type}
                            </span>
                            {c.issuer && (
                              <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                                {c.issuer}
                              </span>
                            )}
                            {c.date && (
                              <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                                {c.date}
                              </span>
                            )}
                            {c.credentialUrl && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full border ${
                                  ok
                                    ? `${darkMode ? "text-emerald-400 border-emerald-700" : "text-emerald-700 border-emerald-200"}`
                                    : `${darkMode ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-200"}`
                                }`}
                              >
                                {ok ? "Verified" : "Unverified"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Owner actions (hover only) */}
                        {owner && (
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => goEdit(c, e)}
                              className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                              className={`p-2 rounded-lg ${darkMode ? "text-red-400 hover:bg-red-900/20" : "text-red-600 hover:bg-red-50"}`}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // GRID card
                return (
                  <div
                    key={c.id}
                    className={`group relative rounded-2xl border overflow-hidden hover:shadow-xl transition-all cursor-pointer ${
                      darkMode ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"
                    }`}
                    onClick={() => setPreview(c)}
                  >
                    {/* Owner actions (hover) */}
                    {owner && (
                      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => goEdit(c, e)}
                          className={`p-2 rounded-lg border shadow-sm ${darkMode ? "bg-gray-900/80 border-gray-700 hover:bg-gray-800" : "bg-white/90 border-gray-200 hover:bg-white"}`}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                          className={`p-2 rounded-lg border shadow-sm ${darkMode ? "bg-gray-900/80 border-red-700 text-red-400 hover:bg-red-900/30" : "bg-white/90 border-red-200 text-red-600 hover:bg-red-50"}`}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}

                    <div className={`aspect-[4/3] grid place-items-center overflow-hidden ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
                      {c.image ? (
                        <img src={c.image} alt={c.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                      ) : (
                        <div className={`${darkMode ? "text-gray-300" : "text-gray-500"} text-sm`}>No image</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-2">{c.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className="text-xs px-2 py-1 rounded-full border"
                          style={{ color: tint, borderColor: `${tint}55`, background: `${tint}0d` }}
                        >
                          {c.type}
                        </span>
                        {c.issuer && (
                          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                            {c.issuer}
                          </span>
                        )}
                        {c.date && (
                          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                            {c.date}
                          </span>
                        )}
                        {c.credentialUrl && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              ok
                                ? `${darkMode ? "text-emerald-400 border-emerald-700" : "text-emerald-700 border-emerald-200"}`
                                : `${darkMode ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-200"}`
                            }`}
                          >
                            {ok ? "Verified" : "Unverified"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        <PreviewModal
          item={preview}
          onClose={() => setPreview(null)}
          onEdit={(item) => goEdit(item)}
          onDelete={(item) => onDelete(item)}
          owner={owner}
          verified={preview ? verified[preview.id] : false}
          darkMode={darkMode}
        />

        {/* Utility clamp */}
        <style>{`
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </section>
    </div>
  );
}
