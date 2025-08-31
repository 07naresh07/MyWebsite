// src/pages/EducationAdd.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getProfile,
  getEducation,
  createEducation,
  updateEducation,
} from "../lib/api.js";
import Card from "../components/Card.jsx";

/* ============================== Inline SVG Icons ============================== */
const Icon = {
  School: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10L12 4 2 10l10 6 10-6Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>
    </svg>
  ),
  Calendar: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  BookOpen: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 7v13M4 19a8 8 0 0 1 8-2 8 8 0 0 1 8 2V6a8 8 0 0 0-8 2 8 8 0 0 0-8-2z"/>
    </svg>
  ),
  GraduationCap: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m22 10-10-5-10 5 10 5 10-5Z"/><path d="M6 12v5c3 1.5 9 1.5 12 0v-5"/>
    </svg>
  ),
  Award: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="5"/><path d="m8 14-2 8 6-3 6 3-2-8"/>
    </svg>
  ),
  FileText: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
    </svg>
  ),
  ChevronDown: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-5 h-5"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  AlertCircle: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-5 h-5"} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
    </svg>
  ),
  EyeOff: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-16 h-16"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a13.31 13.31 0 0 1-1.67 2.88M6.61 6.61C3.43 8.06 2 12 2 12a13.31 13.31 0 0 0 4.2 5.4M14.12 14.12A2 2 0 0 1 9.88 9.88"/>
    </svg>
  ),
  Save: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <path d="M17 21v-8H7v8M7 3v5h8"/>
    </svg>
  ),
  ArrowLeft: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-4 h-4"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-8 h-8"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Edit3: (p) => (
    <svg viewBox="0 0 24 24" className={p.className ?? "w-8 h-8"} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
  ),
};

/* ------------------------------ Owner resolver ------------------------------ */
function isOwnerFromToggleOrProfile(profile) {
  const local = localStorage.getItem("ownerMode");
  if (local === "true") return true;
  if (local === "false") return false;
  return !!profile?.isOwner;
}

/* ------------------------------ Local fallback ------------------------------ */
const LS_KEY = "localEducation";
function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeLocal(rows) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {}
}
async function localGetById(id) {
  return readLocal().find((r) => String(r.id) === String(id));
}
async function localCreate(payload) {
  const list = readLocal();
  const id = Date.now().toString();
  const rec = { id, ...payload, createdAt: new Date().toISOString() };
  list.unshift(rec);
  writeLocal(list);
  return rec;
}
async function localUpdate(id, payload) {
  const list = readLocal();
  const i = list.findIndex((r) => String(r.id) === String(id));
  if (i >= 0) {
    list[i] = { ...list[i], ...payload, updatedAt: new Date().toISOString() };
    writeLocal(list);
    return list[i];
  }
  return localCreate({ ...payload, id });
}

/* -------------------------- Robust API→Local wrapper ------------------------- */
function statusFromError(e) {
  const m = (e?.message || "").match(/^(\d{3})\s/);
  return m ? parseInt(m[1], 10) : e?.status || e?.response?.status;
}
async function tryApiThenLocal(fnApi, fnLocal, ...args) {
  try {
    const r = await fnApi(...args);
    return { data: r, usedLocal: false };
  } catch (e) {
    const status = statusFromError(e);
    if (status === 404 || status === 405 || status === 0 || !status) {
      const r = await fnLocal(...args);
      return { data: r, usedLocal: true };
    }
    throw e;
  }
}

/* -------------------------- Month–Year Picker control ------------------------ */
function MonthYearPicker({
  label,
  value,
  onChange,
  required,
  minYear = 1970,
  maxYear = new Date().getFullYear() + 10,
  allowClear = true,
  forcePlaceholder = false,
  disabled = false,
  icon: Ico = Icon.Calendar,
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const [y, m] = String(value).split("-");
      setYear(y || "");
      setMonth(m || "");
    } else {
      setYear("");
      setMonth("");
    }
  }, [value]);

  useEffect(() => {
    function onDoc(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function updateValue(newYear, newMonth) {
    const y = String(newYear || "");
    const m = String(newMonth || "");
    if (y && m) onChange(`${y}-${m}`);
    else onChange("");
  }

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) =>
    String(minYear + i)
  );
  const months = [
    { num: "01", name: "Jan" },
    { num: "02", name: "Feb" },
    { num: "03", name: "Mar" },
    { num: "04", name: "Apr" },
    { num: "05", name: "May" },
    { num: "06", name: "Jun" },
    { num: "07", name: "Jul" },
    { num: "08", name: "Aug" },
    { num: "09", name: "Sep" },
    { num: "10", name: "Oct" },
    { num: "11", name: "Nov" },
    { num: "12", name: "Dec" },
  ];

  const showText = forcePlaceholder ? "" : value;

  return (
    <div ref={containerRef} className="relative group">
      <label
        className={`block text-sm font-semibold mb-2 transition-colors duration-200 ${
          disabled
            ? "text-gray-400 dark:text-gray-500"
            : "text-gray-700 dark:text-gray-300"
        }`}
      >
        <span className="flex items-center gap-2">
          <Ico className="w-4 h-4" />
          {label}
          {required && (
            <span className="text-red-500 dark:text-red-400">*</span>
          )}
        </span>
      </label>

      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`relative w-full flex items-center justify-between px-4 py-3 text-left
                    rounded-xl border-2 transition-all duration-200 shadow-sm
                    ${
                      disabled
                        ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : `bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 
                           hover:border-indigo-500 dark:hover:border-indigo-400 
                           focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800
                           group-hover:shadow-md`
                    }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
      >
        <span
          className={`tabular-nums tracking-wide font-medium ${
            showText
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {showText || "YYYY-MM"}
        </span>
        <Icon.ChevronDown
          className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  updateValue(year, e.target.value);
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select</option>
                {months.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  updateValue(e.target.value, month);
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select</option>
                {[...years].reverse().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {allowClear ? (
              <button
                type="button"
                onClick={() => {
                  setYear("");
                  setMonth("");
                  onChange("");
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <Icon.X className="w-4 h-4" />
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200"
            >
              <Icon.Check className="w-4 h-4" />
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Text Input ------------------------------- */
function EnhancedInput({
  label,
  icon: Ico,
  required = false,
  showCharCount = false,
  maxLength,
  suggestions = [],
  ...props
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  useEffect(() => {
    if (props.value && suggestions.length > 0) {
      const filtered = suggestions.filter(
        (s) =>
          s.toLowerCase().includes(props.value.toLowerCase()) &&
          s.toLowerCase() !== props.value.toLowerCase()
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && props.value.length > 1);
    } else {
      setShowSuggestions(false);
    }
  }, [props.value, suggestions]);

  const handleSuggestionClick = (suggestion) => {
    const event = { target: { name: props.name, value: suggestion } };
    props.onChange(event);
    setShowSuggestions(false);
  };

  return (
    <div className="relative group">
      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        <span className="flex items-center gap-2">
          {Ico && <Ico className="w-4 h-4" />}
          {label}
          {required && (
            <span className="text-red-500 dark:text-red-400">*</span>
          )}
        </span>
      </label>

      <div className="relative">
        <input
          {...props}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 shadow-sm
                     bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
                     text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                     hover:border-indigo-500 dark:hover:border-indigo-400
                     focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800
                     group-hover:shadow-md ${props.className || ""}`}
          maxLength={maxLength}
        />

        {showCharCount && maxLength && (
          <div className="absolute right-3 top-3 text-xs text-gray-400 dark:text-gray-500">
            {(props.value || "").length}/{maxLength}
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-32 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-150"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Degree level options --------------------------- */
const DEGREE_LEVELS = [
  { value: "Primary School", icon: Icon.BookOpen },
  { value: "Secondary School", icon: Icon.BookOpen },
  { value: "High School", icon: Icon.School },
  { value: "Diploma/Certificate", icon: Icon.Award },
  { value: "Bachelor", icon: Icon.GraduationCap },
  { value: "Master", icon: Icon.GraduationCap },
  { value: "MPhil", icon: Icon.GraduationCap },
  { value: "PhD", icon: Icon.GraduationCap },
  { value: "Other", icon: Icon.FileText },
];

/* ------------------------------- Suggestions ------------------------------- */
const INSTITUTION_SUGGESTIONS = [
  "Harvard University",
  "Stanford University",
  "MIT",
  "University of Oxford",
  "Cambridge University",
  "Yale University",
  "Princeton University",
  "Columbia University",
  "University of California, Berkeley",
  "University of Toronto",
  "McGill University",
];

const DEGREE_SUGGESTIONS = [
  "Bachelor of Science",
  "Bachelor of Arts",
  "Bachelor of Engineering",
  "Bachelor of Technology",
  "Master of Science",
  "Master of Arts",
  "Master of Business Administration",
  "Master of Engineering",
  "Doctor of Philosophy",
  "Bachelor of Commerce",
  "Bachelor of Computer Applications",
  "Master of Computer Applications",
  "Bachelor of Law",
  "Master of Law",
];

const FIELD_SUGGESTIONS = [
  "Computer Science",
  "Engineering",
  "Business Administration",
  "Medicine",
  "Law",
  "Psychology",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Economics",
  "Marketing",
  "Finance",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
];

/* ------------------------ Smarter level normalization ----------------------- */
function normalizeLevelText(s = "") {
  const t = s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  if (/(^|\b)(phd|doctor of philosophy|dphil)(\b|$)/.test(t)) return "PhD";
  if (/(^|\b)mphil(\b|$)/.test(t)) return "MPhil";
  if (
    /(^|\b)(ms|msc|mtech|meng|mba|mca|llm|md|mpt|mph|med|ma|mcom|mfin|mf)(\b|$)/.test(t) ||
    /master/.test(t)
  )
    return "Master";
  if (
    /(^|\b)(be|btech|bsc|ba|beng|bcom|bba|bca|llb)(\b|$)/.test(t) ||
    /bachelor/.test(t)
  )
    return "Bachelor";
  if (
    /postgraduate diploma|pg diploma|graduate diploma/.test(t) ||
    /(diploma|certificate|associate)/.test(t)
  )
    return "Diploma/Certificate";
  if (/high school|higher secondary|hsc/.test(t)) return "High School";
  if (/secondary/.test(t)) return "Secondary School";
  if (/primary/.test(t)) return "Primary School";
  return "";
}

/* ================================== Page ================================== */
export default function EducationAdd() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();

  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [usedLocal, setUsedLocal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    school: "",
    level: "",
    degree: "",
    field: "",
    startYM: "",
    endYM: "",
    gpa: "",         // was "grade" before; now maps to DB gpa
    thesis: "",
    description: "", // NEW: short description column
    details: "",
  });

  const [current, setCurrent] = useState(false);
  const [dateError, setDateError] = useState("");
  const [formValid, setFormValid] = useState(false);

  const levelSuggestion = normalizeLevelText(form.degree || "");

  // ✅ relax validation (level not required)
  useEffect(() => {
    const isValid = form.school.trim() && form.startYM;
    setFormValid(Boolean(isValid) && !dateError);
  }, [form, dateError]);

  // Date validation (YYYY-MM)
  useEffect(() => {
    const toParts = (ym) => {
      if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return null;
      const [y, m] = ym.split("-").map(Number);
      return { y, m };
    };
    const s = toParts(form.startYM);
    const e = current ? null : toParts(form.endYM);
    if (s && e) {
      if (e.y < s.y || (e.y === s.y && e.m < s.m))
        setDateError("End date must be after start date.");
      else setDateError("");
    } else setDateError("");
  }, [form.startYM, form.endYM, current]);

  // Load profile + existing row (if editing)
  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile().catch(() => ({}));
        setAllowed(isOwnerFromToggleOrProfile(profile));

        if (editing) {
          const { data, usedLocal: ul } = await tryApiThenLocal(
            getEducation,
            () => readLocal()
          );
          setUsedLocal(ul);
          const arr = Array.isArray(data) ? data : [];
          const rec =
            arr.find((r) => String(r.id) === String(id)) ||
            (await localGetById(id)) ||
            null;
          if (!rec) {
            setErr("Education record not found");
          } else {
            // ---- READ both camelCase and snake_case ----
            const syRaw = rec.startYear ?? rec.start_year;
            const smRaw = rec.startMonth ?? rec.start_month;
            const eyRaw = rec.endYear ?? rec.end_year;
            const emRaw = rec.endMonth ?? rec.end_month;

            const sy = syRaw ? String(syRaw).padStart(4, "0") : "";
            const sm = smRaw ? String(smRaw).padStart(2, "0") : "";
            const ey = eyRaw != null ? String(eyRaw).padStart(4, "0") : "";
            const em = emRaw ? String(emRaw).padStart(2, "0") : "";

            const startYMSource = rec.startYM ?? rec.start_ym;
            const endYMSource = rec.endYM ?? rec.end_ym;

            const startYM =
              startYMSource && /^\d{4}-\d{2}$/.test(startYMSource)
                ? startYMSource
                : sy && sm
                ? `${sy}-${sm}`
                : "";

            const endYM =
              eyRaw == null
                ? ""
                : endYMSource && /^\d{4}-\d{2}$/.test(endYMSource)
                ? endYMSource
                : ey && em
                ? `${ey}-${em}`
                : "";

            setCurrent(eyRaw == null);
            setForm({
              school: rec.school || "",
              level: rec.level || "",
              degree: rec.degree || "",
              field: rec.field || "",
              startYM,
              endYM,
              gpa:
                rec.gpa != null
                  ? String(rec.gpa)
                  : rec.grade != null
                  ? String(rec.grade)
                  : "",
              thesis: rec.thesis || "",
              description: rec.description || "",
              details: rec.details || "",
            });

            if (rec.thesis || rec.details || rec.description) setShowAdvanced(true);
          }
        }
      } catch (e) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, id]);

  useEffect(() => {
    if (!levelSuggestion) return;
    setForm((prev) => {
      if (!prev.level || prev.level === "Other") {
        return { ...prev, level: levelSuggestion };
      }
      return prev;
    });
  }, [levelSuggestion]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function splitYM(v) {
    if (!v) return { year: null, month: null };
    const [y, m] = v.split("-");
    const year = Number(y);
    const month = Number(m);
    return {
      year: Number.isInteger(year) ? year : null,
      month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : null,
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const { year: sY, month: sM } = splitYM(form.startYM);
      const { year: eY, month: eM } = splitYM(form.endYM);

      if (!sY || !sM) {
        throw new Error("Please select a valid Start Date (YYYY-MM).");
      }
      if (!current && (eY && !eM)) {
        throw new Error("Please complete End Date (YYYY-MM), or mark as Currently studying.");
      }
      if (!current && eY && (eY < sY || (eY === sY && eM < sM))) {
        throw new Error("End Date must be after Start Date.");
      }

      const gpaNum =
        form.gpa.trim() === "" ? null :
        Number.isFinite(parseFloat(form.gpa)) ? parseFloat(form.gpa) : null;

      const startYMStr = `${String(sY)}-${String(sM).padStart(2, "0")}`;
      const endYMStr =
        current ? null :
        eY && eM ? `${String(eY)}-${String(eM).padStart(2, "0")}` : null;

      // ---- WRITE both camelCase and snake_case so months persist no matter the API ----
      const payload = {
        school: form.school.trim(),
        level: form.level || null,
        degree: form.degree.trim() || null,
        field: form.field.trim() || null,

        startYear: sY,
        startMonth: sM,
        startYM: startYMStr,
        start_year: sY,
        start_month: sM,
        start_ym: startYMStr,

        endYear: current ? null : eY ?? null,
        endMonth: current ? null : eM ?? null,
        endYM: endYMStr,
        end_year: current ? null : eY ?? null,
        end_month: current ? null : eM ?? null,
        end_ym: endYMStr,

        gpa: gpaNum,
        thesis: form.thesis.trim() || null,
        description: form.description.trim() || null,
        details: form.details || "",
      };

      if (editing) {
        const { usedLocal: ul } = await tryApiThenLocal(
          (pid, body) => updateEducation(pid, body),
          (pid, body) => localUpdate(pid, body),
          id,
          payload
        );
        setUsedLocal(ul);
      } else {
        const { usedLocal: ul } = await tryApiThenLocal(
          (body) => createEducation(body),
          (body) => localCreate(body),
          payload
        );
        setUsedLocal(ul);
      }

      // keep local cache in sync if you were offline earlier
      writeLocal(readLocal());
      nav("/education");
    } catch (ex) {
      setErr(ex?.message || "Failed to save education");
    } finally {
      setSaving(false);
    }
  }

  if (!allowed && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Icon.EyeOff className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Viewer Mode
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Adding and editing is disabled in viewer mode
              </p>
            </div>

            <Card className="p-8 text-center">
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                To add or edit education records, please enable owner mode using
                the toggle in the top-right corner.
              </p>
              <Link
                to="/education"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 font-semibold"
              >
                <Icon.ArrowLeft />
                Back to Education
              </Link>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/2" />
              <Card className="p-8">
                <div className="space-y-4">
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-all duration-500">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* --- Remove any list marker / dot in this header --- */}
          <style>{`
            .edu-head, .edu-head * { list-style: none !important; }
            .edu-head ::marker { content: '' !important; }
            .edu-head :where(h1,h2,h3,p)::before { content: none !important; display: none !important; }
          `}</style>

          {/* Header */}
          <div className="edu-head flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                {editing ? (
                  <Icon.Edit3 className="text-white" />
                ) : (
                  <Icon.Plus className="text-white" />
                )}
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to紫urple-600 bg-clip-text text-transparent">
                  {editing ? "Edit Education" : "Add Education"}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Use month + year. Backend stores months too.
                </p>
              </div>
            </div>
          </div>

          {/* Info banners */}
          {usedLocal && (
            <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-amber-800 dark:text-amber-200">
              Working offline (local storage). Your changes are saved locally.
            </div>
          )}
          {err && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-800 dark:text-red-200">
              <Icon.AlertCircle />
              <p>{err}</p>
            </div>
          )}
          {dateError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border-2 border-orange-300 bg-orange-50 dark:bg-orange-900/20 px-4 py-3 text-orange-800 dark:text-orange-200">
              <Icon.AlertCircle />
              <p>{dateError}</p>
            </div>
          )}

          <Card className="p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-6">
              {/* School */}
              <EnhancedInput
                label="Institution / School"
                name="school"
                value={form.school}
                onChange={onChange}
                required
                icon={Icon.School}
                placeholder="e.g., University of Hartford"
                suggestions={INSTITUTION_SUGGESTIONS}
                showCharCount
                maxLength={120}
              />

              {/* Level & Degree */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Level (optional)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DEGREE_LEVELS.map(({ value, icon: Ico }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({ ...p, level: value }))
                        }
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition ${
                          form.level === value
                            ? "border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                        }`}
                      >
                        <Ico />
                        <span className="text-sm">{value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <EnhancedInput
                  label="Degree"
                  name="degree"
                  value={form.degree}
                  onChange={onChange}
                  icon={Icon.GraduationCap}
                  placeholder="e.g., Master of Science"
                  suggestions={DEGREE_SUGGESTIONS}
                  showCharCount
                  maxLength={120}
                />
              </div>

              {/* Field & GPA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EnhancedInput
                  label="Field of Study"
                  name="field"
                  value={form.field}
                  onChange={onChange}
                  icon={Icon.BookOpen}
                  placeholder="e.g., Transportation Engineering"
                  suggestions={FIELD_SUGGESTIONS}
                  showCharCount
                  maxLength={120}
                />
                <EnhancedInput
                  label="GPA (optional)"
                  name="gpa"
                  value={form.gpa}
                  onChange={onChange}
                  placeholder="e.g., 3.9"
                  showCharCount
                  maxLength={10}
                />
              </div>

              {/* Short Description */}
              <EnhancedInput
                label="Short Description (optional)"
                name="description"
                value={form.description}
                onChange={onChange}
                icon={Icon.FileText}
                placeholder="e.g., Honors, focus, summary"
                showCharCount
                maxLength={200}
              />

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MonthYearPicker
                  label="Start (YYYY-MM)"
                  value={form.startYM}
                  onChange={(v) => setForm((p) => ({ ...p, startYM: v }))}
                  required
                  allowClear={true}
                  icon={Icon.Calendar}
                />
                <div>
                  <MonthYearPicker
                    label="End (YYYY-MM)"
                    value={current ? "" : form.endYM}
                    onChange={(v) => setForm((p) => ({ ...p, endYM: v }))}
                    allowClear={true}
                    icon={Icon.Calendar}
                    disabled={current}
                    forcePlaceholder={current}
                  />
                  <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={current}
                      onChange={(e) => setCurrent(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    Currently studying
                  </label>
                </div>
              </div>

              {/* Advanced */}
              <details
                open={showAdvanced}
                onToggle={(e) => setShowAdvanced(e.currentTarget.open)}
                className="rounded-xl border-2 border-gray-200 dark:border-gray-700"
              >
                <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">
                  Advanced (thesis & details)
                </summary>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Thesis / Title (optional)
                    </label>
                    <input
                      name="thesis"
                      value={form.thesis}
                      onChange={onChange}
                      placeholder="e.g., AI-assisted Traffic Signal Optimization"
                      className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800"
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Details (optional)
                    </label>
                    <textarea
                      name="details"
                      value={form.details}
                      onChange={onChange}
                      placeholder="Key courses, honors, activities…"
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800"
                      maxLength={1000}
                    />
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {(form.details || "").length}/1000
                    </div>
                  </div>
                </div>
              </details>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Link
                  to="/education"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <Icon.ArrowLeft />
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={!formValid || saving}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition ${
                    !formValid || saving
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  <Icon.Save />
                  {saving ? "Saving..." : editing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
