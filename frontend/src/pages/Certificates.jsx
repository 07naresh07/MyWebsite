// src/pages/Certificates.jsx
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getLocalCertificates, removeLocalCertificate } from "../lib/certsLocal.js";
import { useOwnerMode, setOwnerFlag } from "../lib/owner.js";

function normalizeItem(it, idx) {
  const dateMonth = it.dateMonth || "";
  const dateLabel = it.date || (dateMonth && /^\d{4}-\d{2}$/.test(dateMonth) ? `${dateMonth.split("-")[1]}/${dateMonth.split("-")[0]}` : "");
  return {
    id: it.id ?? `api-${idx}`,
    title: it.title || it.name || it.caption || "Certificate",
    issuer: it.issuer || it.provider || it.platform || "",
    dateMonth, date: dateLabel,
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

function colorFor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 60% 40%)`;
}

function StatsSection({ items, darkMode }) {
  const stats = useMemo(() => {
    const issuers = new Set(items.map((i) => i.issuer).filter(Boolean));
    const types = {};
    items.forEach((i) => { types[i.type || "Certificate"] = (types[i.type || "Certificate"] || 0) + 1; });
    const currentYear = new Date().getFullYear();
    const thisYear = items.filter((i) => {
      if (!i.dateMonth) return false;
      return parseInt(i.dateMonth.split("-")[0], 10) === currentYear;
    }).length;
    return { total: items.length, issuers: issuers.size, types, thisYear };
  }, [items]);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 ${darkMode ? "text-white" : "text-gray-900"}`}>
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <div className="text-4xl font-extrabold">{stats.total}</div>
          <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-blue-100 text-sm font-medium">Total Certificates</div>
      </div>
      <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <div className="text-4xl font-extrabold">{stats.issuers}</div>
          <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="text-purple-100 text-sm font-medium">Learning Platforms</div>
      </div>
      <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-green-500/50 cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <div className="text-4xl font-extrabold">{stats.thisYear}</div>
          <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div className="text-green-100 text-sm font-medium">Earned This Year</div>
      </div>
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-orange-500/50 cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <div className="text-4xl font-extrabold">{Object.keys(stats.types).length}</div>
          <svg className="w-10 h-10 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <div className="text-orange-100 text-sm font-medium">Categories</div>
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
      <input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search certificates... (⌘K)"
        className={`w-full h-10 pl-10 pr-10 rounded-xl border shadow-sm focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400 ${darkMode ? "border-gray-700 bg-gray-800 text-gray-100 focus:ring-indigo-400" : "border-gray-200 bg-white text-gray-900 focus:ring-indigo-500"}`} />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {value && (
        <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300" aria-label="Clear search">
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
      <button onClick={() => onChange("grid")} className={`px-3 py-1.5 rounded-md transition-all ${mode === "grid" ? darkMode ? "bg-gray-700 text-gray-100 shadow-sm" : "bg-white text-gray-900 shadow-sm" : darkMode ? "text-gray-300 hover:text-gray-100" : "text-gray-700 hover:text-gray-900"}`} aria-label="Grid view">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <button onClick={() => onChange("list")} className={`px-3 py-1.5 rounded-md transition-all ${mode === "list" ? darkMode ? "bg-gray-700 text-gray-100 shadow-sm" : "bg-white text-gray-900 shadow-sm" : darkMode ? "text-gray-300 hover:text-gray-100" : "text-gray-700 hover:text-gray-900"}`} aria-label="List view">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}

function DeleteConfirmModal({ item, onClose, onConfirm, darkMode }) {
  const [input, setInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = input === "DELETE";

  const handleConfirm = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 ${darkMode ? "bg-gray-900 text-gray-100 border border-red-900/50" : "bg-white text-gray-900 border-2 border-red-200"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-3 rounded-full ${darkMode ? "bg-red-900/30" : "bg-red-100"}`}>
            <svg className={`w-6 h-6 ${darkMode ? "text-red-400" : "text-red-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">Delete Certificate</h3>
            <p className={`text-sm mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>This action cannot be undone. This will permanently delete:</p>
          </div>
        </div>
        <div className={`p-3 rounded-lg mb-4 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
          <p className="font-semibold text-sm">{item.title}</p>
          <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{item.issuer} • {item.type}</p>
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Type <span className="font-bold text-red-500">DELETE</span> to confirm</label>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type DELETE here" autoFocus
            className={`w-full px-4 py-2 rounded-lg border-2 focus:outline-none transition-all ${canDelete ? darkMode ? "border-red-500 bg-gray-800 text-gray-100" : "border-red-500 bg-white text-gray-900" : darkMode ? "border-gray-700 bg-gray-800 text-gray-100 focus:border-red-600" : "border-gray-300 bg-white text-gray-900 focus:border-red-400"}`} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isDeleting} className={`flex-1 px-4 py-2 rounded-lg border font-medium transition-all ${darkMode ? "border-gray-700 hover:bg-gray-800 text-gray-100" : "border-gray-300 hover:bg-gray-50 text-gray-900"} ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}>Cancel</button>
          <button onClick={handleConfirm} disabled={!canDelete || isDeleting} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${canDelete && !isDeleting ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-400 text-gray-200 cursor-not-allowed"}`}>{isDeleting ? "Deleting..." : "Delete Forever"}</button>
        </div>
      </div>
    </div>
  );
}

function FullscreenImageViewer({ image, title, onClose, darkMode }) {
  if (!image) return null;
  
  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all z-10" aria-label="Close fullscreen">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
        <img src={image} alt={title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm">
        Click anywhere or press ESC to close
      </div>
    </div>
  );
}

function PreviewModal({ item, onClose, onEdit, onDelete, owner, verified, darkMode }) {
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [copied, setCopied] = useState(false);
  
  if (!item) return null;
  const tint = colorFor(item.issuer || item.title);
  const ok = verified === true;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share && item.credentialUrl) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out my ${item.type} from ${item.issuer}`,
          url: item.credentialUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share failed:', err);
      }
    } else if (item.credentialUrl) {
      copyToClipboard(item.credentialUrl);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true">
        <div className={`rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto transform transition-all animate-scaleIn ${darkMode ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 border-2 border-gray-700" : "bg-white text-gray-900 border-2 border-gray-100"}`} onClick={(e) => e.stopPropagation()}>
          
          {/* Header Section */}
          <div className={`relative p-8 ${darkMode ? "bg-gradient-to-r from-indigo-900/30 via-purple-900/30 to-pink-900/30 border-b-2 border-gray-700" : "bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b-2 border-gray-100"}`}>
            <button onClick={onClose} className={`absolute top-6 right-6 p-2 rounded-xl transition-all ${darkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-white text-gray-600"} group`} aria-label="Close">
              <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="pr-12">
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-3 rounded-xl ${darkMode ? "bg-gradient-to-br from-indigo-600 to-purple-600" : "bg-gradient-to-br from-indigo-500 to-purple-500"} shadow-lg`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className={`text-3xl font-black mb-2 leading-tight ${darkMode ? "text-white" : "text-gray-900"}`}>{item.title}</h2>
                  {item.credentialUrl && (
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${ok ? `${darkMode ? "bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/50" : "bg-emerald-50 text-emerald-700 border-2 border-emerald-200"}` : `${darkMode ? "bg-amber-500/20 text-amber-300 border-2 border-amber-500/50" : "bg-amber-50 text-amber-700 border-2 border-amber-200"}`}`}>
                      {ok ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          VERIFIED CREDENTIAL
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          VERIFICATION PENDING
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-4">
                {item.issuer && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm ${darkMode ? "bg-gray-800 text-indigo-300" : "bg-white text-indigo-700 shadow-sm"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {item.issuer}
                  </div>
                )}
                {item.type && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border-2" style={{ color: tint, borderColor: `${tint}`, background: `${tint}15` }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {item.type}
                  </div>
                )}
                {item.date && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm ${darkMode ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700 shadow-sm"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {item.date}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Image Section */}
              <div className="space-y-4">
                <h3 className={`text-lg font-bold uppercase tracking-wide ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Certificate Image</h3>
                {item.image ? (
                  <div className="relative group">
                    <div className={`relative rounded-2xl overflow-hidden border-2 ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"} shadow-lg`}>
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-auto max-h-[400px] object-contain cursor-pointer transition-transform duration-300 group-hover:scale-[1.02]"
                        onDoubleClick={() => setFullscreenImage(true)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <button onClick={() => setFullscreenImage(true)} className="px-4 py-2 bg-white/90 text-gray-900 rounded-lg font-semibold flex items-center gap-2 hover:bg-white transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          View Fullscreen
                        </button>
                      </div>
                    </div>
                    <p className={`text-xs text-center mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Double-click image to view fullscreen</p>
                  </div>
                ) : (
                  <div className={`h-64 rounded-2xl border-2 border-dashed flex items-center justify-center ${darkMode ? "border-gray-700 bg-gray-800/30" : "border-gray-300 bg-gray-50"}`}>
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className={`font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No image available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="space-y-6">
                
                {/* Description */}
                {item.description && (
                  <div>
                    <h3 className={`text-lg font-bold mb-3 uppercase tracking-wide ${darkMode ? "text-gray-300" : "text-gray-700"}`}>About This Certificate</h3>
                    <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800/50" : "bg-gray-50"} border ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                      <p className={`text-base leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{item.description}</p>
                    </div>
                  </div>
                )}

                {/* Skills */}
                {item.skills && item.skills.length > 0 && (
                  <div>
                    <h3 className={`text-lg font-bold mb-3 uppercase tracking-wide ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Skills & Competencies</h3>
                    <div className="flex flex-wrap gap-2">
                      {item.skills.map((s) => (
                        <span key={s} className={`px-4 py-2 rounded-xl text-sm font-semibold ${darkMode ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Credential Info */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-bold uppercase tracking-wide ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Credential Information</h3>
                  
                  {item.credentialId && (
                    <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800/50 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Credential ID</div>
                          <div className={`font-mono text-sm break-all ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{item.credentialId}</div>
                        </div>
                        <button onClick={() => copyToClipboard(item.credentialId)} className={`p-2 rounded-lg transition-all ${darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-600"}`} title="Copy ID">
                          {copied ? (
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {item.credentialUrl && (
                    <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-800/50 border border-gray-700" : "bg-gray-50 border border-gray-200"}`}>
                      <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Verification Link</div>
                      <a href={item.credentialUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 font-medium hover:underline ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Verify on {item.issuer || 'Official'} Website
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`p-6 border-t-2 ${darkMode ? "border-gray-700 bg-gray-800/30" : "border-gray-100 bg-gray-50"}`}>
            <div className="flex flex-wrap items-center gap-3">
              {owner && (
                <>
                  <button onClick={() => onEdit(item)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-100 border-2 border-gray-600" : "bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button onClick={() => onDelete(item)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${darkMode ? "bg-red-900/30 hover:bg-red-900/50 text-red-400 border-2 border-red-700" : "bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-300"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
              {item.credentialUrl && (
                <button onClick={handleShare} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-100 border-2 border-gray-600" : "bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {copied ? 'Copied!' : 'Share'}
                </button>
              )}
              <button onClick={onClose} className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {fullscreenImage && <FullscreenImageViewer image={item.image} title={item.title} onClose={() => setFullscreenImage(false)} darkMode={darkMode} />}
    </>
  );
}

export default function Certificates() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [issuer, setIssuer] = useState("All");
  const [sortKey, setSortKey] = useState("newest");
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(null);
  const [verified, setVerified] = useState({});
  const [deleteItem, setDeleteItem] = useState(null);

  const VIEW_MODE_KEY = "certificatesViewMode";
  const [viewMode, setViewMode] = useState(() => {
    try { const saved = localStorage.getItem(VIEW_MODE_KEY); return saved === "list" || saved === "grid" ? saved : "grid"; } catch { return "grid"; }
  });
  useEffect(() => { try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch {} }, [viewMode]);

  const [showStats, setShowStats] = useState(true);

  const [darkMode, setDarkMode] = useState(() => {
    try { const saved = localStorage.getItem("darkModeCertificates"); return saved ? JSON.parse(saved) : false; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem("darkModeCertificates", JSON.stringify(darkMode)); } catch {} }, [darkMode]);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const nav = useNavigate();
  const location = useLocation();
  const { owner } = useOwnerMode();

  useEffect(() => { if (!owner && exportOpen) setExportOpen(false); }, [owner, exportOpen]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("admin")) { const on = params.get("admin") === "1" || params.get("admin") === "true"; setOwnerFlag(on); }
  }, [location.search]);

  const fetchGallery = useCallback(async () => {
    try { const mod = await import("../lib/api.js"); const fn = mod?.getGallery; if (typeof fn !== "function") return []; const data = await fn(); return Array.isArray(data) ? data : []; } catch { return []; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apiData = await fetchGallery();
        const api = Array.isArray(apiData) ? apiData.map(normalizeItem) : [];
        const local = getLocalCertificates().map((c, i) => normalizeItem({ ...c, _source: "local" }, i));
        const map = new Map();
        [...api, ...local].forEach((c) => { const key = (c.title + "|" + c.issuer).toLowerCase(); map.set(key, c); });
        const merged = Array.from(map.values()).filter((c) => !SKIP_TITLES.includes((c.title || "").toLowerCase()));
        if (!cancelled) setItems(merged);
      } catch (e) { if (!cancelled) { setErr(e?.message || "Failed to load certificates"); setItems([]); } }
    })();
    return () => { cancelled = true; };
  }, [fetchGallery]);

  useEffect(() => {
    const onDocClick = (e) => { if (!exportOpen) return; if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    const onEsc = (e) => { 
      if (e.key === "Escape") { 
        setExportOpen(false); 
        setPreview(null); 
        setDeleteItem(null);
      } 
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDocClick); document.removeEventListener("keydown", onEsc); };
  }, [exportOpen]);

  const issuers = useMemo(() => { const s = new Set(); items.forEach((i) => i.issuer && s.add(i.issuer)); return ["All", ...Array.from(s).sort()]; }, [items]);

  const filtered = useMemo(() => {
    const arr = items.filter((i) => {
      const byIssuer = issuer === "All" || i.issuer === issuer;
      const hay = `${i.title} ${i.issuer} ${i.type}`.toLowerCase();
      const byQ = !q || hay.includes(q.toLowerCase());
      return byIssuer && byQ;
    });
    const parseYM = (ym) => { if (!/^\d{4}-\d{2}$/.test(ym || "")) return { y: 0, m: 0 }; const [y, m] = ym.split("-").map(Number); return { y, m }; };
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
    try { const mod = await import("../lib/api.js"); const delFn = mod?.deleteCertificate; if (typeof delFn !== "function") throw new Error("Delete API not available"); await delFn(id); return true; } catch (e) { alert(e?.message || "Delete failed"); return false; }
  }

  const onDelete = async (item) => { if (!owner) return; setDeleteItem(item); };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    if (deleteItem._source === "local") {
      const left = removeLocalCertificate(deleteItem.id).map((c, i) => normalizeItem({ ...c, _source: "local" }, i));
      const api = items.filter((x) => x._source !== "local");
      const map = new Map();
      [...api, ...left].forEach((c) => { const key = (c.title + "|" + c.issuer).toLowerCase(); map.set(key, c); });
      setItems(Array.from(map.values()));
    } else {
      const okDel = await deleteApiCertificate(deleteItem.id);
      if (okDel) setItems((prev) => prev.filter((c) => c.id !== deleteItem.id));
    }
    setDeleteItem(null);
    setPreview(null);
  };

  const goEdit = (c, e) => { if (e) { e.preventDefault(); e.stopPropagation(); } if (!owner) return; if (c._source === "local") nav(`/certificates/edit/${encodeURIComponent(c.id)}`); else nav("/certificates/new", { state: { prefill: c } }); };

  async function verifyUrl(url) {
    if (!url) return false;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      try { const r = await fetch(url, { method: "HEAD", mode: "cors", signal: ctrl.signal }); clearTimeout(t); return r.ok || r.type === "opaque"; } catch { const r2 = await fetch(url, { method: "GET", mode: "no-cors", signal: ctrl.signal }); clearTimeout(t); return !!r2; }
    } catch { return false; }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const toCheck = filtered.filter((c) => c.credentialUrl && verified[c.id] == null);
      for (const c of toCheck) { const ok = await verifyUrl(c.credentialUrl); if (cancelled) break; setVerified((prev) => ({ ...prev, [c.id]: ok })); }
    })();
    return () => { cancelled = true; };
  }, [filtered, verified]);

  const tintFor = (c) => colorFor(c.issuer || c.title);

  const exportData = (format) => {
    const data = filtered.map((c) => ({ title: c.title, issuer: c.issuer, type: c.type, date: c.date, credentialId: c.credentialId, credentialUrl: c.credentialUrl }));
    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "certificates.json"; a.click(); URL.revokeObjectURL(url);
    } else if (format === "csv") {
      const csv = [["Title", "Issuer", "Type", "Date", "Credential ID", "URL"], ...data.map((d) => [d.title, d.issuer, d.type, d.date, d.credentialId, d.credentialUrl])].map((row) => row.map((cell) => `"${(cell ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "certificates.csv"; a.click(); URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <section>
        <div className="container mx-auto px-4 py-10">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Certificates & Licenses</h1>
            </div>
            <div className="h-1.5 w-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full mb-4 shadow-lg" />
            <p className={`text-lg ${darkMode ? "text-gray-300" : "text-slate-600"}`}>Verified achievements from <span className="font-semibold text-indigo-600 dark:text-indigo-400">Udemy</span>, <span className="font-semibold text-purple-600 dark:text-purple-400">Coursera</span>, <span className="font-semibold text-blue-600 dark:text-blue-400">LinkedIn Learning</span>, and professional bodies.</p>
          </div>

          {showStats && <StatsSection items={items} darkMode={darkMode} />}

          <div className={`${darkMode ? "bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100 border-2 border-gray-700 shadow-xl shadow-gray-900/50" : "bg-white text-gray-900 shadow-xl shadow-gray-200/50 border-2 border-gray-100"} rounded-2xl p-6 mb-8 transition-all`}>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                <EnhancedSearchBar value={q} onChange={setQ} darkMode={darkMode} />
                <div className="relative">
                  <select value={issuer} onChange={(e) => setIssuer(e.target.value)} className={`h-10 rounded-xl pr-10 pl-4 text-sm font-medium shadow-md appearance-none transition-all ${darkMode ? "border-2 border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700 hover:border-indigo-600" : "border-2 border-gray-200 bg-white text-gray-900 hover:bg-gray-50 hover:border-indigo-400"}`}>
                    {issuers.map((v) => <option key={v} value={v} className={darkMode ? "bg-gray-800" : "bg-white"}>{v}</option>)}
                  </select>
                  <span className={`pointer-events-none absolute inset-y-0 right-3 grid place-items-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </div>
                <div className="relative">
                  <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className={`h-10 rounded-xl pr-10 pl-4 text-sm font-medium shadow-md appearance-none transition-all ${darkMode ? "border-2 border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700 hover:border-indigo-600" : "border-2 border-gray-200 bg-white text-gray-900 hover:bg-gray-50 hover:border-indigo-400"}`}>
                    <option value="newest" className={darkMode ? "bg-gray-800" : "bg-white"}>Newest first</option>
                    <option value="oldest" className={darkMode ? "bg-gray-800" : "bg-white"}>Oldest first</option>
                    <option value="title" className={darkMode ? "bg-gray-800" : "bg-white"}>Title (A–Z)</option>
                    <option value="issuer" className={darkMode ? "bg-gray-800" : "bg-white"}>Issuer (A–Z)</option>
                  </select>
                  <span className={`pointer-events-none absolute inset-y-0 right-3 grid place-items-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <ViewModeToggle mode={viewMode} onChange={setViewMode} darkMode={darkMode} />
                <button onClick={() => setShowStats(!showStats)} className={`p-2.5 rounded-lg transition-all shadow-md ${darkMode ? "hover:bg-gray-700 hover:shadow-lg" : "hover:bg-gray-100 hover:shadow-lg"}`} title="Toggle stats">
                  <svg className={`${darkMode ? "text-gray-300" : "text-gray-700"} w-5 h-5`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </button>
                {owner && (
                  <div className="relative" ref={exportRef}>
                    <button onClick={() => setExportOpen((s) => !s)} className={`p-2.5 rounded-lg transition-all shadow-md ${darkMode ? "hover:bg-gray-700 hover:shadow-lg" : "hover:bg-gray-100 hover:shadow-lg"}`} title="Export data" aria-haspopup="menu" aria-expanded={exportOpen ? "true" : "false"}>
                      <svg className={`${darkMode ? "text-gray-300" : "text-gray-700"} w-5 h-5`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                    {exportOpen && (
                      <div className={`absolute right-0 mt-2 w-36 rounded-xl shadow-2xl z-10 border-2 overflow-hidden ${darkMode ? "bg-gray-800 text-gray-100 border-gray-700" : "bg-white text-gray-900 border-gray-200"}`} role="menu">
                        <button onClick={() => { exportData("json"); setExportOpen(false); }} className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center gap-2 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`} role="menuitem"><span>📄</span> Export JSON</button>
                        <button onClick={() => { exportData("csv"); setExportOpen(false); }} className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center gap-2 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`} role="menuitem"><span>📊</span> Export CSV</button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => setDarkMode((v) => !v)} className={`px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all shadow-md hover:shadow-lg ${darkMode ? "border-gray-600 hover:bg-gray-700 text-gray-100" : "border-gray-300 hover:bg-gray-50 text-gray-700"}`} title="Toggle dark mode">{darkMode ? "🌙 Dark" : "☀️ Light"}</button>
                {owner && (
                  <button onClick={() => nav("/certificates/new")} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-2xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all" title="Add a new certificate">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    Add Certificate
                  </button>
                )}
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t text-sm font-medium flex items-center gap-2 ${darkMode ? "text-gray-300 border-gray-700" : "text-gray-600 border-gray-200"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Showing <span className="font-bold text-indigo-600 dark:text-indigo-400">{filtered.length}</span> of <span className="font-bold">{items.length}</span> certificate{items.length === 1 ? "" : "s"}
            </div>
          </div>

          {err ? (
            <div className={`rounded-2xl border-2 p-8 text-center ${darkMode ? "bg-red-900/20 border-red-800 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>
              <svg className="w-16 h-16 mx-auto mb-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-lg font-semibold mb-2">Error Loading Certificates</p>
              <p className="text-sm opacity-90">{err}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`rounded-2xl border-2 border-dashed p-12 text-center ${darkMode ? "bg-gray-800/50 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-300 text-gray-600"}`}>
              <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-xl font-bold mb-2">No certificates found</p>
              <p className="text-sm opacity-80 mb-6">Try adjusting your filters or search query</p>
              {owner && (
                <button onClick={() => nav("/certificates/new")} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                  Add Your First Certificate
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
              {filtered.map((c) => {
                const tint = tintFor(c);
                const ok = verified[c.id] === true;
                if (viewMode === "list") {
                  return (
                    <div key={c.id} className={`group rounded-xl border p-5 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 ${darkMode ? "bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700 text-gray-100 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10" : "bg-white border-gray-200 text-gray-900 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100"}`} onClick={() => setPreview(c)}>
                      <div className="flex items-center gap-4">
                        {c.image ? <img src={c.image} alt={c.title} className="w-24 h-24 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-all" /> : <div className={`w-24 h-24 grid place-items-center rounded-lg border-2 border-dashed ${darkMode ? "border-gray-700 bg-gray-900" : "border-gray-300 bg-gray-50"}`}><svg className={`w-10 h-10 opacity-40 ${darkMode ? "text-gray-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-2 group-hover:text-indigo-500 transition-colors truncate">{c.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs px-3 py-1.5 rounded-full border font-semibold" style={{ color: tint, borderColor: `${tint}55`, background: `${tint}15` }}>{c.type}</span>
                            {c.issuer && <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}>🏢 {c.issuer}</span>}
                            {c.date && <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}>📅 {c.date}</span>}
                            {c.credentialUrl && <span className={`text-xs px-3 py-1.5 rounded-full border font-bold ${ok ? `${darkMode ? "text-emerald-400 border-emerald-600 bg-emerald-900/30" : "text-emerald-700 border-emerald-300 bg-emerald-50"}` : `${darkMode ? "text-amber-400 border-amber-600 bg-amber-900/30" : "text-amber-700 border-amber-300 bg-amber-50"}`}`}>{ok ? "✓ VERIFIED" : "⏳ PENDING"}</span>}
                          </div>
                        </div>
                        {owner && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200">
                            <button onClick={(e) => goEdit(c, e)} className={`p-2.5 rounded-lg shadow-md transform hover:scale-110 transition-all ${darkMode ? "bg-gray-900 border border-gray-700 hover:bg-gray-800" : "bg-gray-50 border border-gray-200 hover:bg-white"}`} title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(c); }} className={`p-2.5 rounded-lg shadow-md transform hover:scale-110 transition-all ${darkMode ? "bg-red-900/50 border border-red-700 text-red-400 hover:bg-red-900" : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"}`} title="Delete">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={c.id} className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${darkMode ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 text-gray-100 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/20" : "bg-white border-gray-200 text-gray-900 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-100"}`} onClick={() => setPreview(c)}>
                    {owner && (
                      <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200">
                        <button onClick={(e) => goEdit(c, e)} className={`p-2.5 rounded-lg shadow-lg backdrop-blur-sm transform hover:scale-110 transition-all ${darkMode ? "bg-gray-900/90 border border-gray-700 hover:bg-gray-800 text-gray-300" : "bg-white/95 border border-gray-200 hover:bg-gray-50 text-gray-600"}`} title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(c); }} className={`p-2.5 rounded-lg shadow-lg backdrop-blur-sm transform hover:scale-110 transition-all ${darkMode ? "bg-red-900/90 border border-red-700 text-red-400 hover:bg-red-900" : "bg-red-50/95 border border-red-200 text-red-600 hover:bg-red-100"}`} title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                    <div className={`aspect-[4/3] grid place-items-center overflow-hidden relative ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
                      {c.image ? <img src={c.image} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className={`${darkMode ? "text-gray-300" : "text-gray-500"} text-center`}><svg className="w-16 h-16 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-xs">No image</span></div>}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${darkMode ? "bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" : "bg-gradient-to-t from-white/80 via-transparent to-transparent"}`} />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg line-clamp-2 mb-3 group-hover:text-indigo-500 transition-colors">{c.title}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-3 py-1.5 rounded-full border font-semibold" style={{ color: tint, borderColor: `${tint}55`, background: `${tint}15` }}>{c.type}</span>
                        {c.issuer && <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}>{c.issuer}</span>}
                        {c.date && <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}>{c.date}</span>}
                        {c.credentialUrl && <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${ok ? `${darkMode ? "text-emerald-400 border-emerald-600 bg-emerald-900/30" : "text-emerald-700 border-emerald-300 bg-emerald-50"}` : `${darkMode ? "text-amber-400 border-amber-600 bg-amber-900/30" : "text-amber-700 border-amber-300 bg-amber-50"}`}`}>{ok ? "✓ VERIFIED" : "⏳ PENDING"}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PreviewModal item={preview} onClose={() => setPreview(null)} onEdit={(item) => goEdit(item)} onDelete={(item) => onDelete(item)} owner={owner} verified={preview ? verified[preview.id] : false} darkMode={darkMode} />
        {deleteItem && <DeleteConfirmModal item={deleteItem} onClose={() => setDeleteItem(null)} onConfirm={confirmDelete} darkMode={darkMode} />}

        <style>{`
          .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
        `}</style>
      </section>
    </div>
  );
}