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
  getCertificates,
  resolveCertificateUrl,      // ✅ bring back verification check (optional)
  uploadProfileImage,
} from "../lib/api.js";
import { useOwnerMode } from "../lib/owner.js";
import Reveal from "../components/Reveal.jsx";

/* ----------------------------- Constants ----------------------------- */
const ISSUER_OPTIONS = [
  "Coursera","edX","Udemy","Udacity","LinkedIn Learning","Google","AWS","Microsoft","IBM","Meta",
  "Oracle","Pluralsight","Codecademy","freeCodeCamp","HarvardX","MITx","Stanford Online","Khan Academy",
  "HubSpot Academy","Salesforce","Cisco","CompTIA","Linux Foundation","Red Hat","Datacamp","Alison","Springboard",
];
const CUSTOM_VALUE = "__custom__";

const TYPE_OPTIONS = [
  "Certificate","Course","Specialization","Professional Certificate","Nanodegree","Bootcamp","Workshop",
  "Training","Badge","Exam","License","Award","Diploma","Degree","Webinar","Other",
];

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
        <svg className="w-6 h-6 text-yellow-500 group-hover:rotate-180 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707z" clipRule="evenodd"/>
        </svg>
      ) : (
        <svg className="w-6 h-6 text-gray-700 group-hover:rotate-12 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20">
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-600 dark:text-gray-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-2 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setYear((y) => y - 1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 dark:text-gray-400" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>

            <button type="button" onClick={() => setShowYears((v) => !v)} className="text-lg font-semibold px-4 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              {year}
            </button>

            <button type="button" onClick={() => setYear((y) => y + 1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600 dark:text-gray-400" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          {showYears ? (
            <div className="grid grid-cols-3 gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setYear(y); setShowYears(false); }}
                  className={`px-3 py-2 rounded-lg border text-sm ${y === year ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"}`}
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
                  onClick={() => { const mm = String(idx + 1).padStart(2, "0"); onChange(`${year}-${mm}`); setOpen(false); }}
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
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-gray-900 dark:text-gray-100"
          placeholder="Add skills (comma separated)…"
        />
        <button type="button" onClick={add} className="px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
          Add
        </button>
      </div>
      {value?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              {t}
              <button type="button" onClick={() => remove(t)} className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5" aria-label={`Remove ${t}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
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

const pick = (v, fallback = "") => (v == null ? fallback : v);
const truthy = (v) => v !== undefined && v !== null && v !== "";
const coalesce = (...vals) => vals.find(truthy);

/* ============================== Main Component ============================= */
export default function CertificatesAdd() {
  const { id } = useParams();
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
    type: "",                 // ✅ no default; user must choose
    dateMonth: "",
    credentialUrl: "",        // ✅ back in form & UI
    credentialId: "",
    image: "",
    description: "",
    skills: [],
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });

  // dropdown/custom mirrors
  const [issuerChoice, setIssuerChoice] = useState("");
  const [issuerCustom, setIssuerCustom] = useState("");
  const [typeChoice, setTypeChoice] = useState("");
  const [typeCustom, setTypeCustom] = useState("");
  const [linkStatus, setLinkStatus] = useState("");  // ✅ status for verify button

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const imgInputRef = useRef(null);
  const imgPreviewRef = useRef(null);

  const isValidYm = (s) => !s || /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

  const loadServerById = useCallback(async (guid) => {
    try {
      const all = await getCertificates();
      if (Array.isArray(all)) {
        const hit = all.find((c) => String(c.id) === String(guid));
        if (hit) return hit;
      }
    } catch {}
    try {
      const gallery = await getGallery();
      if (Array.isArray(gallery)) {
        const hit = gallery.find((g) => String(g.id) === String(guid));
        if (hit) return hit;
      }
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (isEditing) {
          const local = getLocalCertificateById(id);
          if (local) {
            setForm((f) => ({ ...f, ...local, id: local.id, updatedAt: local.updatedAt || null }));
          } else if (isGuid(id)) {
            const found = await loadServerById(id);
            if (found) {
              setForm((f) => ({
                ...f,
                id: found.id,
                title: pick(found.title, ""),
                issuer: coalesce(found.issuer, found.provider, found.platform, ""),
                type: pick(found.type, ""),
                dateMonth: pick(found.dateMonth, ""),
                credentialUrl: coalesce(found.credentialUrl, found.verifyUrl, found.link, ""),
                credentialId: pick(found.credentialId, ""),
                image: coalesce(found.imageUrl, found.image_url, found.image, ""),
                description: pick(found.description, ""),
                skills: Array.isArray(found.skills) ? found.skills : Array.isArray(found.tags) ? found.tags : [],
                updatedAt: found.updatedAt || null,
              }));
            } else {
              setError("Certificate not found.");
            }
          } else {
            setError("Certificate not found.");
          }
        } else if (prefill) {
          const nextId = prefill.id || `cert-${Date.now()}`;
          let merged = {
            id: nextId,
            title: pick(prefill.title, ""),
            issuer: coalesce(prefill.issuer, prefill.provider, prefill.platform, ""),
            type: pick(prefill.type, ""),
            dateMonth: pick(prefill.dateMonth, ""),
            credentialUrl: coalesce(prefill.credentialUrl, prefill.link, ""),
            credentialId: pick(prefill.credentialId, ""),
            image: coalesce(prefill.image, prefill.imageUrl, ""),
            description: pick(prefill.description, ""),
            skills: Array.isArray(prefill.skills) ? prefill.skills : Array.isArray(prefill.tags) ? prefill.tags : [],
          };
          if (isGuid(nextId)) {
            const full = await loadServerById(nextId);
            if (full) {
              merged = {
                ...merged,
                issuer: truthy(merged.issuer) ? merged.issuer : coalesce(full.issuer, full.provider, full.platform, ""),
                type: truthy(merged.type) ? merged.type : pick(full.type, ""),
                dateMonth: truthy(merged.dateMonth) ? merged.dateMonth : pick(full.dateMonth, ""),
                credentialUrl: truthy(merged.credentialUrl) ? merged.credentialUrl : coalesce(full.credentialUrl, full.verifyUrl, full.link, ""),
                credentialId: truthy(merged.credentialId) ? merged.credentialId : pick(full.credentialId, ""),
                image: truthy(merged.image) ? merged.image : coalesce(full.imageUrl, full.image_url, full.image, ""),
                description: truthy(merged.description) ? merged.description : pick(full.description, ""),
                skills: merged.skills?.length ? merged.skills : Array.isArray(full.skills) ? full.skills : Array.isArray(full.tags) ? full.tags : [],
              };
            }
          }
          setForm((f) => ({ ...f, ...merged }));
        }
      } catch (e) {
        setError(e?.message || "Failed to initialize form.");
      }
    })();
  }, [id, isEditing, prefill, loadServerById]);

  // sync dropdown mirrors
  useEffect(() => {
    if (form.issuer && ISSUER_OPTIONS.includes(form.issuer)) {
      setIssuerChoice(form.issuer); setIssuerCustom("");
    } else if (form.issuer) {
      setIssuerChoice(CUSTOM_VALUE); setIssuerCustom(form.issuer);
    } else { setIssuerChoice(""); setIssuerCustom(""); }

    if (form.type && TYPE_OPTIONS.includes(form.type)) {
      setTypeChoice(form.type); setTypeCustom("");
    } else if (form.type) {
      setTypeChoice(CUSTOM_VALUE); setTypeCustom(form.type);
    } else { setTypeChoice(""); setTypeCustom(""); }
  }, [form.issuer, form.type]);

  // paste image
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

  const handleFile = async (file) => {
    if (!file) return;
    const dataUrl = await toDataUrl(file);
    setForm((f) => ({ ...f, image: dataUrl }));
  };

  async function ensureImageOnServerIfNeeded(payload) {
    const img = form.image || "";
    if (!owner || !img.startsWith("data:")) return payload;
    try {
      const file = dataUrlToFile(img, "certificate.png");
      const up = await uploadProfileImage(file);
      if (up?.url) return { ...payload, imageUrl: up.url };
    } catch {}
    return payload;
  }

  // ✅ optional check button for verification url
  async function verifyCertLink() {
    const url = (form.credentialUrl || "").trim();
    setLinkStatus("");
    if (!url) return;
    try {
      setLinkStatus("Checking…");
      const r = await resolveCertificateUrl(url);
      if (r?.ok) setLinkStatus(`OK ${r.status}${r.finalUrl ? ` • final: ${r.finalUrl}` : ""}`);
      else setLinkStatus(`Unreachable (status ${r?.status ?? "?"})`);
    } catch (e) {
      setLinkStatus(`Error: ${e.message}`);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // finalize issuer/type from mirrors
    const effectiveIssuer = issuerChoice === CUSTOM_VALUE ? issuerCustom.trim() : issuerChoice || form.issuer;
    const effectiveType   = typeChoice   === CUSTOM_VALUE ? typeCustom.trim()   : typeChoice   || form.type;

    if (!form.title.trim()) return setError("Title is required.");
    if (!effectiveIssuer)   return setError("Issuer is required.");
    if (!effectiveType)     return setError("Type is required.");            // ✅ must be user-chosen
    if (!isValidYm(form.dateMonth)) return setError("Month/Year must be in YYYY-MM format.");

    try {
      setSaving(true);

      let payload = {
        title: form.title.trim(),
        description: form.description?.trim() || "",
        imageUrl: form.image || "",
        skills: Array.isArray(form.skills) ? form.skills : [],
        sortOrder: 0,
        issuer: effectiveIssuer,
        type: effectiveType,                                             // ✅ exactly what the user chose
        dateMonth: form.dateMonth || null,
        credentialId: form.credentialId?.trim() || null,
        credentialUrl: form.credentialUrl?.trim() || null,               // ✅ saved
      };

      payload = await ensureImageOnServerIfNeeded(payload);

      const targetId =
        isEditing && isGuid(id)
          ? id
          : prefill && isGuid(prefill.id)
          ? prefill.id
          : null;

      if (owner) {
        if (targetId) {
          await apiUpdateCertificate(targetId, payload);
        } else {
          await createCertificate(payload);
        }
      } else {
        const row = {
          ...form,
          issuer: payload.issuer,
          type: payload.type,
          credentialUrl: payload.credentialUrl,                           // ✅ persisted locally too
          updatedAt: new Date().toISOString(),
        };
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
            {isEditing || (prefill && isGuid(prefill.id)) ? "Edit Certificate" : "Add Certificate"}
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mt-2" />
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            {isEditing || (prefill && isGuid(prefill.id))
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                  placeholder="e.g., AWS Certified Cloud Practitioner"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Issuer */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Issuer / Platform *</label>
                  <select
                    value={issuerChoice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setIssuerChoice(v);
                      if (v === CUSTOM_VALUE) {
                        setForm((f) => ({ ...f, issuer: issuerCustom.trim() }));
                      } else {
                        setIssuerCustom("");
                        setForm((f) => ({ ...f, issuer: v }));
                      }
                    }}
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                    required
                  >
                    <option value="" disabled>— Select issuer —</option>
                    {ISSUER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    <option value={CUSTOM_VALUE}>Custom…</option>
                  </select>
                  {issuerChoice === CUSTOM_VALUE && (
                    <input
                      value={issuerCustom}
                      onChange={(e) => { setIssuerCustom(e.target.value); setForm((f) => ({ ...f, issuer: e.target.value })); }}
                      className="mt-2 w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                      placeholder="Type custom issuer…"
                    />
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type *</label>
                  <select
                    value={typeChoice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTypeChoice(v);
                      if (v === CUSTOM_VALUE) {
                        setForm((f) => ({ ...f, type: typeCustom.trim() }));
                      } else {
                        setTypeCustom("");
                        setForm((f) => ({ ...f, type: v }));
                      }
                    }}
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                    required
                  >
                    <option value="" disabled>— Select type —</option>
                    {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    <option value={CUSTOM_VALUE}>Custom…</option>
                  </select>
                  {typeChoice === CUSTOM_VALUE && (
                    <input
                      value={typeCustom}
                      onChange={(e) => { setTypeCustom(e.target.value); setForm((f) => ({ ...f, type: e.target.value })); }}
                      className="mt-2 w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                      placeholder="Type custom kind…"
                    />
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Month / Year</label>
                  <MonthPicker id="cert-month" value={form.dateMonth} onChange={(v) => setForm((f) => ({ ...f, dateMonth: v }))} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Credential ID</label>
                  <input
                    value={form.credentialId}
                    onChange={(e) => setForm((f) => ({ ...f, credentialId: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* ✅ Verification URL (back) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Verification URL</label>
                <input
                  value={form.credentialUrl}
                  onChange={(e) => setForm((f) => ({ ...f, credentialUrl: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
                  placeholder="https://…"
                  type="url"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={verifyCertLink}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                    title="Check link"
                  >
                    Check link
                  </button>
                  {linkStatus && <span className="text-xs text-gray-600 dark:text-gray-400">{linkStatus}</span>}
                  {form.credentialUrl && (
                    <a className="ml-auto text-sm text-indigo-600 hover:underline" href={form.credentialUrl} target="_blank" rel="noopener noreferrer">
                      Open in new tab →
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
                  placeholder="Optional notes or details…"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Skills</label>
                <SkillsEditor
                  value={form.skills}
                  onChange={(next) => setForm((f) => ({ ...f, skills: typeof next === "function" ? next(f.skills) : next }))}
                />
              </div>
            </div>

            {/* Right column: image + actions */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Certificate Image</label>

                <div
                  className="relative rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 overflow-hidden"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) await handleFile(file);
                  }}
                >
                  {form.image ? (
                    <img ref={imgPreviewRef} src={form.image} alt="Certificate" className="w-full aspect-[4/3] object-cover" />
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
                      <button type="button" onClick={() => imgInputRef.current?.click()} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                        Choose Image
                      </button>
                      {form.image && (
                        <button type="button" onClick={() => setForm((f) => ({ ...f, image: "" }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Supported: PNG/JPG (or paste)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link to="/certificates" className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </Link>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50">
                  {saving ? "Saving…" : isEditing || (prefill && isGuid(prefill.id)) ? "Save Changes" : "Save Certificate"}
                </button>
              </div>
            </div>
          </form>
        </Reveal>
      </div>

      <style>{`.aspect-4\\/3 { aspect-ratio: 4 / 3; }`}</style>
    </section>
  );
}
