import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen, Trash2, Edit3, Plus, Eye, Copy, Star,
  ChevronLeft, ChevronRight, Maximize2, Check, Moon, Sun, Download, ZoomIn, ZoomOut, RefreshCcw
} from "lucide-react";
import { useOwnerMode } from "../lib/owner.js";

/* ---------- API base ---------- */
const RAW_API = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "").trim();
const API_BASE = RAW_API.replace(/\/+$/, "");
const api = (path) => (API_BASE ? `${API_BASE}${path}` : path);

/* ---------- auth header ---------- */
const ownerHeaders = () => {
  const t = localStorage.getItem("owner_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
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

/* ---------- Render HTML Content (for rich text blocks) ---------- */
function renderHTMLContent(htmlContent, className = "") {
  if (!htmlContent) return null;

  // If it's plain text (no HTML tags), render normally
  if (!htmlContent.includes("<")) {
    return <div className={className}>{htmlContent}</div>;
  }

  // Render HTML content with proper styling
  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

/* ---------- Full-Screen Image Viewer with Zoom/Pan ---------- */
function FullScreenImageViewer({ images = [], initialIndex = 0, onClose }) {
  const safeImages = Array.isArray(images) ? images.filter((im) => im && im.value) : [];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // zoom / pan state
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });

  // Reset zoom/pan whenever image index changes
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

    // Keep point under cursor stable: adjust offset
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
    // Cycle 1 → 1.5 → 3 → 1
    const next = scale < 1.25 ? 1.5 : scale < 2.5 ? 3 : 1;
    const deltaScale = next / scale;
    zoomAtPoint(deltaScale, e.clientX, e.clientY);
  };

  // Pointer drag for panning
  const onPointerDown = (e) => {
    if (scale === 1) return; // no pan if not zoomed
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
      {/* top-left counter */}
      {safeImages.length > 1 && (
        <div className="absolute top-6 left-6 px-4 py-2 bg-black/50 text-white rounded-lg font-semibold select-none">
          {currentIndex + 1} / {safeImages.length}
        </div>
      )}

      {/* top-right controls */}
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

      {/* image area */}
      <div
        ref={containerRef}
        className="relative max-w-[95vw] max-h-[95vh] overflow-hidden touch-none"
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
            maxWidth: "95vw",
            maxHeight: "95vh",
            objectFit: "contain",
            cursor: scale > 1 ? "grab" : "default",
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
          className="w-full h-full object-cover"
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

/* ---------- first H1 extraction (data-only) ---------- */
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
function BlockPreview({ blocks = [], darkMode = false, onFullScreen }) {
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
        if (block?.type === "h1") return null; // Skip h1 in preview

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

        if (block?.type === "image-group") {
          return (
            <div key={`pv-ig-${idx}`}>
              <ImageCarousel
                images={block.images}
                isPreview
                onFullScreen={onFullScreen ? (index) => onFullScreen(block.images, index) : null}
              />
            </div>
          );
        }

        if (block?.type === "image") {
          return (
            <div
              key={`pv-im-${idx}`}
              className={`relative w-full h-32 rounded-lg overflow-hidden border group cursor-pointer ${darkMode ? "border-slate-600" : "border-slate-200"}`}
              onDoubleClick={() => onFullScreen && onFullScreen([block], 0)}
            >
              <img src={block.value} alt="" className="w-full h-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => onFullScreen && onFullScreen([block], 0)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="View full screen"
              >
                <Maximize2 size={16} />
              </button>
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

/* ---------- Full View Modal (with dark-mode contrast fix) ---------- */
function FullViewModal({ item, onClose, owner, onEdit }) {
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState(new Set());
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [fullScreenImages, setFullScreenImages] = useState(null);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);

  // NEW: container ref for the scrollable content (used by contrast fixer)
  const contentRef = useRef(null);

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

  /* --------- Dark mode contrast fixer (only adjusts too-dark colors) --------- */
  const parseRGB = (s) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3] };
  };

  const luminance = ({ r, g, b }) => {
    const srgb = [r, g, b].map(v => v / 255).map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };

  const fixDarkModeContrast = (enable) => {
    const root = contentRef.current;
    if (!root) return;

    // Restore previously adjusted elements when turning OFF dark mode
    const adjusted = root.querySelectorAll("[data-rtx-original-color]");
    if (!enable) {
      adjusted.forEach(el => {
        const orig = el.getAttribute("data-rtx-original-color");
        if (orig === "__unset__") el.style.removeProperty("color");
        else el.style.color = orig;
        el.removeAttribute("data-rtx-original-color");
      });
      return;
    }

    // When turning ON dark mode: scan and adjust dark colors
    const candidates = root.querySelectorAll(".rich-text-content, .rich-text-content *");
    candidates.forEach(el => {
      // skip code blocks; they already have high-contrast styling
      if (el.closest("pre, code")) return;

      const cs = getComputedStyle(el);
      const rgb = parseRGB(cs.color);
      if (!rgb) return;

      const lum = luminance(rgb);
      // threshold: treat very dark text as unreadable in dark mode
      if (lum < 0.28) {
        // store original only once
        if (!el.hasAttribute("data-rtx-original-color")) {
          const inlineColor = el.style.color?.trim();
          el.setAttribute("data-rtx-original-color", inlineColor ? inlineColor : "__unset__");
        }
        // readable light gray that respects dark theme
        el.style.color = "var(--rtx-darkmode-fg, #e5e7eb)"; // Tailwind slate-200
      }
    });
  };

  useEffect(() => {
    fixDarkModeContrast(darkMode);
    // Re-run also when item changes (new content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode, item]);

  return (
    <>
      {fullScreenImages && (
        <FullScreenImageViewer images={fullScreenImages} initialIndex={fullScreenIndex} onClose={closeFullScreen} />
      )}

      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${darkMode ? "dark" : ""}`}
        onClick={onClose}
        style={{ "--rtx-darkmode-fg": "#e5e7eb" }} // optional override for adjusted text color
      >
        <div
          className={`rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${darkMode ? "bg-slate-900" : "bg-white"}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold">{displayTitle}</h1>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <style>{`
            /* Respect inline colors & text styles; do not override colors */
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
            /* NOTE: do not add a rule that forces <font> color to inherit */
          `}</style>

          <div
            ref={contentRef}
            className={`overflow-y-auto max-h-[calc(90vh-80px)] p-8 pb-24 ${darkMode ? "bg-slate-900" : "bg-white"}`}
          >
            <div className="max-w-none space-y-6">
              {groupedBlocks.length ? (
                groupedBlocks.map((block, idx) => {
                  if (block?.type === "h1") return null; // header already shows title

                  if (block?.type === "h2") {
                    return (
                      <h2
                        key={`h2-${idx}`}
                        className={`text-3xl font-extrabold mb-3 mt-4 pb-2 border-b-2 border-blue-400 ${
                          darkMode ? "text-slate-100" : "text-slate-900"
                        }`}
                      >
                        {renderHTMLContent(block.value)}
                      </h2>
                    );
                  }

                  if (block?.type === "text") {
                    return (
                      <div
                        key={`p-${idx}`}
                        className={`leading-relaxed text-lg ${darkMode ? "text-slate-200" : "text-slate-800"}`}
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
                        <img
                          src={block.value}
                          alt=""
                          className="w-full h-auto rounded-lg border border-slate-200 shadow-sm"
                          loading="lazy"
                        />
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
                                  <Copy size={14} /> Copy
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
                <p className={`text-center py-8 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>No content available</p>
              )}
            </div>
          </div>

          <div
            className={`sticky bottom-0 px-6 py-4 border-t flex items-center justify-between ${
              darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
            }`}
          >
            <span className="text-sm">
              {owner && (
                <>
                  <span
                    className={`font-mono px-2 py-1 rounded border ${
                      darkMode ? "bg-slate-900 text-slate-300 border-slate-600" : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    ID: {item.id}
                  </span>
                  <span className={`ml-3 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                    {item.blocks?.length || 0} block{item.blocks?.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </span>

            <div className="flex items-center gap-3">
              {owner && (
                <button
                  type="button"
                  onClick={() => onEdit?.(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    darkMode ? "bg-blue-900/50 text-blue-300 hover:bg-blue-900/70" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                  title="Edit (E)"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Edit3 size={16} /> Edit
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? "bg-slate-700 text-yellow-400 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
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
  const { owner } = useOwnerMode();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [favorites, setFavorites] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [fullScreenImages, setFullScreenImages] = useState(null);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const nav = useNavigate();
  const location = useLocation();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchJSON("/api/bim");
      setItems(Array.isArray(data) ? data : []);
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
    if (!owner || !window.confirm("Delete this entry? This action cannot be undone.")) return;
    try {
      setBusyId(String(id));
      await fetchJSON(`/api/bim/${id}`, { method: "DELETE", headers: { ...ownerHeaders() } });
      setItems((prev) => prev.filter((p) => String(p?.id) !== String(id)));
    } catch (e) {
      alert(e?.message || "Delete failed");
    } finally {
      setBusyId("");
    }
  };

  const handleCopyContent = (item) => {
    if (!item?.blocks?.length) return;
    const text = item.blocks
      .map((b) => {
        if (b.type === "text" || b.type === "h1" || b.type === "h2") {
          return (b.value || "").replace(/<[^>]*>/g, "");
        }
        return b.value || "";
      })
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
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

  const openFullScreen = (images, index) => {
    setFullScreenImages(images);
    setFullScreenIndex(index);
  };

  const closeFullScreen = () => {
    setFullScreenImages(null);
    setFullScreenIndex(0);
  };

  const goAdd = () => { if (owner) nav("/bim/new"); };
  const goEdit = (id) => { if (owner) nav(`/bim/edit/${encodeURIComponent(id)}`); };
  const goView = (id) => {
    const item = items.find((i) => i.id === id);
    if (item) setViewingItem(item);
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50"}`}>
      {fullScreenImages && (
        <FullScreenImageViewer images={fullScreenImages} initialIndex={fullScreenIndex} onClose={closeFullScreen} />
      )}

      {viewingItem && (
        <FullViewModal
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          owner={owner}
          onEdit={(id) => { setViewingItem(null); goEdit(id); }}
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
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl"></div>

          <div className="relative px-8 py-12">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BookOpen size={36} />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">BIM (Building Information Modeling)</h1>
            </div>
            <p className="text-center text-blue-100 text-lg italic font-light">
              "Transforming Civil &amp; Architectural Industry through intelligent digital representation"
            </p>
          </div>
        </header>

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

        {!loading && !err && items.length > 0 && (
          <div className="space-y-4">
            {items.map((e) => {
              const mainTitleInfo = extractMainTitle(e.blocks || []);
              const displayTitle = mainTitleInfo ? mainTitleInfo.title : e.title;

              return (
                <article
                  key={e.id}
                  className={`group relative rounded-xl border-2 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
                    darkMode ? "bg-slate-800 border-slate-600 hover:border-blue-500" : "bg-white border-slate-200 hover:border-blue-300"
                  }`}
                  onDoubleClick={() => goView(e.id)}
                >
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
                          <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold shadow-sm">
                            {e.blocks?.length ?? 0} {e.blocks?.length === 1 ? "block" : "blocks"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <BlockPreview blocks={e.blocks || []} darkMode={darkMode} onFullScreen={openFullScreen} />
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          goView(e.id);
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold transition-colors"
                        title="View full details"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Eye size={16} /> View More
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          handleCopyContent(e);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          copiedId === e.id
                            ? "bg-green-100 text-green-700"
                            : darkMode
                            ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                        title="Copy content"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Copy size={16} /> {copiedId === e.id ? "Copied!" : "Copy"}
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
                              <Copy size={16} /> Duplicate
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

        {!loading && !err && items.length > 0 && owner && (
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
