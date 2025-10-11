import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen, Trash2, Edit3, Plus, Eye, Star,
  ChevronLeft, ChevronRight, Maximize2, Check, Moon, Sun, Download, ZoomIn, ZoomOut, RefreshCcw,
  Search, SortAsc, X, AlertTriangle, Type, Bookmark, Lock, Unlock, LogIn, LogOut, Shield
} from "lucide-react";
import { useOwnerMode, loginAsOwner, logoutOwner } from "../lib/owner.js";

/* ---------- API base ---------- */
const RAW_API = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "").trim();
const API_BASE = RAW_API.replace(/\/+$/, "");
const api = (path) => (API_BASE ? `${API_BASE}${path}` : path);

/* ---------- auth header ---------- */
const ownerHeaders = () => {
  const possibleKeys = ["owner_token", "token", "auth_token", "access_token"];
  
  for (const key of possibleKeys) {
    const t = localStorage.getItem(key);
    if (t) {
      console.log(`[Auth] Found token under key: ${key}`);
      return { Authorization: `Bearer ${t}` };
    }
  }
  
  console.warn("[Auth] No token found in localStorage");
  return {};
};

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

/* ---------- Owner Login Modal ---------- */
function OwnerLoginModal({ onClose, onSuccess, darkMode }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const result = await loginAsOwner(password, API_BASE);
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Authentication failed");
      }
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div
        className={`rounded-2xl shadow-2xl max-w-md w-full ${
          darkMode ? "bg-slate-800 border-2 border-blue-500" : "bg-white border-2 border-blue-500"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 flex items-center gap-3 rounded-t-xl">
          <Shield size={32} className="flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold">Owner Authentication</h2>
            <p className="text-sm text-blue-100">Enter password to manage entries</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`p-6 space-y-4 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
          <div>
            <label className="block text-sm font-semibold mb-2">
              Owner Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter owner password"
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

          <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              🔒 Once logged in, you'll be able to lock/unlock entries and manage all content.
              Other users will only see unlocked entries.
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
                  ? "bg-blue-300 text-blue-100 cursor-not-allowed opacity-50"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <RefreshCcw size={18} className="animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Login
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
function renderHTMLContent(htmlContent, className = "") {
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

  const downloadCurrent = () => {
    const src = safeImages[currentIndex].value;
    const a = document.createElement("a");
    a.href = src;
    a.download = src.split("/").pop() || "image";
    document.body.appendChild(a);
    a.click();
    a.remove();
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
function ImageCarousel({ images = [], isPreview = false, onFullScreen }) {
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

  return (
    <div className="relative group">
      <div
        className={`relative ${isPreview ? "h-48" : "h-96"} rounded-lg overflow-hidden border-2 border-slate-200 cursor-pointer`}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={safeImages[currentIndex].value}
          alt=""
          className="w-full h-full object-contain bg-slate-50"
          loading="lazy"
        />

        <button
          type="button"
          onClick={handleFullScreenClick}
          className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="View full screen (or double-click)"
        >
          <Maximize2 size={20} />
        </button>

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
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

/* ---------- Preview ---------- */
function BlockPreview({ blocks = [], darkMode = false }) {
  if (!blocks.length) {
    return (
      <div
        className={`flex items-center justify-center h-24 rounded-lg border ${
          darkMode ? "bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600" : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200"
        }`}
      >
        <p className="text-sm text-slate-400">No content</p>
      </div>
    );
  }

  const groupedBlocks = groupConsecutiveImages(blocks);

  return (
    <div
      className={`p-4 rounded-lg border space-y-4 max-h-48 overflow-hidden relative ${
        darkMode ? "bg-gradient-to-br from-slate-800 to-white/0 border-slate-600" : "bg-gradient-to-br from-slate-50 to-white border-slate-200"
      }`}
    >
      {groupedBlocks.slice(0, 5).map((block, idx) => {
        if (block?.type === "h1") return null;

        if (block?.type === "h2") {
          const textContent = String(block.value || "").replace(/<[^>]*>/g, "").slice(0, 100);
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
          const textContent = String(block.value || "").replace(/<[^>]*>/g, "").slice(0, 180);
          return (
            <div key={`pv-text-${idx}`} className={`leading-relaxed text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              {textContent}
              {textContent.length >= 180 ? "…" : ""}
            </div>
          );
        }

        if (block?.type === "image-group" || block?.type === "image") {
          return (
            <div key={`pv-img-${idx}`} className={`relative w-full h-20 rounded-lg overflow-hidden border ${darkMode ? "border-slate-600 bg-slate-700" : "border-slate-200 bg-slate-50"}`}>
              <div className="w-full h-full flex items-center justify-center">
                <Eye size={32} className={`${darkMode ? "text-slate-500" : "text-slate-300"}`} />
                <span className={`ml-2 text-sm font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {block?.type === "image-group" ? `${block.images.length} Images` : "Image"}
                </span>
              </div>
            </div>
          );
        }

        if (block?.type === "code") {
          const snippet = String(block.value || "");
          return (
            <pre key={`pv-code-${idx}`} className="bg-slate-900 text-emerald-300 text-xs rounded p-2 overflow-hidden">
              <code>
                {snippet.slice(0, 150)}
                {snippet.length > 150 ? "…" : ""}
              </code>
            </pre>
          );
        }

        return null;
      })}

      {groupedBlocks.length > 5 && <div className="text-xs italic text-slate-400">+ more content…</div>}
      <div
        className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t pointer-events-none ${darkMode ? "from-slate-700" : "from-white"}`}
      ></div>
    </div>
  );
}

/* ---------- Full View Modal with Reading Features ---------- */
function FullViewModal({ item, onClose, owner, onEdit, onToggleLock, lockingIds = new Set() }) {
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState(new Set());
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [darkMode, setDarkMode] = useState(loadDarkMode());
  const [fullScreenImages, setFullScreenImages] = useState(null);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  
  // Reading Features
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.7);
  const [fontFamily, setFontFamily] = useState("default");
  const [readingMode, setReadingMode] = useState(false);
  const [sepiaMode, setSepiaMode] = useState(false);
  const [showReadingPanel, setShowReadingPanel] = useState(false);
  const [bookmarkedSections, setBookmarkedSections] = useState(new Set());

  const contentRef = useRef(null);

  useEffect(() => {
    saveDarkMode(darkMode);
  }, [darkMode]);

  useEffect(() => {
    const onKey = (e) => {
      if (!owner) return;
      if (e.key.toLowerCase() === "e") {
        onEdit?.(item.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [owner, item?.id, onEdit]);

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

  return (
    <>
      {fullScreenImages && (
        <FullScreenImageViewer images={fullScreenImages} initialIndex={fullScreenIndex} onClose={closeFullScreen} />
      )}

      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4`}
        onClick={onClose}
      >
        <div
          className={`rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden ${
            sepiaMode 
              ? "bg-[#f4e8d4]"
              : darkMode 
              ? "bg-slate-900" 
              : "bg-white"
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className={`flex-shrink-0 ${
            sepiaMode
              ? "bg-gradient-to-r from-amber-700 to-amber-800"
              : "bg-gradient-to-r from-blue-600 to-cyan-600"
          } text-white px-6 py-4 flex items-center justify-between z-10`}>
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
              {owner && item.locked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!lockingIds.has(item.id) && window.confirm('Unlock this entry? It will be viewable by everyone.')) {
                      onToggleLock?.(item.id);
                    }
                  }}
                  disabled={lockingIds.has(item.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    lockingIds.has(item.id)
                      ? "bg-slate-500 cursor-wait opacity-60"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                  title={lockingIds.has(item.id) ? "Updating..." : "Unlock this entry"}
                >
                  <Unlock size={20} />
                </button>
              )}
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

          {/* Reading Settings Panel */}
          {showReadingPanel && (
            <div className={`flex-shrink-0 px-6 py-4 border-b ${
              sepiaMode
                ? "bg-[#e8dcc8] border-amber-700"
                : darkMode 
                ? "bg-slate-800 border-slate-700" 
                : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold ${
                  sepiaMode
                    ? "text-[#3d2817]"
                    : darkMode 
                    ? "text-slate-200" 
                    : "text-slate-700"
                }`}>
                  📖 Reading Settings
                </h3>
                {owner && item.locked && (
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${
                    sepiaMode
                      ? "bg-amber-200 text-amber-900"
                      : darkMode
                      ? "bg-amber-900/30 text-amber-400"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    <Lock size={12} />
                    <span>Entry is locked</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${
                    sepiaMode
                      ? "text-[#5c4033]"
                      : darkMode 
                      ? "text-slate-300" 
                      : "text-slate-600"
                  }`}>
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
                  <label className={`text-xs font-semibold block mb-1 ${
                    sepiaMode
                      ? "text-[#5c4033]"
                      : darkMode 
                      ? "text-slate-300" 
                      : "text-slate-600"
                  }`}>
                    Line Height: {lineHeight.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="1.3"
                    max="2.5"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${
                    sepiaMode
                      ? "text-[#5c4033]"
                      : darkMode 
                      ? "text-slate-300" 
                      : "text-slate-600"
                  }`}>
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className={`w-full px-2 py-1 rounded text-sm ${
                      sepiaMode
                        ? "bg-[#f4e8d4] text-[#5c4033] border border-amber-700"
                        : darkMode 
                        ? "bg-slate-700 text-slate-200" 
                        : "bg-white text-slate-800"
                    }`}
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
                      ? sepiaMode
                        ? "bg-amber-700 text-white"
                        : "bg-blue-600 text-white"
                      : sepiaMode
                      ? "bg-amber-200 text-amber-900"
                      : darkMode 
                      ? "bg-slate-700 text-slate-200" 
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {readingMode ? "Exit" : "Enable"} Focus Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSepiaMode(!sepiaMode);
                    if (!sepiaMode && darkMode) {
                      setDarkMode(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors flex items-center gap-1 ${
                    sepiaMode 
                      ? "bg-amber-700 text-white" 
                      : darkMode 
                      ? "bg-slate-700 text-slate-200" 
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  <span className={sepiaMode ? "text-lg" : ""}>☀️</span>
                  {sepiaMode ? "Exit" : "Enable"} Sepia Mode
                </button>
              </div>
            </div>
          )}

          <style>{`
            /* Sepia mode text colors */
            .sepia-mode-content {
              color: #5c4033 !important;
            }
            .sepia-mode-content h1,
            .sepia-mode-content h2 {
              color: #3d2817 !important;
            }
            
            /* Dark mode text colors - using important to override inline styles */
            .dark-mode-content {
              color: #f1f5f9 !important;
            }
            .dark-mode-content h1,
            .dark-mode-content h2 {
              color: #f1f5f9 !important;
            }
            .dark-mode-content .rich-text-content {
              color: #f1f5f9 !important;
            }
            .dark-mode-content .rich-text-content * {
              color: inherit !important;
            }
            
            /* Light mode text colors */
            .light-mode-content {
              color: #1e293b !important;
            }
            .light-mode-content h1,
            .light-mode-content h2 {
              color: #0f172a !important;
            }
            .light-mode-content .rich-text-content {
              color: #1e293b !important;
            }
            
            /* List and paragraph formatting */
            .rich-text-content ul,
            .rich-text-content ol {
              margin-left: 1.5rem;
              margin-top: 0.5rem;
              margin-bottom: 0.5rem;
            }
            .rich-text-content ul { list-style-type: disc; }
            .rich-text-content ol { list-style-type: decimal; }
            .rich-text-content li { margin-bottom: 0.25rem; }
            .rich-text-content p { margin-bottom: 0.5rem; }
            .rich-text-content strong { font-weight: 600; }
            .rich-text-content em { font-style: italic; }
            .rich-text-content u { text-decoration: underline; }
            
            /* Dynamic line height application */
            .reading-content-container * {
              line-height: inherit !important;
            }
            .reading-content-container p,
            .reading-content-container div,
            .reading-content-container span,
            .reading-content-container li {
              line-height: inherit !important;
            }
            
            /* Smooth scrolling */
            .reading-content-container {
              scroll-behavior: smooth;
            }
            
            /* Ensure scrollbar is always visible to prevent layout shift */
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
            className={`flex-1 overflow-y-auto overflow-x-hidden p-8 pb-24 reading-content-container ${
              sepiaMode 
                ? "bg-[#f4e8d4] sepia-mode-content" 
                : darkMode 
                ? "bg-slate-900 dark-mode-content" 
                : "bg-white light-mode-content"
            } ${readingMode ? "max-w-3xl mx-auto" : ""} ${getFontFamilyClass()}`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch'
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
                        <h2
                          className={`text-3xl font-extrabold mb-3 mt-4 pb-2 border-b-2 ${
                            sepiaMode 
                              ? "border-amber-700" 
                              : "border-blue-400"
                          }`}
                        >
                          {renderHTMLContent(block.value)}
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
                      <div
                        key={`p-${idx}`}
                        className="leading-relaxed"
                      >
                        {renderHTMLContent(block.value)}
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
                        <div className={`rounded-lg border overflow-hidden ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
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
                    const displayCode = isExpanded ? (block.value || "") : lines.slice(0, 10).join("\n");
                    const hasMore = lines.length > 10;

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

                          <pre className="bg-slate-900 text-emerald-300 rounded-lg p-6 overflow-x-auto border border-slate-700 max-h-[600px] overflow-y-auto">
                            <code>{displayCode}</code>
                          </pre>

                          {hasMore && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCodeExpansion(idx);
                                }}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-semibold flex items-center gap-2"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronLeft size={16} />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <Maximize2 size={16} />
                                    View Full Code ({lines.length} lines)
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
                <p className={`text-center py-8 ${
                  sepiaMode
                    ? "text-[#8b7355]"
                    : darkMode 
                    ? "text-slate-400" 
                    : "text-slate-500"
                }`}>No content available</p>
              )}
            </div>
          </div>

          <div
            className={`flex-shrink-0 px-6 py-4 border-t flex items-center justify-between ${
              sepiaMode
                ? "bg-[#e8dcc8] border-amber-700"
                : darkMode 
                ? "bg-slate-800 border-slate-700" 
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <span className="text-sm">
              {owner && (
                <>
                  <span
                    className={`font-mono px-2 py-1 rounded border ${
                      sepiaMode
                        ? "bg-[#f4e8d4] text-[#5c4033] border-amber-700"
                        : darkMode 
                        ? "bg-slate-900 text-slate-300 border-slate-600" 
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    ID: {item.id}
                  </span>
                  <span className={`ml-3 ${
                    sepiaMode
                      ? "text-[#5c4033]"
                      : darkMode 
                      ? "text-slate-400" 
                      : "text-slate-600"
                  }`}>
                    {item.blocks?.length || 0} block{item.blocks?.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </span>

            <div className="flex items-center gap-3">
              {owner && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (lockingIds.has(item.id)) return;
                      
                      if (item.locked) {
                        if (window.confirm('Unlock this entry? It will be viewable by everyone.')) {
                          onToggleLock?.(item.id);
                        }
                      } else {
                        if (window.confirm('Lock this entry? Only you will be able to view it.')) {
                          onToggleLock?.(item.id);
                        }
                      }
                    }}
                    disabled={lockingIds.has(item.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                      lockingIds.has(item.id)
                        ? "bg-slate-400 text-slate-200 cursor-wait opacity-60"
                        : sepiaMode
                        ? item.locked 
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-amber-200 text-amber-900 hover:bg-amber-300"
                        : darkMode 
                        ? item.locked
                          ? "bg-amber-600 text-white hover:bg-amber-700"
                          : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                        : item.locked
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                    title={lockingIds.has(item.id) ? "Updating..." : (item.locked ? "Unlock entry" : "Lock entry")}
                  >
                    {lockingIds.has(item.id) ? (
                      <>
                        <RefreshCcw size={16} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        {item.locked ? <Unlock size={16} /> : <Lock size={16} />}
                        {item.locked ? "Unlock" : "Lock"}
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => onEdit?.(item.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      sepiaMode
                        ? "bg-amber-200 text-amber-900 hover:bg-amber-300"
                        : darkMode 
                        ? "bg-blue-900/50 text-blue-300 hover:bg-blue-900/70" 
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    title="Edit (E)"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Edit3 size={16} /> Edit
                    </span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setDarkMode(!darkMode);
                  if (!darkMode) setSepiaMode(false);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  sepiaMode
                    ? "bg-amber-200 text-amber-900 hover:bg-amber-300"
                    : darkMode 
                    ? "bg-slate-700 text-yellow-400 hover:bg-slate-600" 
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  sepiaMode
                    ? "bg-amber-700 text-white hover:bg-amber-800"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Main Page ---------- */
export default function BIMDisplay() {
  const { owner, setOwner } = useOwnerMode();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [favorites, setFavorites] = useState(new Set());
  const [viewingItem, setViewingItem] = useState(null);
  const [darkMode, setDarkMode] = useState(loadDarkMode());
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [lockingIds, setLockingIds] = useState(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Smart Features
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  
  const nav = useNavigate();
  const location = useLocation();

  // Save dark mode preference
  useEffect(() => {
    saveDarkMode(darkMode);
  }, [darkMode]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchJSON("/api/bim");
      const itemsArray = Array.isArray(data) ? data : [];
      
      // Debug: Check if locked field is present
      if (itemsArray.length > 0) {
        console.log("📦 Loaded entries sample:", itemsArray[0]);
        console.log("🔒 Locked fields present:", itemsArray.map(i => ({ id: i.id, locked: i.locked })));
      }
      
      setItems(itemsArray);
      setErr("");
    } catch (e) {
      setErr(e?.message || "Failed to load BIM entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => { alive = false; };
  }, [load]);

  useEffect(() => {
    if (location.state?.refreshBim) {
      load();
      nav(location.pathname, { replace: true, state: {} });
    }
    const onCustom = () => load();
    const onStorage = (e) => {
      if (e.key === "bim:dirty" && e.newValue === "1") {
        try { localStorage.removeItem("bim:dirty"); } catch {}
        load();
      }
    };
    window.addEventListener("bim:updated", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("bim:updated", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [load, location.pathname, location.state, nav]);

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
      await fetchJSON(`/api/bim/${deleteConfirmItem.id}`, { method: "DELETE", headers: { ...ownerHeaders() } });
      setItems((prev) => prev.filter((p) => String(p?.id) !== String(deleteConfirmItem.id)));
      setDeleteConfirmItem(null);
    } catch (e) {
      alert(e?.message || "Delete failed");
    } finally {
      setBusyId("");
    }
  };

  const handleDuplicate = async (id) => {
    if (!owner) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    nav("/bim/new", { state: { duplicate: item } });
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleLock = async (id) => {
    if (!owner) {
      alert("⚠️ You must be logged in as owner to lock/unlock entries.\n\nPlease click the 'Owner Login' button in the top-right corner.");
      return;
    }
    
    // Check if we have a valid token
    const headers = ownerHeaders();
    if (!headers.Authorization) {
      alert("⚠️ No owner token found.\n\nYour owner session may have expired.\n\nPlease log in again using the 'Owner Login' button.");
      setOwner(false);
      return;
    }
    
    // Prevent double-clicks
    if (lockingIds.has(id)) {
      console.log("Lock operation already in progress for entry", id);
      return;
    }
    
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const newLockedState = !item.locked;
    
    // Set loading state
    setLockingIds(prev => new Set([...prev, id]));
    
    try {
      console.log(`Attempting to ${newLockedState ? 'lock' : 'unlock'} entry ${id}...`);
      
      // Update backend with no-cache to ensure fresh data
      const response = await fetchJSON(`/api/bim/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...headers
        },
        body: JSON.stringify({ locked: newLockedState }),
        cache: "no-store"
      });
      
      console.log(`✅ Backend response:`, response);
      
      // Reload entire list to ensure consistency
      await load();
      
      console.log(`${newLockedState ? '🔒 Locked' : '🔓 Unlocked'} entry ${id} in database`);
    } catch (e) {
      const errorMsg = e?.message || 'Unknown error';
      
      if (errorMsg.includes("Owner authentication required") || errorMsg.includes("403")) {
        alert("🔐 Owner Authentication Required\n\n" +
              "Your owner session has expired or is invalid.\n\n" +
              "Please:\n" +
              "1. Click 'Owner Login' button\n" +
              "2. Enter your owner password\n" +
              "3. Try locking/unlocking again");
        setOwner(false);
      } else {
        alert(`Failed to ${newLockedState ? 'lock' : 'unlock'} entry:\n\n${errorMsg}\n\n` +
              "Please check:\n" +
              "1. Backend is running\n" +
              "2. Database has 'locked' column\n" +
              "3. You are logged in as owner");
      }
      
      console.error("Lock toggle failed:", e);
      console.error("Error details:", errorMsg);
    } finally {
      // Clear loading state
      setLockingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const goAdd = () => { 
    if (!owner) {
      alert("⚠️ You must be logged in as owner to create entries.\n\nPlease click the 'Owner Login' button.");
      return;
    }
    nav("/bim/new"); 
  };
  
  const goEdit = (id) => { 
    if (!owner) {
      alert("⚠️ You must be logged in as owner to edit entries.\n\nPlease click the 'Owner Login' button.");
      return;
    }
    nav(`/bim/edit/${encodeURIComponent(id)}`); 
  };
  
  const goView = (id) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      // Check if locked and user is not owner
      if (item.locked && !owner) {
        alert("🔒 This entry is locked and can only be viewed by the owner.");
        return;
      }
      console.log("📖 Opening entry:", id, "Locked:", item.locked);
      setViewingItem(item);
    }
  };

  const handleLoginSuccess = () => {
    setOwner(true);
    load(); // Reload to show all entries including locked ones
  };

  const handleLogout = () => {
    logoutOwner();
    setOwner(false);
    load(); // Reload to hide locked entries
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        const title = extractMainTitle(item.blocks || [])?.title || item.title || "";
        const content = item.blocks?.map(b => String(b.value || '').replace(/<[^>]*>/g, '')).join(' ') || "";
        return title.toLowerCase().includes(query) || content.toLowerCase().includes(query);
      });
    }

    // Favorites filter
    if (filterFavorites) {
      result = result.filter(item => favorites.has(item.id));
    }

    // Sort
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
      {viewingItem && (
        <FullViewModal
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          owner={owner}
          onEdit={(id) => { setViewingItem(null); goEdit(id); }}
          onToggleLock={async (id) => {
            await toggleLock(id);
          }}
          lockingIds={lockingIds}
        />
      )}

      {deleteConfirmItem && (
        <DeleteConfirmationModal
          item={deleteConfirmItem}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmItem(null)}
          darkMode={darkMode}
        />
      )}

      {showLoginModal && (
        <OwnerLoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleLoginSuccess}
          darkMode={darkMode}
        />
      )}

      {/* Owner Login/Logout Button - Fixed Top Right */}
      <div className="fixed top-6 right-6 z-40 flex gap-2">
        {owner ? (
          <button
            type="button"
            onClick={handleLogout}
            className={`px-4 py-2 rounded-lg shadow-2xl font-semibold transition-all hover:scale-105 flex items-center gap-2 ${
              darkMode ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-500 text-white hover:bg-red-600"
            }`}
            title="Logout from owner mode"
          >
            <LogOut size={18} />
            <span>Owner Logout</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className={`px-4 py-2 rounded-lg shadow-2xl font-semibold transition-all hover:scale-105 flex items-center gap-2 ${
              darkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
            title="Login as owner to manage entries"
          >
            <Shield size={18} />
            <span>Owner Login</span>
          </button>
        )}
      </div>

      {/* Dark Mode Toggle - Fixed Bottom Right */}
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
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl"></div>

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
            {owner && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg w-fit mx-auto">
                <Shield size={16} />
                <span className="font-semibold">Logged in as Owner</span>
              </div>
            )}
          </div>
        </header>

        {/* Search and Filter Bar */}
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
                title="Filter favorites"
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
              const isLocked = e.locked && !owner;

              return (
                <article
                  key={e.id}
                  className={`group relative rounded-xl border-2 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
                    darkMode ? "bg-slate-800 border-slate-600 hover:border-blue-500" : "bg-white border-slate-200 hover:border-blue-300"
                  }`}
                  onDoubleClick={() => !isLocked && goView(e.id)}
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
                          aria-pressed={favorites.has(e.id)}
                        >
                          <Star size={16} fill={favorites.has(e.id) ? "currentColor" : "none"} />
                        </button>
                        {owner && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleLock(e.id)}
                              disabled={lockingIds.has(e.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                lockingIds.has(e.id)
                                  ? "bg-slate-300 text-slate-500 cursor-wait opacity-60"
                                  : e.locked
                                  ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                                  : darkMode
                                  ? "bg-slate-700 text-slate-400 hover:text-amber-500 hover:bg-slate-600"
                                  : "bg-slate-100 text-slate-400 hover:text-amber-500 hover:bg-slate-200"
                              }`}
                              title={
                                lockingIds.has(e.id) 
                                  ? "Updating..." 
                                  : e.locked 
                                  ? "Click to unlock (owner only)" 
                                  : "Click to lock (owner only)"
                              }
                            >
                              {e.locked ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                            <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold shadow-sm">
                              {e.blocks?.length ?? 0} {e.blocks?.length === 1 ? "block" : "blocks"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <BlockPreview blocks={e.blocks || []} darkMode={darkMode} />
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          goView(e.id);
                        }}
                        disabled={isLocked}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          isLocked
                            ? "bg-slate-400 text-slate-200 cursor-not-allowed opacity-50"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        title={isLocked ? "This entry is locked" : "View full details"}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {isLocked ? <Lock size={16} /> : <Eye size={16} />}
                          {isLocked ? "Locked" : "View More"}
                        </span>
                      </button>

                      {owner && (
                        <>
                          <button
                            type="button"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              goEdit(e.id);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              darkMode ? "bg-blue-900/50 text-blue-300 hover:bg-blue-900/70" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                            title="Edit entry"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Edit3 size={16} /> Edit
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              handleDuplicate(e.id);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              darkMode ? "bg-purple-900/50 text-purple-300 hover:bg-purple-900/70" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            }`}
                            title="Duplicate entry"
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
                            disabled={busyId === String(e.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                              darkMode ? "bg-red-900/50 text-red-300 hover:bg-red-900/70" : "bg-red-100 text-red-600 hover:bg-red-200"
                            }`}
                            title="Delete entry"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Trash2 size={16} />
                              {busyId === String(e.id) ? "Deleting..." : "Delete"}
                            </span>
                          </button>
                        </>
                      )}
                    </div>

                    {owner && (
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

        {!loading && !err && filteredAndSortedItems.length > 0 && owner && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={goAdd}
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
              {owner ? "Start building your knowledge base today!" : "The owner hasn't added any public entries yet."}
            </p>
            {owner && (
              <button
                type="button"
                onClick={goAdd}
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