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
  getCertificates,          // ← use detailed endpoint
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
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  return [darkMode, setDarkMode];
}

/* ----------------------------- Dark Mode Toggle ---------------------------- */
function DarkModeToggle({ darkMode, setDarkMode }) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-8
00 shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-200 dark:border-gray-700"
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

/* Toast notification component */
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 left-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all transform translate-x-0 ${
        type === "success"
          ? "bg-green-600"
          : type === "error"
          ? "bg-red-600"
          : "bg-blue-600"
      }`}
    >
      <div className="flex items-center gap-2">
        {type === "success" && <span>✓</span>}
        {type === "error" && <span>✗</span>}
        {type === "info" && <span>ℹ</span>}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70" type="button">
          ×
        </button>
      </div>
    </div>
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
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowYears(false);
      }
    };
    const onEscape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setShowYears(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
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
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowYears((v) => !v)}
              className="text-lg font-semibold px-4 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100"
            >
              {year}
            </button>

            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
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
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
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
          className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
          placeholder="Add skills (comma separated)…"
        />
        <button
          type="button"
          onClick={add}
          className="px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
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
                className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
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
  const [header, base64] = (dataUrl || "").split(",");
  const match = /data:(.*?);base64/.exec(header || "");
  const mime = match?.[1] || "image/png";
  const bin = base64 ? atob(base64) : "";
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
  const [toast, setToast] = useState(null);
  const imgInputRef = useRef(null);
  const imgPreviewRef = useRef(null);

  // Utility: validate YYYY-MM
  const isValidYm = (s) => !s || /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

  // Load for edit or new (with prefill)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (isEditing) {
          // 1) Try local first
          const local = getLocalCertificateById(id);
          if (local) {
            if (!mounted) return;
            setForm((f) => ({ ...f, ...local, id: local.id, updatedAt: local.updatedAt || null }));
            return;
          }
          // 2) Fallback: query server certificates (full detail) and locate by id
          const serverList = await getCertificates().catch(() => []);
          const found = Array.isArray(serverList)
            ? serverList.find((g) => String(g.id) === String(id))
            : null;

          if (found) {
            if (!mounted) return;
            setForm((f) => {
              const issuer       = found.issuer ?? found.provider ?? found.platform ?? f.issuer ?? "";
              const type         = found.type ?? found.category ?? f.type ?? "Certificate";
              const dateMonth    = found.dateMonth ?? found.date_month ?? f.dateMonth ?? "";
              const credentialUrl= found.credentialUrl ?? found.verifyUrl ?? found.link ?? f.credentialUrl ?? "";
              const credentialId = found.credentialId ?? found.certificateId ?? f.credentialId ?? "";
              const image        = found.imageUrl ?? found.image_url ?? found.image ?? f.image ?? "";
              const skills       = Array.isArray(found.skills) ? found.skills :
                                   (Array.isArray(found.tags) ? found.tags : f.skills);

              return {
                ...f,
                id: found.id ?? f.id,
                title: found.title ?? f.title ?? "",
                issuer,
                type,
                dateMonth,
                credentialUrl,
                credentialId,
                image,
                description: found.description ?? f.description ?? "",
                skills,
                updatedAt: found.updatedAt ?? f.updatedAt ?? null,
              };
            });
          } else {
            if (!mounted) return;
            setError("Certificate not found.");
          }
        } else if (prefill) {
          const nextId = `cert-${Date.now()}`;
          if (!mounted) return;
          setForm((f) => ({
            ...f,
            id: nextId,
            title: prefill.title ?? "",
            issuer: prefill.issuer ?? prefill.provider ?? prefill.platform ?? "",
            type: prefill.type ?? prefill.category ?? "Certificate",
            dateMonth: prefill.dateMonth ?? prefill.date_month ?? "",
            credentialUrl: prefill.credentialUrl ?? prefill.verifyUrl ?? prefill.link ?? "",
            credentialId: prefill.credentialId ?? prefill.certificateId ?? "",
            image: prefill.image ?? prefill.imageUrl ?? prefill.image_url ?? "",
            description: prefill.description ?? "",
            skills: Array.isArray(prefill.skills) ? prefill.skills :
                    (Array.isArray(prefill.tags) ? prefill.tags : []),
          }));
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to initialize form.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, isEditing, prefill]);

  // Paste image from clipboard
  useEffect(() => {
    const onPaste = async (e) => {
      try {
        if (!e.clipboardData) return;
        const file = Array.from(e.clipboardData.files || [])[0];
        if (file && file.type?.startsWith("image/")) {
          const dataUrl = await toDataUrl(file);
          setForm((f) => ({ ...f, image: dataUrl }));
          setToast({ message: "Image pasted successfully!", type: "success" });
        }
      } catch {
        setToast({ message: "Failed to paste image", type: "error" });
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const handleChange = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await toDataUrl(file);
      setForm((f) => ({ ...f, image: dataUrl }));
      setToast({ message: "Image uploaded successfully!", type: "success" });
    } catch {
      setToast({ message: "Failed to process image", type: "error" });
    }
  };

  async function verifyCertLink() {
    setLinkStatus("");
    const raw = (form.credentialUrl || "").trim();
    if (!raw) {
      setToast({ message: "Please enter a URL first", type: "info" });
      return;
    }
    // Normalize URL (avoid user entering without scheme)
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      setLinkStatus("Checking…");
      const r = await resolveCertificateUrl(url); // backend proxy, no browser fetch
      if (r?.ok) {
        setLinkStatus(`✓ Valid ${r.status}${r.finalUrl ? ` • Redirects to: ${r.finalUrl}` : ""}`);
        setToast({ message: "Credential link verified!", type: "success" });
      } else {
        setLinkStatus(`✗ Unreachable${r?.status ? ` (status ${r.status})` : ""}`);
        setToast({ message: "Credential link appears to be invalid", type: "error" });
      }
    } catch (e) {
      setLinkStatus(`✗ Error: ${e?.message || "Unknown error"}`);
      setToast({ message: `Link verification failed: ${e?.message || "Unknown error"}`, type: "error" });
    }
  }

  async function ensureImageOnServerIfNeeded(payload) {
    // If owner mode and image is a data URL, upload and replace with server URL.
    const img = form.image || "";
    if (!owner || !img.startsWith("data:")) return payload;
    try {
      setToast({ message: "Uploading image...", type: "info" });
      const file = dataUrlToFile(img, "certificate.png");
      const up = await uploadProfileImage(file); // { url: "/uploads/..." }
      if (up?.url) {
        setToast({ message: "Image uploaded to server!", type: "success" });
        return { ...payload, imageUrl: up.url };
      }
    } catch {
      setToast({ message: "Image upload failed, saving locally", type: "error" });
      // ignore upload errors; fall back to existing value
    }
    return payload;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.issuer.trim()) {
      setError("Issuer is required.");
      return;
    }
    if (!isValidYm(form.dateMonth)) {
      setError("Month/Year must be in YYYY-MM format.");
      return;
    }

    try {
      setSaving(true);

      // Build payload for API (fields match CertificateUpsertReq in backend)
      let payload = {
        title: form.title.trim(),
        description: form.description?.trim() || "",
        imageUrl: form.image || "",
        skills: Array.isArray(form.skills) ? form.skills : [],
        sortOrder: 0,
        issuer: form.issuer?.trim() || null,
        type: form.type?.trim() || "Certificate",
        dateMonth: form.dateMonth || null, // "YYYY-MM"
        credentialId: form.credentialId?.trim() || null,
        credentialUrl: (form.credentialUrl || "").trim() || null,
      };

      payload = await ensureImageOnServerIfNeeded(payload);

      if (owner) {
        // Persist to server
        if (isEditing && isGuid(id)) {
          await apiUpdateCertificate(id, payload); // PUT /api/gallery/{guid}
          setToast({ message: "Certificate updated successfully!", type: "success" });
        } else {
          await createCertificate(payload); // POST /api/gallery
          setToast({ message: "Certificate created successfully!", type: "success" });
        }
      } else {
        // Local fallback (no backend write)
        const row = { ...form, updatedAt: new Date().toISOString() };
        if (isEditing) {
          updateLocalCertificate(row);
          setToast({ message: "Certificate updated locally!", type: "success" });
        } else {
          const exists = getLocalCertificates().some((c) => String(c.id) === String(row.id));
          const assignId = exists ? `cert-${Date.now()}` : row.id;
          saveLocalCertificate({ ...row, id: assignId });
          setToast({ message: "Certificate saved locally!", type: "success" });
        }
      }

      // Navigate after a short delay to show the toast
      setTimeout(() => nav("/certificates"), 1000);
    } catch (err) {
      setError(err?.message || "Failed to save certificate.");
      setToast({ message: "Failed to save certificate", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <Reveal>
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 shadow-sm"
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
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
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
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
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
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
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
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
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
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
                  placeholder="https://…"
                  type="url"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={verifyCertLink}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
                    title="Check link without CORS issues"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Check link
                  </button>
                  {linkStatus && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        linkStatus.includes("✓")
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          : linkStatus.includes("✗")
                          ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                          : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
                      }`}
                    >
                      {linkStatus}
                    </span>
                  )}
                  {form.credentialUrl && (
                    <a
                      className="ml-auto text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      href={/^https?:\/\//i.test(form.credentialUrl) ? form.credentialUrl : `https://${form.credentialUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open in new tab
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 Tip: Paste an image from your clipboard (Ctrl+V) to attach it quickly.
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
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all resize-none"
                  placeholder="Optional notes or details about this certificate…"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Skills & Topics
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
                  className="relative rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("border-indigo-400");
                    e.currentTarget.classList.add("dark:border-indigo-500");
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-indigo-400");
                    e.currentTarget.classList.remove("dark:border-indigo-500");
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-indigo-400");
                    e.currentTarget.classList.remove("dark:border-indigo-500");
                    const file = e.dataTransfer?.files?.[0];
                    if (file && file.type?.startsWith("image/")) {
                      await handleFile(file);
                    } else if (file) {
                      setToast({ message: "Please drop an image file", type: "error" });
                    }
                  }}
                >
                  {form.image ? (
                    <div className="relative">
                      <img
                        ref={imgPreviewRef}
                        src={form.image}
                        alt="Certificate preview"
                        className="w-full aspect-[4/3] object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => imgInputRef.current?.click()}
                            className="px-3 py-2 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
                          >
                            Change Image
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      className="w-full aspect-[4/3] grid place-items-center text-gray-400 dark:text-gray-500"
                    >
                      <div className="text-center pointer-events-none">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Drop image here, paste (Ctrl+V), or click to browse</p>
                        <p className="text-xs mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    </button>
                  )}

                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between gap-2">
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleFile(file);
                        }
                        e.target.value = "";
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => imgInputRef.current?.click()}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {form.image ? "Change" : "Choose"} Image
                      </button>
                      {form.image && (
                        <button
                          type="button"
                          onClick={() => {
                            handleChange("image", "");
                            setToast({ message: "Image removed", type: "info" });
                          }}
                          className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {form.image ? "✓ Image ready" : "No image"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isEditing ? "Save Changes" : "Save Certificate"}
                    </>
                  )}
                </button>

                <Link
                  to="/certificates"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors text-center font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Certificates
                </Link>
              </div>

              {/* Quick Tips */}
              <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Quick Tips</h4>
                <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Use Ctrl+V to paste images from clipboard</li>
                  <li>• Drag and drop images directly onto the upload area</li>
                  <li>• Add multiple skills separated by commas</li>
                  <li>• Use "Check link" to verify credential URLs</li>
                  <li>• All fields except Title and Issuer are optional</li>
                </ul>
              </div>
            </div>
          </form>
        </Reveal>
      </div>

      {/* Utility styles */}
      <style>{`
        /* Ensure dark mode compatibility placeholders */
        .dark input::placeholder,
        .dark textarea::placeholder {
          color: rgb(156 163 175);
        }

        /* Smooth transitions for interactive elements */
        input, textarea, button, select {
          transition: all 0.2s ease-in-out;
        }

        /* Focus visible for accessibility */
        input:focus-visible,
        textarea:focus-visible,
        button:focus-visible {
          outline: 2px solid rgb(99 102 241);
          outline-offset: 2px;
        }
      `}</style>
    </section>
  );
}
