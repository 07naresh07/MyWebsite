// src/pages/ExperienceAdd.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Moon, Sun, Save, ArrowLeft, Calendar, MapPin, Building2, 
  User, Briefcase, Tag, Bold, Italic, List, ListOrdered,
  Indent, Outdent, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, Link as LinkIcon, Palette, Undo2, Redo2, Eye, EyeOff,
  Sparkles, Clock, Award, Target, Zap, Settings,
  ChevronDown, X, Check, AlertCircle, Info
} from "lucide-react";

import { useOwnerMode } from "../lib/owner.js";
import {
  getExperience as apiGetExperience,
  createExperience as apiCreateExperience,
  updateExperience as apiUpdateExperience
} from "../lib/api.js";

/* ============================== Theme hook ============================== */
const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", next ? "dark" : "light");
    }
  };

  return { isDark, toggleTheme };
};

/* ----------------------- Storage helpers (match list page) ----------------------- */
const STORAGE_KEYS = ["experience_items", "experiences"];

function readAllExperiences() {
  try {
    const sets = STORAGE_KEYS
      .map((k) => JSON.parse(localStorage.getItem(k) || "[]"))
      .filter(Array.isArray);
    const map = new Map();
    sets.flat().forEach((x) => map.set(String(x.id), x));
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function writeAllExperiences(rows) {
  const json = JSON.stringify(rows);
  localStorage.setItem("experience_items", json);
  localStorage.setItem("experiences", json);
}

/* ----------------------- Date helpers ----------------------- */
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const isGuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));

function ymToIso(ym) {
  if (!ym || typeof ym !== "string") return "";
  const [y, m] = ym.split("-").map((x) => Number(x));
  if (!y || !m || m < 1 || m > 12) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
}

function ymToText(ym) {
  if (!ym || typeof ym !== "string") return "";
  const [y, m] = ym.split("-").map((x) => Number(x));
  if (!y || !m || m < 1 || m > 12) return "";
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

/* =========================== SmartDatePicker ============================ */
function SmartDatePicker({
  label,
  value,
  onChange,
  required,
  minYear = 1970,
  maxYear = new Date().getFullYear() + 10,
  allowClear = true,
  forcePlaceholder = false,
  icon: Icon = Calendar,
  isDark
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);

  const yy = (value || "").split("-")[0] || "";
  const mm = (value || "").split("-")[1] || "";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(maxYear - i));
  const months = [
    { num: "01", name: "January" }, { num: "02", name: "February" }, { num: "03", name: "March" },
    { num: "04", name: "April" }, { num: "05", name: "May" }, { num: "06", name: "June" },
    { num: "07", name: "July" }, { num: "08", name: "August" }, { num: "09", name: "September" },
    { num: "10", name: "October" }, { num: "11", name: "November" }, { num: "12", name: "December" },
  ];

  const quickOptions = [
    { label: "This Month", value: () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }},
    { label: "Last Month", value: () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    }},
    { label: "6 Months Ago", value: () => {
      const now = new Date();
      const six = new Date(now.getFullYear(), now.getMonth() - 6);
      return `${six.getFullYear()}-${String(six.getMonth() + 1).padStart(2, "0")}`;
    }},
    { label: "1 Year Ago", value: () => {
      const now = new Date();
      return `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }},
  ];

  const setMonth = (m) => {
    const y = yy || String(new Date().getFullYear());
    onChange(`${y}-${m}`);
    setIsOpen(false);
  };

  const setYear = (y) => {
    onChange(`${y}-${mm || "01"}`);
  };

  const clear = () => {
    if (!required && allowClear) onChange("");
    setIsOpen(false);
  };

  const applyQuickSelect = (option) => {
    onChange(option.value());
    setIsOpen(false);
  };

  const displayValue = forcePlaceholder ? "" : value;
  const formattedValue = displayValue ? ymToText(displayValue) : "";

  return (
    <div ref={wrapRef} className="relative group">
      {label !== "" && (
        <label className={`block text-sm font-medium mb-2 transition-colors ${
          isDark ? "text-gray-200" : "text-gray-700"
        }`}>
          <div className="flex items-center gap-2">
            <Icon size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
            {label}
            {required && <span className="text-red-500">*</span>}
          </div>
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
          isDark 
            ? "bg-gray-800 border-gray-600 hover:border-blue-500 text-gray-200" 
            : "bg-white border-gray-300 hover:border-blue-500 text-gray-900"
        } ${isOpen ? (isDark ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500 ring-2 ring-blue-500/20") : ""} 
        group-hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
      >
        <span className={`font-medium ${displayValue ? "" : (isDark ? "text-gray-400" : "text-gray-500")}`}>
          {formattedValue || "Select date (YYYY-MM)"}
        </span>
        <ChevronDown
          size={20}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-full rounded-2xl border shadow-2xl p-6 transition-all duration-200 ${
            isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
          }`}
        >
          {/* Quick Select */}
          <div className="mb-4">
            <h4
              className={`text-xs font-semibold mb-2 uppercase tracking-wider ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Quick Select
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyQuickSelect(option)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    isDark
                      ? "hover:bg-gray-700 text-gray-300 hover:text-white"
                      : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month / Year */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label
                className={`text-xs font-medium mb-1 block ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Month
              </label>
              <select
                value={mm}
                onChange={(e) => setMonth(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-gray-200"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="">Month</option>
                {months.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`text-xs font-medium mb-1 block ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Year
              </label>
              <select
                value={yy}
                onChange={(e) => setYear(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-gray-200"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            {allowClear && !required ? (
              <button
                type="button"
                onClick={clear}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Clear
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ AdvancedEditor ============================= */
function AdvancedEditor({ html, onChange, isDark }) {
  const editorRef = useRef(null);
  const [showColors, setShowColors] = useState(false);
  const [colorTab, setColorTab] = useState("text");
  const [customColor, setCustomColor] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && html !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = html || "";
      updateWordCount();
    }
  }, [html]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowColors(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || "";
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    }
  };

  const execCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    onChange(editorRef.current?.innerHTML || "");
    updateWordCount();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      try {
        new URL(url);
        execCommand("createLink", url);
      } catch {
        alert("Please enter a valid URL");
      }
    }
  };

  const applyColor = (color) => {
    const command = colorTab === "highlight" ? "hiliteColor" : "foreColor";
    execCommand(command, color);
    setShowColors(false);
  };

  const ToolButton = ({ onClick, icon: Icon, label, isActive = false }) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-blue-600 text-white"
          : isDark
          ? "hover:bg-gray-700 text-gray-300"
          : "hover:bg-gray-100 text-gray-600"
      }`}
    >
      <Icon size={16} />
    </button>
  );

  const colors = {
    text: ["#000000", "#374151", "#6b7280", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"],
    highlight: ["#fef3c7", "#fee2e2", "#dbeafe", "#dcfce7", "#f3e8ff", "#fce7f3", "#e0f2fe", "#f0f9ff"],
  };

  return (
    <div
      className={`border-2 rounded-2xl transition-all duration-200 ${
        isDark ? "border-gray-600" : "border-gray-300"
      } ${isFullscreen ? "fixed inset-4 z-50" : ""}`}
    >
      {/* Toolbar */}
      <div
        className={`flex flex-wrap items-center gap-2 p-4 border-b ${
          isDark ? "border-gray-600 bg-gray-800" : "border-gray-200 bg-gray-50"
        } rounded-t-2xl`}
      >
        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("bold")} icon={Bold} label="Bold" />
          <ToolButton onClick={() => execCommand("italic")} icon={Italic} label="Italic" />
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("insertUnorderedList")} icon={List} label="Bullet List" />
          <ToolButton onClick={() => execCommand("insertOrderedList")} icon={ListOrdered} label="Numbered List" />
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("indent")} icon={Indent} label="Indent" />
          <ToolButton onClick={() => execCommand("outdent")} icon={Outdent} label="Outdent" />
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("justifyLeft")} icon={AlignLeft} label="Align Left" />
          <ToolButton onClick={() => execCommand("justifyCenter")} icon={AlignCenter} label="Align Center" />
          <ToolButton onClick={() => execCommand("justifyRight")} icon={AlignRight} label="Align Right" />
          <ToolButton onClick={() => execCommand("justifyFull")} icon={AlignJustify} label="Justify" />
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <ToolButton onClick={insertLink} icon={LinkIcon} label="Insert Link" />

        <div className="relative" ref={popoverRef}>
          <ToolButton
            onClick={() => setShowColors(!showColors)}
            icon={Palette}
            label="Colors"
            isActive={showColors}
          />

          {showColors && (
            <div
              className={`absolute top-full left-0 mt-2 p-4 rounded-xl border shadow-xl z-50 w-64 ${
                isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setColorTab("text")}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    colorTab === "text"
                      ? "bg-blue-600 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setColorTab("highlight")}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    colorTab === "highlight"
                      ? "bg-blue-600 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Highlight
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {colors[colorTab].map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => applyColor(color)}
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#000000"
                  className={`flex-1 px-2 py-1 text-sm rounded border ${
                    isDark ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-white border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => customColor && applyColor(customColor)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`w-px h-6 ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => execCommand("undo")} icon={Undo2} label="Undo" />
          <ToolButton onClick={() => execCommand("redo")} icon={Redo2} label="Redo" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{wordCount} words</span>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-600"
            }`}
            title={isFullscreen ? "Exit full screen" : "Full screen"}
          >
            {isFullscreen ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          onChange(e.currentTarget.innerHTML);
          updateWordCount();
        }}
        className={`min-h-[200px] p-6 focus:outline-none ${
          isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-900"
        } ${isFullscreen ? "flex-1" : ""} rounded-b-2xl prose prose-sm max-w-none`}
        style={{ minHeight: isFullscreen ? "400px" : "200px" }}
        data-placeholder="Describe your work experience, achievements, and key responsibilities..."
      />

      {/* IMPORTANT: plain <style>, not <style jsx> */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: ${isDark ? "#9ca3af" : "#6b7280"};
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

/* ============================ SmartTagInput ============================ */
function SmartTagInput({ value, onChange, placeholder, isDark, suggestions = [] }) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const tags = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const addTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      onChange(newTags.join(", "));
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (index) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags.join(", "));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div className="relative">
      <div
        className={`min-h-[3rem] p-3 border-2 rounded-xl flex flex-wrap gap-2 transition-all duration-200 ${
          isDark
            ? "bg-gray-800 border-gray-600 focus-within:border-blue-500"
            : "bg-white border-gray-300 focus-within:border-blue-500"
        }`}
      >
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              title="Remove"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className={`flex-1 min-w-[120px] bg-transparent outline-none ${
            isDark ? "text-gray-200 placeholder-gray-400" : "text-gray-900 placeholder-gray-500"
          }`}
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          className={`absolute z-40 w-full mt-1 border rounded-xl shadow-lg max-h-40 overflow-y-auto ${
            isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
          }`}
        >
          {filteredSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => addTag(s)}
              className={`w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                isDark ? "text-gray-200" : "text-gray-900"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== Main Page =============================== */
export default function ExperienceAdd() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { owner } = useOwnerMode();

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  // toggles
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [liveValidation, setLiveValidation] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const [formData, setFormData] = useState({
    company: "",
    role: "",
    project: "",
    location: "",
    startDate: "", // YYYY-MM
    endDate: "",   // YYYY-MM
    description: "",
    tags: "",
    isCurrentRole: false,
  });

  // Load when editing — try server first (if GUID), else local
  useEffect(() => {
    (async () => {
      if (!isEditing) return;

      // if GUID, try server
      if (isGuid(id)) {
        try {
          const list = await apiGetExperience().catch(() => []);
          const items = Array.isArray(list?.items)
            ? list.items
            : Array.isArray(list)
            ? list
            : [];
          const row = items.find((r) => String(r.id) === String(id));
          if (row) {
            setFormData({
              company: row.company || "",
              role: row.role || "",
              project: row.project || "",
              location: row.location || "",
              startDate: row.startDate || "",
              endDate: row.endDate || "",
              description: row.descriptionHtml || row.description || "",
              tags: Array.isArray(row.tools) ? row.tools.join(", ") : "",
              isCurrentRole: !row.endDate,
            });
            return;
          }
        } catch {
          /* fall back to local below */
        }
      }

      // fallback to local
      const all = readAllExperiences();
      const localRow = all.find((r) => String(r.id) === String(id));
      if (localRow) {
        setFormData({
          company: localRow.company || "",
          role: localRow.role || "",
          project: localRow.project || "",
          location: localRow.location || "",
          startDate: localRow.startDate || "",
          endDate: localRow.endDate || "",
          description: localRow.descriptionHtml || localRow.description || "",
          tags: (localRow.tools || []).join(", "),
          isCurrentRole: !localRow.endDate,
        });
      }
    })();
  }, [id, isEditing]);

  // Auto-save draft
  useEffect(() => {
    if (!autoSave) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem("draft_experience", JSON.stringify(formData));
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [formData, autoSave]);

  // Live validation (Role is OPTIONAL)
  useEffect(() => {
    if (!liveValidation) return;
    const e = {};
    if (!formData.company.trim()) e.company = "Company is required";
    if (!formData.startDate) e.startDate = "Start date is required";
    setErrors(e);
  }, [formData.company, formData.startDate, liveValidation]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const e = {};
    if (!formData.company.trim()) e.company = "Company is required";
    if (!formData.startDate) e.startDate = "Start date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Normalize for list page + enriched date fields
  const toRow = () => {
    const tools = formData.tags
      ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const startIso = ymToIso(formData.startDate);
    const endIso = formData.isCurrentRole ? "" : ymToIso(formData.endDate);
    const startText = ymToText(formData.startDate);
    const endText = formData.isCurrentRole ? "" : ymToText(formData.endDate);

    return {
      id: isEditing ? String(id) : String(Date.now()),
      company: formData.company.trim(),
      role: (formData.role || "").trim(),
      project: formData.project.trim() || undefined,
      location: formData.location.trim() || undefined,

      // legacy/compat for Experience.jsx
      startDate: formData.startDate,
      endDate: formData.isCurrentRole ? "" : (formData.endDate || ""),

      // enriched
      startDateIso: startIso,
      endDateIso: endIso || "",
      startDateText: startText,
      endDateText: endText,

      descriptionHtml: formData.description || "",
      description: "",
      tools,
    };
  };

  const saveRowLocal = (row) => {
    const all = readAllExperiences();
    const idx = all.findIndex((r) => String(r.id) === String(row.id));
    if (idx >= 0) all[idx] = row;
    else all.push(row);
    writeAllExperiences(all);
    window.dispatchEvent(new Event("experience:saved"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const row = toRow();

      // Always keep a local draft/version so nothing is lost
      saveRowLocal(row);

      // If owner mode, sync to server
      if (owner) {
        const payload = {
          company: row.company,
          role: row.role || null,
          project: row.project || null,
          location: row.location || null,
          startDate: row.startDate,                 // "YYYY-MM"
          endDate: row.endDate || null,             // null for "Present"
          descriptionHtml: row.descriptionHtml || "",// stored as HTML
          tools: Array.isArray(row.tools) ? row.tools : [],

          // snake_case mirrors for APIs that expect them
          company_url: row.companyUrl || null,
          start_ym: row.startDate,
          end_ym: row.endDate || null,
          description_html: row.descriptionHtml || "",
          
          status: "published",
        };

        if (isEditing && isGuid(id)) {
          await apiUpdateExperience(id, payload);
        } else {
          const created = await apiCreateExperience(payload);
          // Optional: if server returns an id, you could update local to reference it.
          if (created?.id) {
            const all = readAllExperiences();
            const idx = all.findIndex((r) => String(r.id) === String(row.id));
            if (idx >= 0) {
              all[idx] = { ...all[idx], id: created.id }; // map local temp id to server id
              writeAllExperiences(all);
              window.dispatchEvent(new Event("experience:saved"));
            }
          }
        }
      }

      navigate("/experience");
    } catch (err) {
      alert(err?.message || "Failed to save experience");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/experience");
  const handleBack = () => navigate("/experience");

  const commonInputClasses = `w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-0 ${
    isDark
      ? "bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
  }`;

  const suggestions = ["React","JavaScript","Python","Node.js","TypeScript","MongoDB","PostgreSQL","AWS","Docker","Kubernetes"];

  const helpfulHint = smartSuggestions && !showPreview;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-600"
              }`}
              aria-label="Back"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {isEditing ? "Edit Experience" : "Add Experience"}
              </h1>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
                Share your professional journey and achievements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-save toggle */}
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Auto-save</span>
              <button
                type="button"
                onClick={() => setAutoSave((s) => !s)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSave ? "bg-blue-600" : isDark ? "bg-gray-700" : "bg-gray-300"
                }`}
                aria-pressed={autoSave}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSave ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Preview toggle */}
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showPreview
                  ? "bg-blue-600 text-white"
                  : isDark
                  ? "hover:bg-gray-800 text-gray-300"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <Eye size={16} />
              <span className="text-sm font-medium">Preview</span>
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isDark
                  ? "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                  : "bg-white text-gray-600 hover:bg-gray-100 shadow-sm"
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Smart Features Bar */}
        <div
          className={`mb-3 p-4 rounded-xl border ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          } shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                  Smart Features
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className={`flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <Clock size={14} />
                  <span>Auto-save {autoSave ? "ON" : "OFF"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSmartSuggestions((s) => !s)}
                  className={`flex items-center gap-1 px-2 py-1 rounded ${
                    smartSuggestions
                      ? "bg-blue-600 text-white"
                      : isDark
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  title="Toggle smart suggestions"
                >
                  <Target size={14} />
                  <span>Smart suggestions</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLiveValidation((v) => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded ${
                    liveValidation
                      ? "bg-blue-600 text-white"
                      : isDark
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  title="Toggle live validation"
                >
                  <Zap size={14} />
                  <span>Live validation</span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded((x) => !x)}
              className={`p-1 rounded-lg transition-colors ${
                isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
              }`}
              aria-expanded={isExpanded}
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>

          {isExpanded && (
            <div
              className={`mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4 ${
                isDark ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  <strong>Smart suggestions:</strong> shows helpful tips below fields.
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  <strong>Live validation:</strong> highlights missing required fields as you type.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hint */}
        {helpfulHint && (
          <div
            className={`mb-6 p-3 rounded-lg ${
              isDark ? "bg-gray-800 border border-gray-700 text-gray-200" : "bg-blue-50 border border-blue-200 text-blue-800"
            }`}
          >
            Pro tip: keep titles concise (e.g., “Senior Software Engineer”) and quantify impact in the description.
          </div>
        )}

        {showPreview ? (
          /* ============================== Preview ============================== */
          <div
            className={`rounded-2xl border p-8 ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            } shadow-lg`}
          >
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Experience Preview
              </h2>
              <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mt-2`}>
                This is how your experience will appear to viewers
              </p>
            </div>

            <div
              className={`border rounded-xl p-6 ${isDark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formData.role || "Your Role"}
                  </h3>
                  <p className={`text-lg ${isDark ? "text-blue-400" : "text-blue-600"} font-medium`}>
                    {formData.company || "Company Name"}
                  </p>
                  {formData.project && (
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
                      Project: {formData.project}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium`}>
                    {ymToText(formData.startDate) || "Start Date"} -{" "}
                    {formData.isCurrentRole ? "Present" : ymToText(formData.endDate) || "End Date"}
                  </p>
                  {formData.location && (
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"} text-sm mt-1`}>{formData.location}</p>
                  )}
                </div>
              </div>

              {formData.description && (
                <div className={`prose max-w-none ${isDark ? "prose-invert" : ""} mb-4`}>
                  <div dangerouslySetInnerHTML={{ __html: formData.description }} />
                </div>
              )}

              {formData.tags && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =============================== Form =============================== */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div
              className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Basic Information</h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Company, role, and project details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                      Company Name <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    className={`${commonInputClasses} ${errors.company ? "border-red-500" : ""}`}
                    placeholder="e.g., Google, Microsoft, Startup Inc."
                    aria-invalid={!!errors.company}
                    aria-describedby={errors.company ? "err-company" : undefined}
                  />
                  {errors.company && (
                    <p id="err-company" className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.company}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <User size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                      Position / Role <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>(Optional)</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => updateField("role", e.target.value)}
                    className={commonInputClasses}
                    placeholder="e.g., Senior Software Engineer, Product Manager"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                      Project Name <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>(Optional)</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.project}
                    onChange={(e) => updateField("project", e.target.value)}
                    className={commonInputClasses}
                    placeholder="e.g., E-commerce Platform, Mobile App Redesign"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                      Location <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>(Optional)</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    className={commonInputClasses}
                    placeholder="e.g., San Francisco, CA / Remote"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div
              className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Calendar size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Timeline</h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>When did you work here?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <SmartDatePicker
                    label="Start Date"
                    value={formData.startDate}
                    onChange={(value) => updateField("startDate", value)}
                    required
                    /* Do NOT set forcePlaceholder — we want the formatted value to show */
                    isDark={isDark}
                  />
                  {errors.startDate && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                        End Date
                      </div>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isCurrentRole}
                        onChange={(e) => {
                          updateField("isCurrentRole", e.target.checked);
                          if (e.target.checked) updateField("endDate", "");
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>Current role</span>
                    </label>
                  </div>

                  {!formData.isCurrentRole ? (
                    <SmartDatePicker
                      label=""
                      value={formData.endDate}
                      onChange={(value) => updateField("endDate", value)}
                      isDark={isDark}
                    />
                  ) : (
                    <div
                      className={`w-full px-4 py-3 rounded-xl border-2 border-dashed ${
                        isDark ? "border-gray-600 bg-gray-700 text-gray-400" : "border-gray-300 bg-gray-50 text-gray-500"
                      } text-center`}
                    >
                      Present
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div
              className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Award size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Work Description</h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Describe your responsibilities, achievements, and impact
                  </p>
                </div>
              </div>

              <AdvancedEditor
                html={formData.description}
                onChange={(value) => updateField("description", value)}
                isDark={isDark}
              />

              {smartSuggestions && (
                <div className={`mt-4 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                  <div className="flex items-start gap-2">
                    <Info size={16} className={`mt-0.5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-blue-400" : "text-blue-800"}`}>Writing Tips</p>
                      <ul className={`text-sm mt-1 space-y-1 ${isDark ? "text-gray-300" : "text-blue-700"}`}>
                        <li>• Use action verbs (led, developed, improved, achieved)</li>
                        <li>• Include quantifiable results when possible</li>
                        <li>• Focus on impact and value delivered</li>
                        <li>• Keep it concise but comprehensive</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Skills & Tags */}
            <div
              className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Tag size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Skills & Technologies</h2>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Tools, technologies, and skills used in this role</p>
                </div>
              </div>

              <SmartTagInput
                value={formData.tags}
                onChange={(value) => updateField("tags", value)}
                placeholder="Type skills and press Enter or comma to add (e.g., React, Node.js, AWS)"
                isDark={isDark}
                suggestions={suggestions}
              />
            </div>

            {/* Actions */}
            <div
              className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-lg`}
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      saving
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        {isEditing ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        {isEditing ? "Update Experience" : "Save Experience"}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 transition-all duration-200 ${
                      isDark
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  {autoSave && (
                    <div className={`flex items-center gap-1 ${isDark ? "text-green-400" : "text-green-600"}`}>
                      <Check size={14} />
                      <span>Auto-saved</span>
                    </div>
                  )}
                  <span className={isDark ? "text-gray-400" : "text-gray-500"}>Last saved: Just now</span>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
