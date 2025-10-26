import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen, Trash2, Plus, Eye, Star,
  ChevronLeft, ChevronRight, Maximize2, Check, Moon, Sun, Download, ZoomIn, ZoomOut, RefreshCcw,
  Search, SortAsc, X, AlertTriangle, Type, Bookmark, Lock, Unlock, FileText, FileDown, File,
  ChevronUp, Minus, Edit, Minimize
} from "lucide-react";

/* ---------- HELPER: Check if running on local server ---------- */
const isLocalServer = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.startsWith('192.168.') ||
         hostname.startsWith('10.') ||
         hostname === '0.0.0.0' ||
         hostname === '' ||
         hostname === '::1';
};

/* ---------- API base ---------- */
const RAW_API = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "").trim();
const API_BASE = RAW_API.replace(/\/+$/, "");
const api = (path) => (API_BASE ? `${API_BASE}${path}` : path);

/* ---------- Lock-only token helper ---------- */
async function getLockToken(password) {
  const url1 = api("/api/auth/owner");
  const url2 = api("/api/auth/owner/");

  const tryFetch = async (url, init) => {
    const res = await fetch(url, init);
    const text = await res.text();
    if (!res.ok) {
      let msg = text || res.statusText || "Authentication failed";
      try {
        const j = JSON.parse(text);
        msg = j.detail ? JSON.stringify(j) : msg;
      } catch {}
      throw new Error(msg);
    }
    return text ? JSON.parse(text) : {};
  };

  const formBody = new URLSearchParams({ pass_: password });
  try {
    const data = await tryFetch(url1, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });
    return { success: true, token: data?.token };
  } catch (e1) {
    try {
      const data = await tryFetch(url2, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody.toString(),
      });
      return { success: true, token: data?.token };
    } catch (e2) {
      try {
        const data = await tryFetch(url1, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pass_: password }),
        });
        return { success: true, token: data?.token };
      } catch (e3) {
        try {
          const data = await tryFetch(url1, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          return { success: true, token: data?.token };
        } catch (e4) {
          return { success: false, error: e4.message || "Authentication failed" };
        }
      }
    }
  }
}

/* ---------- Password Prompt Modal ---------- */
function PasswordPromptModal({ onClose, onSubmit, darkMode, action = "perform this action" }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await getLockToken(password);

      if (result.success) {
        onSubmit(result.token);
        onClose();
      } else {
        setError(result.error || "Authentication failed");
      }
    } catch (e) {
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div
        className={`rounded-2xl shadow-2xl max-w-md w-full ${
          darkMode ? "bg-slate-800 border-2 border-amber-500" : "bg-white border-2 border-amber-500"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-4 flex items-center gap-3 rounded-t-xl">
          <Lock size={32} className="flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold">Owner Authentication Required</h2>
            <p className="text-sm text-amber-100">Enter password to {action}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`p-6 space-y-4 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
          <div>
            <label className="block text-sm font-semibold mb-2">Owner Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter owner password"
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                darkMode 
                  ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" 
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
              }`}
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 p-3 rounded">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              🔒 Enter the owner password to {action}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                darkMode 
                  ? "bg-slate-700 text-slate-200 hover:bg-slate-600" 
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              } disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                loading || !password
                  ? "bg-amber-300 text-amber-100 cursor-not-allowed opacity-50"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <RefreshCcw size={18} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Unlock size={18} />
                    Authenticate
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- fetch helper ---------- */
async function fetchJSON(path, options = {}) {
  let res = await fetch(api(path), options);
  if (res.status === 404 && !path.endsWith("/"))
    res = await fetch(api(path + "/"), options);
  if (!res.ok) {
    const msg = (await res.text()) || res.statusText;
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ---------- Dark Mode Persistence ---------- */
const DARK_MODE_KEY = "bim:darkMode";

const loadDarkMode = () => {
  try {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    return saved === "true";
  } catch {
    return false;
  }
};

const saveDarkMode = (value) => {
  try {
    localStorage.setItem(DARK_MODE_KEY, String(value));
  } catch {}
};

/* ---------- Study Mode Persistence ---------- */
const STUDY_MODE_KEY = "bim:studyMode";

const loadStudyMode = () => {
  try {
    const saved = localStorage.getItem(STUDY_MODE_KEY);
    return saved || "light";
  } catch {
    return "light";
  }
};

const saveStudyMode = (value) => {
  try {
    localStorage.setItem(STUDY_MODE_KEY, value);
  } catch {}
};

/* ---------- Favorites Persistence ---------- */
const FAVORITES_KEY = "bim:favorites";

const loadFavorites = () => {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      const arr = JSON.parse(saved);
      return new Set(arr);
    }
  } catch (e) {
    console.warn("[Favorites] Error loading:", e);
  }
  return new Set();
};

const saveFavorites = (favoritesSet) => {
  try {
    const arr = Array.from(favoritesSet);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("[Favorites] Error saving:", e);
  }
};

/* ---------- Delete Confirmation Modal ---------- */
function DeleteConfirmationModal({ item, onConfirm, onCancel, darkMode }) {
  const [confirmText, setConfirmText] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowWarning(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const blockCount = item?.blocks?.length || 0;
  const hasContent = blockCount > 0;
  const confirmationWord = "DELETE";
  const isConfirmValid = confirmText.trim().toUpperCase() === confirmationWord;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div
        className={`rounded-2xl shadow-2xl max-w-md w-full ${
          darkMode ? "bg-slate-800 border-2 border-red-500" : "bg-white border-2 border-red-500"
        }`}
      >
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center gap-3 rounded-t-xl">
          <AlertTriangle size={32} className="flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold">Confirm Deletion</h2>
            <p className="text-sm text-red-100">This action cannot be undone!</p>
          </div>
        </div>

        <div className={`p-6 space-y-4 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
          {showWarning && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded animate-pulse">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    ⚠️ Warning: Permanent Deletion
                  </p>
                  <p className="text-red-700 dark:text-red-300">
                    You are about to permanently delete this entry. This will remove all {blockCount} content block{blockCount !== 1 ? 's' : ''} and cannot be recovered.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="font-semibold mb-2">Entry Details:</p>
            <div className={`p-3 rounded-lg ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
              <p className="text-sm"><strong>Title:</strong> {item?.title || "Untitled"}</p>
              <p className="text-sm"><strong>ID:</strong> {item?.id}</p>
              <p className="text-sm"><strong>Content Blocks:</strong> {blockCount}</p>
            </div>
          </div>

          {hasContent && (
            <div>
              <label className="block text-sm font-semibold mb-2">
                Type <span className="text-red-600 font-mono">{confirmationWord}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className={`w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  darkMode 
                    ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" 
                    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                }`}
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                darkMode 
                  ? "bg-slate-700 text-slate-200 hover:bg-slate-600" 
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={hasContent && !isConfirmValid}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                hasContent && !isConfirmValid
                  ? "bg-red-300 text-red-100 cursor-not-allowed opacity-50"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Trash2 size={18} />
                Delete Permanently
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Render HTML Content ---------- */
function renderHTMLContent(htmlContent, className = "", darkMode = false) {
  if (!htmlContent) return null;
  if (!htmlContent.includes("<")) {
    return <div className={className}>{htmlContent}</div>;
  }
  
  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

/* ---------- Full-Screen Image Viewer ---------- */
function FullScreenImageViewer({ images = [], initialIndex = 0, onClose }) {
  const safeImages = Array.isArray(images) ? images.filter((im) => im && im.value) : [];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeImages.length, onClose]);

  if (safeImages.length === 0) return null;

  const goToPrevious = (e) => {
    e?.stopPropagation?.();
    setCurrentIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  };

  const goToNext = (e) => {
    e?.stopPropagation?.();
    setCurrentIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  };

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  const zoomAtPoint = (deltaScale, clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2 - offset.x;
    const cy = clientY - rect.top - rect.height / 2 - offset.y;
    const newScale = clamp(scale * deltaScale, 1, 5);
    const k = newScale / scale;
    const newOffset = {
      x: offset.x - cx * (k - 1),
      y: offset.y - cy * (k - 1),
    };
    setScale(newScale);
    setOffset(newOffset);
  };

  const onWheel = (e) => {
    e.preventDefault();
    const deltaScale = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAtPoint(deltaScale, e.clientX, e.clientY);
  };

  const onDoubleClick = (e) => {
    e.stopPropagation();
    const next = scale < 1.25 ? 1.5 : scale < 2.5 ? 3 : 1;
    const deltaScale = next / scale;
    zoomAtPoint(deltaScale, e.clientX, e.clientY);
  };

  const onPointerDown = (e) => {
    if (scale === 1) return;
    const el = e.currentTarget;
    el.setPointerCapture?.(e.pointerId);
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  };

  const onPointerMove = (e) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({ x: dragState.current.startOffsetX + dx, y: dragState.current.startOffsetY + dy });
  };

  const onPointerUp = (e) => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    const el = e.currentTarget;
    el.releasePointerCapture?.(e.pointerId);
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const downloadCurrent = async () => {
    try {
      const src = safeImages[currentIndex].value;
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = src.split("/").pop() || `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback method
      const src = safeImages[currentIndex].value;
      const a = document.createElement("a");
      a.href = src;
      a.download = src.split("/").pop() || `image-${Date.now()}.jpg`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {safeImages.length > 1 && (
        <div className="absolute top-6 left-6 px-4 py-2 bg-black/50 text-white rounded-lg font-semibold select-none">
          {currentIndex + 1} / {safeImages.length}
        </div>
      )}

      <div className="absolute top-6 right-6 flex gap-2 z-10">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); downloadCurrent(); }}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          title="Download image"
        >
          <Download size={20} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomAtPoint(1.15, window.innerWidth / 2, window.innerHeight / 2); }}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          title="Zoom in"
        >
          <ZoomIn size={20} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomAtPoint(1/1.15, window.innerWidth / 2, window.innerHeight / 2); }}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          title="Zoom out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); resetView(); }}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          title="Reset"
        >
          <RefreshCcw size={20} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Close (Esc)"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none px-4 py-4"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img
          ref={imgRef}
          src={safeImages[currentIndex].value}
          alt=""
          className="select-none will-change-transform rounded-lg"
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            maxWidth: "90vw",
            maxHeight: "90vh",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            cursor: scale > 1 ? (dragState.current.dragging ? "grabbing" : "grab") : "default",
            userSelect: "none"
          }}
        />

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all"
              title="Previous (←)"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all"
              title="Next (→)"
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-3 rounded-lg max-w-[90vw] overflow-x-auto">
          {safeImages.map((img, index) => (
            <button
              key={`thumb-${index}`}
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                index === currentIndex ? "border-blue-500 scale-110" : "border-white/30 hover:border-white/60"
              }`}
            >
              <img src={img.value} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Image Carousel ---------- */
function ImageCarousel({ images = [], isPreview = false, onFullScreen, studyMode = 'light' }) {
  const safeImages = Array.isArray(images) ? images.filter((im) => im && im.value) : [];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex > safeImages.length - 1) setCurrentIndex(0);
  }, [safeImages.length, currentIndex]);

  if (safeImages.length === 0) return null;

  const goToPrevious = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  };

  const goToNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index, e) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (onFullScreen) onFullScreen(currentIndex);
  };

  const handleFullScreenClick = (e) => {
    e.stopPropagation();
    if (onFullScreen) onFullScreen(currentIndex);
  };

  const getArrowStyle = () => {
    if (studyMode === 'light' || studyMode === 'sepia') {
      return "bg-black/70 hover:bg-black/90 text-white border-2 border-white/20";
    } else {
      return "bg-white/90 hover:bg-white text-slate-900 border-2 border-slate-700 shadow-xl";
    }
  };

  return (
    <div className="relative group">
      <div
        className={`relative ${isPreview ? "h-48" : "h-96"} rounded-lg overflow-hidden border-2 ${
          studyMode === 'light' ? 'border-slate-200 bg-slate-50' :
          studyMode === 'sepia' ? 'border-amber-200 bg-amber-50' :
          studyMode === 'blue' ? 'border-blue-300 bg-blue-50' :
          studyMode === 'green' ? 'border-green-300 bg-green-50' :
          studyMode === 'amber' ? 'border-amber-300 bg-amber-100' :
          'border-purple-300 bg-purple-50'
        } cursor-pointer`}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={safeImages[currentIndex].value}
          alt=""
          className="w-full h-full object-contain"
          loading="lazy"
        />

        <button
          type="button"
          onClick={handleFullScreenClick}
          className={`absolute top-3 right-3 ${getArrowStyle()} p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100`}
          title="View full screen (or double-click)"
        >
          <Maximize2 size={20} />
        </button>

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${getArrowStyle()} p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-lg`}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${getArrowStyle()} p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-lg`}
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {safeImages.map((_, index) => (
            <button
              type="button"
              key={`dot-${index}`}
              onClick={(e) => goToSlide(index, e)}
              aria-label={`Go to image ${index + 1}`}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-blue-600 w-8" : "bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- group consecutive images ---------- */
function groupConsecutiveImages(blocks = []) {
  const grouped = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b?.type === "image") {
      const imageGroup = [];
      while (i < blocks.length && blocks[i]?.type === "image") {
        imageGroup.push(blocks[i]);
        i++;
      }
      grouped.push(imageGroup.length > 1 ? { type: "image-group", images: imageGroup } : imageGroup[0]);
    } else {
      grouped.push(b);
      i++;
    }
  }
  return grouped;
}

/* ---------- first H1 extraction ---------- */
function extractMainTitle(blocks = []) {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block?.type === "h1" || block?.type === "h2") {
      const value = String(block.value || "").trim();
      const textOnly = value.replace(/<[^>]*>/g, "");
      if (textOnly) {
        return { title: textOnly, blockIndex: i };
      }
    }
  }
  return null;
}

/* ---------- Locked Content Overlay ---------- */
function LockedContentOverlay({ darkMode = false }) {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float-animation { animation: float 3s ease-in-out infinite; }
        .locked-content-blur {
          filter: blur(8px);
          opacity: 0.3;
          user-select: none;
          pointer-events: none;
        }
      `}</style>

      <div className={`absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm bg-gradient-to-br from-amber-50/95 via-orange-50/95 to-amber-100/95 dark:from-slate-800/95 dark:via-slate-700/95 dark:to-slate-800/95`}>
        <div className="relative text-center px-6 py-6">
          <div className="mb-4 float-animation">
            <div className={`p-4 rounded-full ${darkMode ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'} shadow-2xl inline-block`}>
              <Lock size={36} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <p className={`text-xl font-bold mb-2 ${darkMode ? 'text-amber-300' : 'text-amber-900'}`}>
            🔒 Content Locked
          </p>
          <p className={`text-base font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            Unlock and click <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>View More</span>
          </p>
        </div>
      </div>
    </>
  );
}

/* ---------- Shared preview body ---------- */
function PreviewContent({ blocks = [], darkMode = false }) {
  const groupedBlocks = groupConsecutiveImages(blocks);
  return (
    <div
      className={`p-4 rounded-lg border space-y-4 max-h-48 overflow-hidden relative ${
        darkMode
          ? "bg-gradient-to-br from-slate-800 to-white/0 border-slate-600"
          : "bg-gradient-to-br from-slate-50 to-white border-slate-200"
      }`}
    >
      {groupedBlocks.slice(0, 5).map((block, idx) => {
        if (block?.type === "h1") return null;

        if (block?.type === "h2") {
          const textContent = String(block.value || "")
            .replace(/<[^>]*>/g, "")
            .slice(0, 100);
          return (
            <h2
              key={`pv-h2-${idx}`}
              className={`text-lg font-extrabold mb-2 mt-3 pb-1 border-b border-blue-400 ${
                darkMode ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {textContent}
            </h2>
          );
        }

        if (block?.type === "text") {
          const textContent = String(block.value || "")
            .replace(/<[^>]*>/g, "")
            .slice(0, 180);
          return (
            <div
              key={`pv-text-${idx}`}
              className={`leading-relaxed text-sm ${
                darkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {textContent}
              {textContent.length >= 180 ? "…" : ""}
            </div>
          );
        }

        if (block?.type === "image-group" || block?.type === "image") {
          return (
            <div
              key={`pv-img-${idx}`}
              className={`relative w-full h-20 rounded-lg overflow-hidden border ${
                darkMode ? "border-slate-600 bg-slate-700" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="w-full h-full flex items-center justify-center">
                <Eye size={32} className={`${darkMode ? "text-slate-500" : "text-slate-300"}`} />
                <span
                  className={`ml-2 text-sm font-semibold ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {block?.type === "image-group" ? `${block.images.length} Images` : "Image"}
                </span>
              </div>
            </div>
          );
        }

        return null;
      })}
      {groupedBlocks.length > 5 && (
        <div className="text-xs italic text-slate-400">+ more content…</div>
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t pointer-events-none ${
          darkMode ? "from-slate-700" : "from-white"
        }`}
      />
    </div>
  );
}

/* ---------- Unlocked overlay ---------- */
function UnlockedPreviewOverlay({ darkMode = false }) {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      <div className={`absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm ${
        darkMode ? "bg-gradient-to-br from-blue-900/20 via-slate-800/30 to-slate-900/20"
                 : "bg-gradient-to-br from-blue-50/90 via-cyan-50/90 to-white/90"
      }`}>
        <div className="text-center px-6 py-6">
          <div className="mb-3">
            <div className={`p-3 rounded-full shadow-2xl inline-block animate-[float_3s_ease-in-out_infinite] ${
              darkMode ? "bg-blue-700" : "bg-blue-600"
            }`}>
              <Eye size={32} className="text-white" />
            </div>
          </div>
          <p className={`text-base font-bold mb-1 ${
            darkMode ? "text-blue-200" : "text-blue-900"
          }`}>
            Preview available
          </p>
          <p className={`${darkMode ? "text-slate-200" : "text-slate-700"} text-sm`}>
            Click <span className={`font-bold ${darkMode ? "text-blue-300" : "text-blue-700"}`}>View More</span> to see details
          </p>
        </div>
      </div>
    </>
  );
}

/* ---------- Preview wrapper ---------- */
function BlockPreview({ blocks = [], darkMode = false, locked = false }) {
  if (!blocks.length) {
    return (
      <div
        className={`flex items-center justify-center h-24 rounded-lg border ${
          darkMode
            ? "bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600"
            : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200"
        }`}
      >
        <p className="text-sm text-slate-400">No content</p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg border overflow-hidden ${
        darkMode ? "border-slate-600" : "border-slate-200"
      }`}
      style={{ minHeight: "12rem" }}
    >
      <div className="locked-content-blur">
        <PreviewContent blocks={blocks} darkMode={darkMode} />
      </div>

      {locked ? (
        <LockedContentOverlay darkMode={darkMode} />
      ) : (
        <UnlockedPreviewOverlay darkMode={darkMode} />
      )}
    </div>
  );
}

/* ---------- Download Format Dropdown ---------- */
function DownloadDropdown({ onDownload }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formats = [
    { value: 'pdf', label: 'PDF Document', icon: File, color: 'text-red-500' },
    { value: 'txt', label: 'Plain Text', icon: FileText, color: 'text-blue-500' },
    { value: 'html', label: 'HTML File', icon: FileDown, color: 'text-orange-500' },
    { value: 'md', label: 'Markdown', icon: FileText, color: 'text-purple-500' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1"
        title="Download"
      >
        <Download size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 rounded-xl shadow-2xl border overflow-hidden z-[110] bg-white border-slate-200">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide bg-slate-50 text-slate-600">
            Download As
          </div>
          {formats.map((format) => (
            <button
              key={format.value}
              onClick={(e) => {
                e.stopPropagation();
                onDownload(format.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 transition text-left hover:bg-slate-50 text-slate-700"
            >
              <format.icon size={18} className={format.color} />
              <span className="text-sm font-medium">{format.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Study Mode Dropdown ---------- */
function StudyModeDropdown({ studyMode, onStudyModeChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const modes = [
    { value: 'light', label: 'Light Mode', icon: '☀️' },
    { value: 'sepia', label: 'Sepia Mode', icon: '📜' },
    { value: 'blue', label: 'Blue Mode', icon: '💙' },
    { value: 'green', label: 'Green Mode', icon: '💚' },
    { value: 'amber', label: 'Amber Mode', icon: '🟡' },
    { value: 'purple', label: 'Purple Mode', icon: '💜' },
  ];

  const currentMode = modes.find(m => m.value === studyMode) || modes[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
        title="Study Mode"
      >
        <span className="text-sm font-medium">{currentMode.icon} {currentMode.label}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-52 rounded-xl shadow-2xl border overflow-hidden z-[110] bg-white border-slate-200">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide bg-slate-50 text-slate-600">
            Study Mode
          </div>
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={(e) => {
                e.stopPropagation();
                onStudyModeChange(mode.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 transition text-left hover:bg-slate-50 text-slate-700 ${
                studyMode === mode.value ? 'bg-blue-50 font-semibold' : ''
              }`}
            >
              <span className="text-sm flex items-center gap-2">
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </span>
              {studyMode === mode.value && <Check size={16} className="text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- PDF Export ---------- */
async function generatePDF(displayTitle, groupedBlocks, fontSize) {
  if (!window.jspdf) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);
    await new Promise((resolve) => { script.onload = resolve; });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;
  
  const checkPageBreak = (requiredHeight) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };
  
  const extractText = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };
  
  const wrapText = (text, maxWidth, fontSize) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines;
  };
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const titleLines = wrapText(displayTitle, contentWidth, 24);
  titleLines.forEach((line, i) => {
    doc.text(line, margin, yPosition);
    yPosition += 10;
  });
  
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;
  
  for (const block of groupedBlocks) {
    if (block?.type === "h1") {
      continue;
    }
    
    if (block?.type === "h2") {
      checkPageBreak(15);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const text = extractText(block.value);
      const lines = wrapText(text, contentWidth, 18);
      lines.forEach((line) => {
        doc.text(line, margin, yPosition);
        yPosition += 8;
      });
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    }
    
    else if (block?.type === "text") {
      checkPageBreak(10);
      doc.setFontSize(fontSize || 11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const text = extractText(block.value);
      const lines = wrapText(text, contentWidth, fontSize || 11);
      
      for (const line of lines) {
        checkPageBreak(7);
        doc.text(line, margin, yPosition);
        yPosition += 7 * 1.5;
      }
      yPosition += 3;
    }
    
    else if (block?.type === "code") {
      checkPageBreak(20);
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, yPosition - 3, contentWidth, 10, 'F');
      
      doc.setFontSize(9);
      doc.setFont('courier', 'normal');
      doc.setTextColor(16, 185, 129);
      
      yPosition += 5;
      const codeLines = String(block.value || '').split('\n');
      
      for (const line of codeLines) {
        if (checkPageBreak(5)) {
          doc.setFillColor(30, 41, 59);
          doc.rect(margin, yPosition - 3, contentWidth, 10, 'F');
        }
        doc.text(line || ' ', margin + 2, yPosition);
        yPosition += 5;
      }
      yPosition += 8;
    }
    
    else if (block?.type === "image") {
      try {
        checkPageBreak(60);
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => {
            console.warn('Image load failed:', block.value);
            resolve();
          };
          img.src = block.value;
        });
        
        if (img.complete && img.naturalWidth > 0) {
          const imgWidth = contentWidth;
          const imgHeight = (img.height / img.width) * imgWidth;
          const maxHeight = 100;
          const finalHeight = Math.min(imgHeight, maxHeight);
          
          checkPageBreak(finalHeight + 10);
          doc.addImage(img, 'JPEG', margin, yPosition, imgWidth, finalHeight);
          yPosition += finalHeight + 10;
        }
      } catch (e) {
        console.warn('Failed to add image to PDF:', e);
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('[Image]', margin, yPosition);
        yPosition += 10;
      }
    }
    
    else if (block?.type === "image-group") {
      for (const img of block.images) {
        try {
          checkPageBreak(60);
          const image = new Image();
          image.crossOrigin = "anonymous";
          await new Promise((resolve) => {
            image.onload = resolve;
            image.onerror = resolve;
            image.src = img.value;
          });
          
          if (image.complete && image.naturalWidth > 0) {
            const imgWidth = contentWidth;
            const imgHeight = (image.height / image.width) * imgWidth;
            const maxHeight = 80;
            const finalHeight = Math.min(imgHeight, maxHeight);
            
            checkPageBreak(finalHeight + 10);
            doc.addImage(image, 'JPEG', margin, yPosition, imgWidth, finalHeight);
            yPosition += finalHeight + 10;
          }
        } catch (e) {
          console.warn('Failed to add image to PDF:', e);
        }
      }
    }
  }
  
  return doc;
}

/* ---------- Minimized Window Bar ---------- */
function MinimizedWindowBar({ windows, onRestore, onClose }) {
  if (windows.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-slate-800/95 backdrop-blur-md border-t border-slate-700 p-2">
      <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
        {windows.map((window) => (
          <div
            key={window.id}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-2 min-w-[200px] max-w-[300px] transition-colors group"
          >
            <BookOpen size={16} className="text-blue-400 flex-shrink-0" />
            <span className="text-white text-sm truncate flex-1">{window.title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestore(window.id);
              }}
              className="p-1 hover:bg-slate-500 rounded transition-colors"
              title="Restore"
            >
              <ChevronUp size={16} className="text-white" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(window.id);
              }}
              className="p-1 hover:bg-red-500 rounded transition-colors"
              title="Close"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Full View Modal ---------- */
function FullViewModal({ item, onClose, owner, windowId, onMinimize }) {
  const navigate = useNavigate();
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState(new Set());
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [fullScreenImages, setFullScreenImages] = useState(null);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  
  const [windowMode, setWindowMode] = useState('normal');
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("default");
  const [readingMode, setReadingMode] = useState(false);
  const [showReadingPanel, setShowReadingPanel] = useState(false);
  const [bookmarkedSections, setBookmarkedSections] = useState(new Set());
  const [studyMode, setStudyMode] = useState(loadStudyMode());

  const contentRef = useRef(null);

  useEffect(() => {
    saveStudyMode(studyMode);
  }, [studyMode]);

  useEffect(() => {
    if (!isMinimized) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isMinimized]);

  if (!item) return null;

  const groupedBlocks = useMemo(() => groupConsecutiveImages(item.blocks || []), [item]);
  const mainTitleInfo = extractMainTitle(item.blocks || []);
  const displayTitle = mainTitleInfo ? mainTitleInfo.title : item.title;

  const toggleCodeExpansion = (index) =>
    setExpandedCodeBlocks((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code || "").then(() => {
      setCopiedCodeIndex(index);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    });
  };

  const openFullScreen = (images, index) => {
    setFullScreenImages(images);
    setFullScreenIndex(index);
  };

  const closeFullScreen = () => {
    setFullScreenImages(null);
    setFullScreenIndex(0);
  };

  const toggleBookmark = (index) => {
    setBookmarkedSections(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const getFontFamilyClass = () => {
    switch(fontFamily) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      case 'sans': return 'font-sans';
      default: return '';
    }
  };

  const extractTextContent = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const handleEdit = () => {
    if (!owner) return;
    onClose();
    navigate(`/bim/edit/${encodeURIComponent(item.id)}`);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    onMinimize(windowId, displayTitle);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  // Listen for restore events
  useEffect(() => {
    const handleRestoreEvent = (event) => {
      if (event.detail && event.detail.windowId === windowId) {
        handleRestore();
      }
    };
    
    window.addEventListener('restoreWindow', handleRestoreEvent);
    return () => window.removeEventListener('restoreWindow', handleRestoreEvent);
  }, [windowId]);

  const handleDownload = async (format) => {
    setDownloading(true);
    try {
      const filename = displayTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      if (format === 'txt') {
        downloadAsText(filename);
      } else if (format === 'html') {
        downloadAsHTML(filename);
      } else if (format === 'md') {
        downloadAsMarkdown(filename);
      } else if (format === 'pdf') {
        await downloadAsPDF(filename);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsText = (filename) => {
    let content = `${displayTitle}\n${'='.repeat(displayTitle.length)}\n\n`;
    
    groupedBlocks.forEach((block) => {
      if (block?.type === "h1" || block?.type === "h2") {
        const text = extractTextContent(block.value);
        content += `\n${text}\n${'-'.repeat(text.length)}\n\n`;
      } else if (block?.type === "text") {
        const text = extractTextContent(block.value);
        content += text + '\n\n';
      } else if (block?.type === "code") {
        content += '```\n' + (block.value || '') + '\n```\n\n';
      } else if (block?.type === "image") {
        content += `[Image: ${block.value}]\n\n`;
      } else if (block?.type === "image-group") {
        content += `[Image Gallery: ${block.images.length} images]\n\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsHTML = (filename) => {
    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.7;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #1e293b;
      background: white;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 1.5rem;
      color: #0f172a;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 15px;
    }
    h2 {
      font-size: 2rem;
      font-weight: 700;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #3b82f6;
      color: #1e293b;
    }
    p { margin: 1rem 0; line-height: 1.7; }
    ul, ol { margin: 1rem 0; padding-left: 2.5rem; }
    code {
      background-color: rgba(135,131,120,.15);
      color: #eb5757;
      border-radius: 4px;
      font-size: 90%;
      padding: 0.2em 0.4em;
    }
    pre {
      background-color: #1e293b;
      color: #10b981;
      padding: 1.5rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
      margin: 1.5rem 0;
    }
  </style>
</head>
<body>
  <h1>${displayTitle}</h1>
`;

    groupedBlocks.forEach((block) => {
      if (block?.type === "h1") {
      } else if (block?.type === "h2") {
        htmlContent += `  <h2>${block.value}</h2>\n`;
      } else if (block?.type === "text") {
        htmlContent += `  <div>${block.value}</div>\n`;
      } else if (block?.type === "code") {
        const escaped = (block.value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        htmlContent += `  <pre><code>${escaped}</code></pre>\n`;
      } else if (block?.type === "image") {
        htmlContent += `  <img src="${block.value}" alt="Content image" />\n`;
      } else if (block?.type === "image-group") {
        block.images.forEach(img => {
          htmlContent += `  <img src="${img.value}" alt="Content image" />\n`;
        });
      }
    });

    htmlContent += `</body>\n</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsMarkdown = (filename) => {
    let content = `# ${displayTitle}\n\n`;
    
    groupedBlocks.forEach((block) => {
      if (block?.type === "h1") {
      } else if (block?.type === "h2") {
        const text = extractTextContent(block.value);
        content += `## ${text}\n\n`;
      } else if (block?.type === "text") {
        const text = extractTextContent(block.value);
        content += text + '\n\n';
      } else if (block?.type === "code") {
        const lang = block.language || 'javascript';
        content += `\`\`\`${lang}\n${block.value || ''}\n\`\`\`\n\n`;
      } else if (block?.type === "image") {
        content += `![Image](${block.value})\n\n`;
      } else if (block?.type === "image-group") {
        block.images.forEach(img => {
          content += `![Image](${img.value})\n`;
        });
        content += '\n';
      }
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsPDF = async (filename) => {
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); color: white; padding: 20px 40px; border-radius: 10px; z-index: 10000; font-size: 16px; font-weight: bold;';
    loadingDiv.textContent = '📄 Generating PDF... Please wait';
    document.body.appendChild(loadingDiv);

    try {
      const doc = await generatePDF(displayTitle, groupedBlocks, fontSize);
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF: ' + error.message);
      throw error;
    } finally {
      if (document.body.contains(loadingDiv)) {
        document.body.removeChild(loadingDiv);
      }
    }
  };

  const getCodeTheme = () => {
    switch(studyMode) {
      case 'light':
        return {
          bg: '#f8f9fa',
          border: '#e9ecef',
          text: '#212529'
        };
      case 'sepia':
        return {
          bg: '#f5f1e8',
          border: '#d4c5a9',
          text: '#5c4a3a'
        };
      case 'blue':
        return {
          bg: '#eff6ff',
          border: '#dbeafe',
          text: '#1e40af'
        };
      case 'green':
        return {
          bg: '#f0fdf4',
          border: '#dcfce7',
          text: '#166534'
        };
      case 'amber':
        return {
          bg: '#fffbeb',
          border: '#fef3c7',
          text: '#92400e'
        };
      case 'purple':
        return {
          bg: '#faf5ff',
          border: '#f3e8ff',
          text: '#6b21a8'
        };
      default:
        return {
          bg: '#1e293b',
          border: '#334155',
          text: '#10b981'
        };
    }
  };

  if (isMinimized) {
    return null;
  }

  return (
    <>
      {fullScreenImages && (
        <FullScreenImageViewer images={fullScreenImages} initialIndex={fullScreenIndex} onClose={closeFullScreen} />
      )}

      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden transition-all duration-300`}
        onClick={onClose}
      >
        <div
          className={`rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-white transition-all duration-300 ${
            windowMode === 'maximized' 
              ? 'w-full h-full max-w-none max-h-none rounded-none' 
              : 'max-w-4xl w-full max-h-[90vh]'
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {item.locked && (
                <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Lock size={16} />
                  <span className="text-xs font-bold">LOCKED</span>
                </div>
              )}
              <h1 className="text-3xl font-bold truncate">{displayTitle}</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleMinimize}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Minimize"
              >
                <Minus size={20} />
              </button>
              <button
                type="button"
                onClick={() => setWindowMode(windowMode === 'maximized' ? 'normal' : 'maximized')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={windowMode === 'maximized' ? 'Restore' : 'Maximize'}
              >
                {windowMode === 'maximized' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="14" height="14" rx="2" />
                    <path d="M7 21h10a2 2 0 0 0 2-2V9" />
                  </svg>
                ) : (
                  <Maximize2 size={20} />
                )}
              </button>
              
              {isLocalServer() && owner && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Edit entry"
                >
                  <Edit size={20} />
                  <span className="text-sm font-semibold">Edit</span>
                </button>
              )}
              <DownloadDropdown onDownload={handleDownload} />
              <StudyModeDropdown studyMode={studyMode} onStudyModeChange={setStudyMode} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReadingPanel(!showReadingPanel);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Reading Settings"
              >
                <Type size={20} />
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {showReadingPanel && (
            <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50 border-slate-200">
              <h3 className="text-sm font-bold mb-3 text-slate-700">
                📖 Reading Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1 text-slate-600">
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="14"
                    max="28"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1 text-slate-600">
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-2 py-1 rounded text-sm bg-white text-slate-800 border border-slate-200"
                  >
                    <option value="default">Default</option>
                    <option value="serif">Serif</option>
                    <option value="sans">Sans-serif</option>
                    <option value="mono">Monospace</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReadingMode(!readingMode)}
                  className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                    readingMode 
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {readingMode ? "Exit" : "Enable"} Focus Mode
                </button>
              </div>
            </div>
          )}

          <style>{`
            .rich-text-content {
              color: inherit;
            }
            
            .rich-text-content * {
              background-color: transparent !important;
              background-image: none !important;
            }
            
            .rich-text-content strong,
            .rich-text-content b {
              font-weight: 700;
            }

            .rich-text-content em,
            .rich-text-content i {
              font-style: italic;
            }

            .rich-text-content u {
              text-decoration: underline;
            }

            .rich-text-content ul,
            .rich-text-content ol {
              margin: 1rem 0;
              padding-left: 2.5rem;
            }

            .rich-text-content ul {
              list-style-type: disc;
            }

            .rich-text-content ol {
              list-style-type: decimal;
            }

            .rich-text-content li {
              margin: 0.5rem 0;
              padding-left: 0.5rem;
              line-height: 1.6;
            }

            .rich-text-content p {
              margin: 0.75rem 0;
              line-height: inherit;
            }

            .rich-text-content code {
              background-color: rgba(135,131,120,.15) !important;
              color: #eb5757 !important;
              border-radius: 4px;
              font-size: 90%;
              padding: 0.2em 0.4em;
            }

            .rich-text-content a {
              text-decoration: underline;
            }

            .study-mode-light {
              background-color: #ffffff !important;
            }
            
            .study-mode-light .rich-text-content > *:not([style*="color"]) {
              color: #1e293b !important;
            }

            .study-mode-sepia {
              background-color: #f5f1e8 !important;
            }
            
            .study-mode-sepia .rich-text-content > *:not([style*="color"]) {
              color: #5c4a3a !important;
            }

            .study-mode-blue {
              background-color: #eff6ff !important;
            }
            
            .study-mode-blue .rich-text-content > *:not([style*="color"]) {
              color: #1e3a8a !important;
            }

            .study-mode-green {
              background-color: #f0fdf4 !important;
            }
            
            .study-mode-green .rich-text-content > *:not([style*="color"]) {
              color: #14532d !important;
            }

            .study-mode-amber {
              background-color: #fffbeb !important;
            }
            
            .study-mode-amber .rich-text-content > *:not([style*="color"]) {
              color: #78350f !important;
            }

            .study-mode-purple {
              background-color: #faf5ff !important;
            }
            
            .study-mode-purple .rich-text-content > *:not([style*="color"]) {
              color: #581c87 !important;
            }

            .study-mode-sepia h1,
            .study-mode-sepia h2 {
              color: #3c2f23 !important;
            }

            .study-mode-light h1,
            .study-mode-light h2 {
              color: #0f172a !important;
            }

            .study-mode-blue h1,
            .study-mode-blue h2 {
              color: #1e3a8a !important;
            }

            .study-mode-green h1,
            .study-mode-green h2 {
              color: #14532d !important;
            }

            .study-mode-amber h1,
            .study-mode-amber h2 {
              color: #78350f !important;
            }

            .study-mode-purple h1,
            .study-mode-purple h2 {
              color: #581c87 !important;
            }

            .study-mode-light .rich-text-content a:not([style*="color"]) {
              color: #2563eb !important;
            }

            .study-mode-sepia .rich-text-content a:not([style*="color"]) {
              color: #b45309 !important;
            }

            .study-mode-blue .rich-text-content a:not([style*="color"]) {
              color: #1d4ed8 !important;
            }

            .study-mode-green .rich-text-content a:not([style*="color"]) {
              color: #15803d !important;
            }

            .study-mode-amber .rich-text-content a:not([style*="color"]) {
              color: #b45309 !important;
            }

            .study-mode-purple .rich-text-content a:not([style*="color"]) {
              color: #7c3aed !important;
            }

            .reading-content-container {
              scroll-behavior: smooth;
            }
            
            .reading-content-container::-webkit-scrollbar {
              width: 12px;
            }
            
            .reading-content-container::-webkit-scrollbar-track {
              background: transparent;
            }
            
            .reading-content-container::-webkit-scrollbar-thumb {
              background: rgba(100, 116, 139, 0.3);
              border-radius: 6px;
            }
            
            .reading-content-container::-webkit-scrollbar-thumb:hover {
              background: rgba(100, 116, 139, 0.5);
            }
          `}</style>

          <div
            ref={contentRef}
            className={`flex-1 overflow-y-auto overflow-x-hidden p-8 pb-24 reading-content-container study-mode-${studyMode} ${readingMode ? "max-w-3xl mx-auto" : ""} ${getFontFamilyClass()}`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.7,
            }}
          >
            <div className="max-w-none space-y-6">
              {groupedBlocks.length ? (
                groupedBlocks.map((block, idx) => {
                  if (block?.type === "h1") return null;

                  if (block?.type === "h2") {
                    return (
                      <div key={`h2-${idx}`} className="relative group">
                        {bookmarkedSections.has(idx) && (
                          <Bookmark size={20} className="absolute -left-8 top-1 text-amber-500 fill-amber-500" />
                        )}
                        <h2 className="text-3xl font-extrabold mb-3 mt-4 pb-2 border-b-2 border-blue-400">
                          {renderHTMLContent(block.value, "", false)}
                        </h2>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(idx)}
                          className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Bookmark section"
                        >
                          <Bookmark size={18} className={bookmarkedSections.has(idx) ? "fill-amber-500 text-amber-500" : "text-slate-400"} />
                        </button>
                      </div>
                    );
                  }

                  if (block?.type === "text") {
                    return (
                      <div key={`p-${idx}`} className="leading-relaxed">
                        {renderHTMLContent(block.value, "", false)}
                      </div>
                    );
                  }

                  if (block?.type === "image-group") {
                    return (
                      <div key={`ig-${idx}`} className="my-6">
                        <ImageCarousel
                          images={block.images}
                          isPreview={false}
                          onFullScreen={(index) => openFullScreen(block.images, index)}
                          studyMode={studyMode}
                        />
                      </div>
                    );
                  }

                  if (block?.type === "image") {
                    return (
                      <div
                        key={`im-${idx}`}
                        className="my-6 relative group cursor-pointer"
                        onDoubleClick={() => openFullScreen([block], 0)}
                      >
                        <div className={`rounded-lg border overflow-hidden ${
                          studyMode === 'light' ? 'border-slate-200 bg-slate-50' :
                          studyMode === 'sepia' ? 'border-amber-200 bg-amber-50' :
                          studyMode === 'blue' ? 'border-blue-300 bg-blue-50' :
                          studyMode === 'green' ? 'border-green-300 bg-green-50' :
                          studyMode === 'amber' ? 'border-amber-300 bg-amber-100' :
                          'border-purple-300 bg-purple-50'
                        }`}>
                          <img
                            src={block.value}
                            alt=""
                            className="w-full h-auto max-h-[600px] object-contain mx-auto"
                            loading="lazy"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => openFullScreen([block], 0)}
                          className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="View full screen"
                        >
                          <Maximize2 size={20} />
                        </button>
                      </div>
                    );
                  }

                  if (block?.type === "code") {
                    const isExpanded = expandedCodeBlocks.has(idx);
                    const lines = String(block.value || "").split("\n");
                    const hasMore = lines.length > 10;
                    const codeTheme = getCodeTheme();

                    return (
                      <div key={`cd-${idx}`} className="my-6">
                        <div className="relative group/code">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCode(block.value, idx);
                            }}
                            className={`absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all opacity-0 group-hover/code:opacity-100 ${
                              copiedCodeIndex === idx ? "bg-green-500 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
                            }`}
                            title="Copy code"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {copiedCodeIndex === idx ? (
                                <>
                                  <Check size={14} /> Copied!
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy
                                </>
                              )}
                            </span>
                          </button>

                          <pre 
                            className="rounded-lg p-6 overflow-x-auto overflow-y-auto border-2"
                            style={{ 
                              maxHeight: isExpanded ? 'none' : '400px',
                              fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, Monaco, "Courier New", monospace',
                              fontSize: '14px',
                              lineHeight: '1.6',
                              tabSize: 4,
                              backgroundColor: codeTheme.bg,
                              borderColor: codeTheme.border,
                              color: codeTheme.text
                            }}
                          >
                            <code style={{ color: codeTheme.text }}>{block.value || ""}</code>
                          </pre>

                          {hasMore && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCodeExpansion(idx);
                                }}
                                className={`px-5 py-2.5 rounded-lg transition-all text-sm font-bold flex items-center gap-2 shadow-lg ${
                                  studyMode === 'light' || studyMode === 'sepia'
                                    ? 'bg-white text-slate-900 hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400'
                                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border-2 border-slate-600'
                                }`}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronLeft size={18} />
                                    <span>Show Less</span>
                                  </>
                                ) : (
                                  <>
                                    <Maximize2 size={18} />
                                    <span>View Full Code ({lines.length} lines)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })
              ) : (
                <p className="text-center py-8 text-slate-500">No content available</p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50 border-slate-200 flex items-center justify-between">
            <span className="text-sm">
              {downloading && (
                <span className="flex items-center gap-2 text-slate-600">
                  <RefreshCcw size={16} className="animate-spin" />
                  Downloading...
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Main Component ---------- */
export default function BIMDisplay() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [favorites, setFavorites] = useState(loadFavorites());
  const [viewingItems, setViewingItems] = useState([]);
  const [minimizedWindows, setMinimizedWindows] = useState([]);
  const [darkMode, setDarkMode] = useState(loadDarkMode());
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [lockingIds, setLockingIds] = useState(new Set());
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const navigate = useNavigate();
  const location = useLocation();

  const isLocal = isLocalServer();
  const owner = isLocal;

  useEffect(() => {
    saveDarkMode(darkMode);
  }, [darkMode]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchJSON("/api/bim");
      const itemsArray = Array.isArray(data) ? data : [];
      setItems(itemsArray);
      setErr("");
    } catch (e) {
      setErr(e?.message || "Failed to load BIM entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (id) => {
    if (!owner) return;
    const item = items.find(i => i.id === id);
    if (!item) return;
    setDeleteConfirmItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      setBusyId(String(deleteConfirmItem.id));
      
      const token = await new Promise((resolve) => {
        const handleAuth = (token) => {
          resolve(token);
        };
        setPasswordPrompt({ action: 'delete this entry', callback: handleAuth, entryId: deleteConfirmItem.id });
      });
      
      await fetchJSON(`/api/bim/${deleteConfirmItem.id}`, { 
        method: "DELETE", 
        headers: { 
          Authorization: `Bearer ${token}`
        } 
      });
      setItems((prev) => prev.filter((p) => String(p?.id) !== String(deleteConfirmItem.id)));
      setDeleteConfirmItem(null);
    } catch (e) {
      alert(e?.message || "Delete failed");
    } finally {
      setBusyId("");
    }
  };

  const handleDuplicate = (id) => {
    if (!owner) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const displayTitle =
      (extractMainTitle(item.blocks || [])?.title || item.title || "Untitled") + " (copy)";

    navigate("/bim/new", {
      state: {
        duplicateOf: String(id),
        preset: {
          title: displayTitle,
          blocks: item.blocks || [],
          locked: false,
        },
      },
    });
  };

  const handleEdit = (id) => {
    if (!owner) return;
    navigate(`/bim/edit/${encodeURIComponent(id)}`);
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleLockUnlock = (entryId, currentLockState) => {
    if (isLocal) {
      const action = currentLockState ? 'unlock this entry' : 'lock this entry';
      setPasswordPrompt({ 
        entryId, 
        currentLockState,
        action,
        callback: async (token) => {
          await toggleLockWithToken(entryId, !currentLockState, token);
        }
      });
    } else {
      const action = currentLockState ? 'unlock this entry to view content' : 'lock this entry';
      setPasswordPrompt({ 
        entryId, 
        currentLockState,
        action,
        callback: async (token) => {
          await toggleLockWithToken(entryId, !currentLockState, token);
        }
      });
    }
  };

  const toggleLockWithToken = async (id, newLockedState, token) => {
    if (lockingIds.has(id)) {
      return;
    }
    
    setLockingIds(prev => new Set([...prev, id]));
    
    try {
      await fetchJSON(`/api/bim/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ locked: newLockedState }),
      });
      
      await load();
    } catch (e) {
      alert(`Failed to ${newLockedState ? 'lock' : 'unlock'} entry`);
    } finally {
      setLockingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const goView = (id) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      if (item.locked && !owner) {
        alert("🔒 This entry is locked");
        return;
      }
      const windowId = `window-${Date.now()}-${Math.random()}`;
      setViewingItems(prev => [...prev, { ...item, windowId }]);
    }
  };

  const closeViewingItem = (windowId) => {
    setViewingItems(prev => prev.filter(item => item.windowId !== windowId));
    setMinimizedWindows(prev => prev.filter(w => w.id !== windowId));
  };

  const handleMinimize = (windowId, title) => {
    setMinimizedWindows(prev => {
      const exists = prev.find(w => w.id === windowId);
      if (exists) return prev;
      return [...prev, { id: windowId, title }];
    });
  };

  const handleRestore = (windowId) => {
    setMinimizedWindows(prev => prev.filter(w => w.id !== windowId));
    // Dispatch custom event to notify the modal to restore
    const event = new CustomEvent('restoreWindow', { detail: { windowId } });
    window.dispatchEvent(event);
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        const title = extractMainTitle(item.blocks || [])?.title || item.title || "";
        const content = item.blocks?.map(b => String(b.value || '').replace(/<[^>]*>/g, '')).join(' ') || "";
        return title.toLowerCase().includes(query) || content.toLowerCase().includes(query);
      });
    }

    if (filterFavorites) {
      result = result.filter(item => favorites.has(item.id));
    }

    if (sortBy === "title") {
      result.sort((a, b) => {
        const titleA = (extractMainTitle(a.blocks || [])?.title || a.title || "").toLowerCase();
        const titleB = (extractMainTitle(b.blocks || [])?.title || b.title || "").toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === "blocks") {
      result.sort((a, b) => (b.blocks?.length || 0) - (a.blocks?.length || 0));
    }

    return result;
  }, [items, searchQuery, filterFavorites, favorites, sortBy]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50"}`}>
      {viewingItems.map((item) => (
        <FullViewModal
          key={item.windowId}
          item={item}
          windowId={item.windowId}
          onClose={() => closeViewingItem(item.windowId)}
          onMinimize={handleMinimize}
          owner={owner}
        />
      ))}

      <MinimizedWindowBar
        windows={minimizedWindows}
        onRestore={handleRestore}
        onClose={closeViewingItem}
      />

      {deleteConfirmItem && (
        <DeleteConfirmationModal
          item={deleteConfirmItem}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmItem(null)}
          darkMode={darkMode}
        />
      )}

      {passwordPrompt && (
        <PasswordPromptModal
          onClose={() => setPasswordPrompt(null)}
          onSubmit={(token) => {
            passwordPrompt.callback(token);
            setPasswordPrompt(null);
          }}
          darkMode={darkMode}
          action={passwordPrompt.action}
        />
      )}

      <button
        type="button"
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all hover:scale-110 ${
          darkMode ? "bg-slate-700 text-yellow-400 hover:bg-slate-600" : "bg-white text-slate-700 hover:bg-slate-100"
        }`}
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {darkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-8 py-12">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BookOpen size={36} />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">BIM Learning Hub</h1>
            </div>
            <p className="text-center text-blue-100 text-lg italic font-light">
              "Documenting my journey through data-driven design and BIM innovation"
            </p>
          </div>
        </header>

        {!loading && items.length > 0 && (
          <div className={`rounded-xl p-4 shadow-sm transition-colors ${darkMode ? "bg-slate-800" : "bg-white"}`}>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={20} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-slate-400" : "text-slate-500"}`} />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    darkMode 
                      ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" 
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  filterFavorites 
                    ? "bg-amber-500 text-white" 
                    : darkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                <Star size={18} fill={filterFavorites ? "currentColor" : "none"} />
                Favorites
              </button>

              <div className="flex items-center gap-2">
                <SortAsc size={20} className={darkMode ? "text-slate-400" : "text-slate-600"} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                    darkMode ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  <option value="recent">Recent</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="blocks">Content Size</option>
                </select>
              </div>
            </div>

            {(searchQuery || filterFavorites) && (
              <div className={`mt-3 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                Showing {filteredAndSortedItems.length} of {items.length} entries
                {searchQuery && ` matching "${searchQuery}"`}
                {filterFavorites && ` in favorites`}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen size={24} className="text-blue-600" />
              </div>
            </div>
            <p className={`mt-4 font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Loading BIM data...</p>
          </div>
        )}

        {err && (
          <div className={`border-l-4 border-red-500 px-6 py-4 rounded-lg shadow-sm ${darkMode ? "bg-red-900/30 text-red-200" : "bg-red-50 text-red-700"}`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">!</div>
              <div>
                <strong className="font-semibold">Error loading entries</strong>
                <p className="mt-1 text-sm">{err}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !err && filteredAndSortedItems.length > 0 && (
          <div className="space-y-4">
            {filteredAndSortedItems.map((e) => {
              const mainTitleInfo = extractMainTitle(e.blocks || []);
              const displayTitle = mainTitleInfo ? mainTitleInfo.title : e.title;

              return (
                <article
                  key={e.id}
                  className={`group relative rounded-xl border-2 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
                    darkMode ? "bg-slate-800 border-slate-600 hover:border-blue-500" : "bg-white border-slate-200 hover:border-blue-300"
                  }`}
                  onDoubleClick={() => !e.locked && goView(e.id)}
                >
                  {e.locked && (
                    <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
                      <Lock size={14} />
                      <span className="text-xs font-bold">LOCKED</span>
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h2
                        className={`text-2xl font-bold transition-colors flex-1 pr-4 ${
                          darkMode ? "text-slate-100 group-hover:text-blue-400" : "text-slate-800 group-hover:text-blue-600"
                        }`}
                      >
                        {displayTitle}
                      </h2>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(e.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            favorites.has(e.id)
                              ? "bg-amber-100 text-amber-600"
                              : darkMode
                              ? "bg-slate-700 text-slate-400 hover:text-amber-500"
                              : "bg-slate-100 text-slate-400 hover:text-amber-500"
                          }`}
                          title="Favorite"
                        >
                          <Star size={16} fill={favorites.has(e.id) ? "currentColor" : "none"} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleLockUnlock(e.id, e.locked)}
                          disabled={lockingIds.has(e.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            lockingIds.has(e.id)
                              ? "bg-slate-300 text-slate-500 cursor-wait opacity-60"
                              : e.locked
                              ? darkMode
                                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50"
                                : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                              : darkMode
                              ? "bg-slate-700 text-slate-300 hover:text-amber-400 hover:bg-slate-600 border border-slate-600"
                              : "bg-slate-100 text-slate-400 hover:text-amber-500 hover:bg-slate-200"
                          }`}
                          title={
                            lockingIds.has(e.id) 
                              ? "Updating..." 
                              : e.locked 
                              ? isLocal ? "🔒 Click to unlock" : "🔒 Click to unlock and view content"
                              : "🔓 Click to lock"
                          }
                        >
                          {e.locked ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        
                        {isLocal && (
                          <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold shadow-sm">
                            {e.blocks?.length ?? 0} {e.blocks?.length === 1 ? "block" : "blocks"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <BlockPreview blocks={e.blocks || []} darkMode={darkMode} locked={e.locked} />
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          goView(e.id);
                        }}
                        disabled={e.locked}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          e.locked
                            ? "bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        title={e.locked ? "Unlock to view" : "View full details"}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Eye size={16} />
                          View More
                        </span>
                      </button>

                      {isLocal && (
                        <>
                          <button
                            type="button"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              handleEdit(e.id);
                            }}
                            disabled={e.locked}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              e.locked
                                ? "bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50"
                                : darkMode 
                                ? "bg-blue-900/50 text-blue-300 hover:bg-blue-900/70" 
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                            title={e.locked ? "Unlock to edit" : "Edit entry"}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Edit size={16} /> Edit
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              handleDuplicate(e.id);
                            }}
                            disabled={e.locked}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              e.locked
                                ? "bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50"
                                : darkMode 
                                ? "bg-purple-900/50 text-purple-300 hover:bg-purple-900/70" 
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            }`}
                            title={e.locked ? "Unlock to duplicate" : "Duplicate entry"}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Plus size={16} /> Duplicate
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              onDelete(e.id);
                            }}
                            disabled={busyId === String(e.id) || e.locked}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              e.locked || busyId === String(e.id)
                                ? "bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50"
                                : darkMode 
                                ? "bg-red-900/50 text-red-300 hover:bg-red-900/70" 
                                : "bg-red-100 text-red-600 hover:bg-red-200"
                            }`}
                            title={e.locked ? "Unlock to delete" : "Delete entry"}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Trash2 size={16} />
                              {busyId === String(e.id) ? "Deleting..." : "Delete"}
                            </span>
                          </button>
                        </>
                      )}
                    </div>

                    {isLocal && (
                      <div className={`pt-3 border-t flex items-center justify-between ${darkMode ? "border-slate-700" : "border-slate-100"}`}>
                        <span
                          className={`text-xs font-mono px-3 py-1.5 rounded ${
                            darkMode ? "bg-slate-900 text-slate-400" : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          ID: {String(e.id)}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !err && filteredAndSortedItems.length > 0 && isLocal && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => navigate("/bim/new")}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={24} /> Create New Entry
              </span>
            </button>
          </div>
        )}

        {!loading && !err && items.length > 0 && filteredAndSortedItems.length === 0 && (
          <div
            className={`text-center py-24 rounded-2xl border-2 border-dashed shadow-inner ${
              darkMode ? "bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600" : "bg-gradient-to-br from-white to-slate-50 border-slate-300"
            }`}
          >
            <Search size={56} className={`mx-auto mb-4 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
            <p className={`font-bold text-2xl mb-2 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>No entries match your filters</p>
            <p className={`${darkMode ? "text-slate-400" : "text-slate-500"}`}>Try adjusting your search or filters</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterFavorites(false);
              }}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div
            className={`text-center py-24 rounded-2xl border-2 border-dashed shadow-inner ${
              darkMode ? "bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600" : "bg-gradient-to-br from-white to-slate-50 border-slate-300"
            }`}
          >
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl"></div>
              <div className="relative p-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-xl">
                <BookOpen size={56} className="text-white" />
              </div>
            </div>
            <p className={`font-bold text-2xl mb-2 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>No BIM data available</p>
            <p className={`mb-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              {isLocal ? "Start building your knowledge base today!" : "The owner hasn't added any public entries yet."}
            </p>
            {isLocal && (
              <button
                type="button"
                onClick={() => navigate("/bim/new")}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={20} /> Create First Entry
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}