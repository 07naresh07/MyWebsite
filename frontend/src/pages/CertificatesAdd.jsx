// src/pages/CertificatesAdd.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  saveLocalCertificate,
  updateLocalCertificate,
  getLocalCertificateById,
  getLocalCertificates,
  toDataUrl,
} from "../lib/certsLocal.js";
import {
  createCertificate,
  updateCertificate as apiUpdateCertificate,
  getGallery,
  resolveCertificateUrl,
  uploadProfileImage, // reuse upload endpoint for images
} from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";
import Reveal from "../components/Reveal.jsx";

/* ----------------------------- Dark Mode Hook ----------------------------- */
function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("darkMode");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    } catch {}
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return [darkMode, setDarkMode];
}

/* ----------------------------- Dark Mode Toggle ---------------------------- */
function DarkModeToggle({ darkMode, setDarkMode }) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 group"
      aria-label="Toggle dark mode"
      type="button"
    >
      {darkMode ? (
        <svg
          className="w-6 h-6 text-yellow-500 group-hover:rotate-180 transition-transform duration-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className="w-6 h-6 text-gray-700 group-hover:rotate-12 transition-transform duration-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}

/* ------------------------------ Month Picker ------------------------------ */
function MonthPicker({ value, onChange, id }) {
  const toLabel = (ym) => {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "";
    const [y, m] = ym.split("-");
    return `${m}/${y}`;
  };

  const toValue = (label) => {
    const s = (label || "").trim();
    const m = s.match(/^(\d{1,2})[\/\-\.](\d{4})$/);
    if (!m) return "";
    const mm = String(m[1]).padStart(2, "0");
    const yy = m[2];
    if (+mm < 1 || +mm > 12) return "";
    return `${yy}-${mm}`;
  };

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() =>
    value && /^\d{4}-\d{2}$/.test(value) ? Number(value.slice(0, 4)) : new Date().getFullYear()
  );
  const [showYears, setShowYears] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) setYear(Number(value.slice(0, 4)));
  }, [value]);

  const years = useMemo(() => {
    const pivot = year || new Date().getFullYear();
    const start = pivot - 7;
    return Array.from({ length: 15 }, (_, i) => start + i);
  }, [year]);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          placeholder="MM/YYYY"
          value={toLabel(value)}
          onChange={(e) => onChange(toValue(e.target.value))}
          onFocus={() => setOpen(true)}
          className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
          inputMode="numeric"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-11 w-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors grid place-items-center"
          aria-label="Open month picker"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="text-gray-600 dark:text-gray-400"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-2 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 dark:text-gray-400" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowYears((v) => !v)}
              className="text-lg font-semibold px-4 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {year}
            </button>

            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 dark:text-gray-400" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {showYears ? (
            <div className="grid grid-cols-3 gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setYear(y);
                    setShowYears(false);
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    y === year
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {months.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    const mm = String(idx + 1).padStart(2, "0");
                    onChange(`${year}-${mm}`);
                    setOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Skills Chips ------------------------------ */
function SkillsEditor({ value = [], onChange }) {
  const [text, setText] = useState("");

  const add = useCallback(() => {
    const t = text.trim();
    if (!t) return;
    const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
    onChange(Array.from(new Set([...(value || []), ...parts])));
    setText("");
  }, [text, value, onChange]);

  const remove = (tag) => onChange((value || []).filter((t) => t !== tag));

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-gray-900 dark:text-gray-100"
          placeholder="Add skills (comma separated)…"
        />
        <button
          type="button"
          onClick={add}
          className="px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Add
        </button>
      </div>
      {value?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
                aria-label={`Remove ${t}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------- helpers: dataURL → File -------------------------- */
function dataUrlToFile(dataUrl, filename = "image.png") {
  const [header, base64] = dataUrl.split(",");
  const match = /data:(.*?);base64/.exec(header || "");
  const mime = match?.[1] || "image/png";
  const bin = atob(base64 || "");
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return new File([u8], filename, { type: mime });
}

const isGuid = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));

/* ============================== Main Component ============================= */
export default function CertificatesAdd() {
  const { id } = useParams(); // /certificates/edit/:id or undefined for new
  const isEditing = Boolean(id);
  const nav = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useDarkMode();
  const { owner } = useOwnerMode();

  const prefill = location.state?.prefill || null;

  const [form, setForm] = useState({
    id: `cert-${Date.now()}`,
    title: "",
    issuer: "",
    type: "Certificate",
    dateMonth: "",
    credentialUrl: "",
    credentialId: "",
    image: "",
    description: "",
    skills: [],
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [linkStatus, setLinkStatus] = useState(""); // CORS-safe link check
  const imgInputRef = useRef(null);
  const imgPreviewRef = useRef(null);

  // Utility: validate YYYY-MM
  const isValidYm = (s) => !s || /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

  // Load for edit or new (with prefill)
  useEffect(() => {
    (async () => {
      try {
        if (isEditing) {
          // 1) Try local first
          const local = getLocalCertificateById(id);
          if (local) {
            setForm((f) => ({ ...f, ...local, id: local.id, updatedAt: local.updatedAt || null }));
            return;
          }
          // 2) Fallback: query server gallery (backend returns an ARRAY)
          const serverList = await getGallery().catch(() => []);
          const found = Array.isArray(serverList)
            ? serverList.find((g) => String(g.id) === String(id))
            : null;

          if (found) {
            setForm((f) => ({
              ...f,
              id: found.id,
              title: found.title || "",
              // gallery GET doesn't include issuer/type/credential fields — keep editable
              issuer: "",
              type: "Certificate",
              dateMonth: "",
              credentialUrl: "",
              credentialId: "",
              image: found.imageUrl || found.image_url || "",
              description: found.description || "",
              skills: Array.isArray(found.tags) ? found.tags : [],
              updatedAt: found.updatedAt || null,
            }));
          } else {
            setError("Certificate not found.");
          }
        } else if (prefill) {
          const nextId = `cert-${Date.now()}`;
          setForm((f) => ({
            ...f,
            id: nextId,
            title: prefill.title || "",
            issuer: prefill.issuer || "",
            type: prefill.type || "Certificate",
            dateMonth: prefill.dateMonth || "",
            credentialUrl: prefill.credentialUrl || prefill.link || "",
            credentialId: prefill.credentialId || "",
            image: prefill.image || prefill.imageUrl || "",
            description: prefill.description || "",
            skills: Array.isArray(prefill.skills) ? prefill.skills : [],
          }));
        }
      } catch (e) {
        setError(e?.message || "Failed to initialize form.");
      }
    })();
  }, [id, isEditing, prefill]);

  // Paste image from clipboard
  useEffect(() => {
    const onPaste = async (e) => {
      if (!e.clipboardData) return;
      const file = Array.from(e.clipboardData.files || [])[0];
      if (file && file.type.startsWith("image/")) {
        const dataUrl = await toDataUrl(file);
        setForm((f) => ({ ...f, image: dataUrl }));
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const handleChange = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleFile = async (file) => {
    if (!file) return;
    const dataUrl = await toDataUrl(file);
    setForm((f) => ({ ...f, image: dataUrl }));
  };

  async function verifyCertLink() {
    setLinkStatus("");
    const url = (form.credentialUrl || "").trim();
    if (!url) return;
    try {
      setLinkStatus("Checking…");
      const r = await resolveCertificateUrl(url); // backend proxy, no browser-to-LinkedIn fetch
      if (r?.ok) {
        setLinkStatus(`OK ${r.status}${r.finalUrl ? ` • final: ${r.finalUrl}` : ""}`);
      } else {
        setLinkStatus(`Unreachable (status ${r?.status ?? "?"})`);
      }
    } catch (e) {
      setLinkStatus(`Error: ${e.message}`);
    }
  }

  async function ensureImageOnServerIfNeeded(payload) {
    // If owner mode and image is a data URL, upload and replace with server URL.
    const img = form.image || "";
    if (!owner || !img.startsWith("data:")) return payload;
    try {
      const file = dataUrlToFile(img, "certificate.png");
      const up = await uploadProfileImage(file); // { url: "/uploads/..." }
      if (up?.url) {
        return { ...payload, imageUrl: up.url };
      }
    } catch {
      // ignore upload errors; fall back to existing value
    }
    return payload;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) return setError("Title is required.");
    if (!form.issuer.trim()) return setError("Issuer is required.");
    if (!isValidYm(form.dateMonth)) return setError("Month/Year must be in YYYY-MM format.");

    try {
      setSaving(true);

      // Build payload for API (fields match CertificateUpsertReq in backend)
      let payload = {
        title: form.title.trim(),
        description: form.description?.trim() || "",
        imageUrl: form.image || "", // replaced by server URL if uploaded below
        skills: Array.isArray(form.skills) ? form.skills : [], // <-- backend expects 'skills'
        sortOrder: 0,
        // extra certificate fields (backend stores on certificates table)
        issuer: form.issuer?.trim() || null,
        type: form.type?.trim() || "Certificate",
        dateMonth: form.dateMonth || null, // "YYYY-MM"
        credentialId: form.credentialId?.trim() || null,
        credentialUrl: form.credentialUrl?.trim() || null,
      };

      payload = await ensureImageOnServerIfNeeded(payload);

      if (owner) {
        // Persist to server
        if (isEditing && isGuid(id)) {
          await apiUpdateCertificate(id, payload); // PUT /api/gallery/{guid}
        } else {
          await createCertificate(payload); // POST /api/gallery
        }
      } else {
        // Local fallback (no backend write)
        const row = { ...form, updatedAt: new Date().toISOString() };
        if (isEditing) {
          updateLocalCertificate(row);
        } else {
          const exists = getLocalCertificates().some((c) => String(c.id) === String(row.id));
          const assignId = exists ? `cert-${Date.now()}` : row.id;
          saveLocalCertificate({ ...row, id: assignId });
        }
      }

      nav("/certificates");
    } catch (err) {
      setError(err?.message || "Failed to save certificate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-10">
        <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />

        <div className="mb-6">
          <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            {isEditing ? "Edit Certificate" : "Add Certificate"}
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mt-2" />
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            {isEditing
              ? "Update details and keep your achievements organized."
              : "Save a copy of your certificate."}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3">
            {error}
          </div>
        )}

        <Reveal>
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left column: inputs */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                  placeholder="e.g., AWS Certified Cloud Practitioner"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Issuer / Platform *
                  </label>
                  <input
                    value={form.issuer}
                    onChange={(e) => handleChange("issuer", e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                    placeholder="e.g., Coursera, AWS, LinkedIn Learning"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <input
                    value={form.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                    placeholder="Certificate / License / Award"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Month / Year
                  </label>
                  <MonthPicker
                    id="cert-month"
                    value={form.dateMonth}
                    onChange={(v) => handleChange("dateMonth", v)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Credential ID
                  </label>
                  <input
                    value={form.credentialId}
                    onChange={(e) => handleChange("credentialId", e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Verification URL
                </label>
                <input
                  value={form.credentialUrl}
                  onChange={(e) => handleChange("credentialUrl", e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                  placeholder="https://…"
                  type="url"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={verifyCertLink}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                    title="Check link without CORS issues"
                  >
                    Check link
                  </button>
                  {linkStatus && (
                    <span className="text-xs text-gray-600 dark:text-gray-400">{linkStatus}</span>
                  )}
                  {form.credentialUrl && (
                    <a
                      className="ml-auto text-sm text-indigo-600 hover:underline"
                      href={form.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in new tab →
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tip: paste an image from your clipboard to attach it quickly.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
                  placeholder="Optional notes or details…"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Skills
                </label>
                <SkillsEditor
                  value={form.skills}
                  onChange={(next) =>
                    handleChange("skills", typeof next === "function" ? next(form.skills) : next)
                  }
                />
              </div>
            </div>

            {/* Right column: image + actions */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Certificate Image
                </label>

                <div
                  className="relative rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 overflow-hidden"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      await handleFile(file);
                    }
                  }}
                >
                  {form.image ? (
                    <img
                      ref={imgPreviewRef}
                      src={form.image}
                      alt="Certificate"
                      className="w-full aspect-[4/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] grid place-items-center text-gray-400">
                      Drop image here, paste, or use the picker
                    </div>
                  )}

                  <div className="p-3 flex items-center justify-between gap-2">
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        await handleFile(file);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => imgInputRef.current?.click()}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      >
                        Choose Image
                      </button>
                      {form.image && (
                        <button
                          type="button"
                          onClick={() => handleChange("image", "")}
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Supported: PNG/JPG (or paste)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/certificates"
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : isEditing ? "Save Changes" : "Save Certificate"}
                </button>
              </div>
            </div>
          </form>
        </Reveal>
      </div>

      {/* small utilities */}
      <style>{`
        .aspect-4\\/3 { aspect-ratio: 4 / 3; }
      `}</style>
    </section>
  );
}
