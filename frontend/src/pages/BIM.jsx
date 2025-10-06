import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, Plus, ArrowLeft, Trash2, 
  Type, Image, Code, Heading,
  Upload, Check, Copy, ChevronUp, ChevronDown,
  ChevronsUp, ChevronsDown, GripVertical
} from "lucide-react";

/* ---------- API & Auth ---------- */
const RAW_API = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "").trim();
const API_BASE = RAW_API.replace(/\/+$/, "");
const api = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const ownerHeaders = () => {
  const t = localStorage.getItem("owner_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function fetchJSON(path, options = {}) {
  let res = await fetch(api(path), options);
  if (res.status === 404 && !path.endsWith("/")) res = await fetch(api(path + "/"), options);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      if (data?.detail) msg = JSON.stringify(data.detail);
      else if (data?.message) msg = data.message;
      else msg = JSON.stringify(data);
    } catch {
      msg = (await res.text()) || res.statusText;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

const useOwnerMode = () => {
  const [owner, setOwner] = useState(true);
  return { owner, setOwner };
};

/* ---------- Add Block Menu ---------- */
function AddBlockMenu({ onAdd, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const blocks = [
    { type: "h1", icon: Heading, label: "Heading 1", color: "text-purple-600", desc: "Main section heading" },
    { type: "h2", icon: Heading, label: "Heading 2", color: "text-purple-500", desc: "Subsection heading" },
    { type: "text", icon: Type, label: "Paragraph", color: "text-slate-600", desc: "Regular text block" },
    { type: "image", icon: Image, label: "Image", color: "text-blue-600", desc: "Upload an image" },
    { type: "code", icon: Code, label: "Code", color: "text-green-600", desc: "Code snippet" },
  ];

  return (
    <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50" ref={menuRef}>
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50">
        Add Block
      </div>
      {blocks.map(({ type, icon: Icon, label, color, desc }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition text-left group border-b border-slate-100 last:border-0"
        >
          <div className={`p-2 rounded-lg bg-slate-50 group-hover:scale-110 transition`}>
            <Icon size={18} className={color} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-700">{label}</div>
            <div className="text-xs text-slate-500">{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ---------- Block Toolbar ---------- */
function BlockToolbar({ 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  onMoveToTop, 
  onMoveToBottom, 
  canMoveUp, 
  canMoveDown
}) {
  return (
    <div className="absolute -left-16 top-0 flex flex-col gap-1 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5">
      <div 
        className="p-2 rounded-lg hover:bg-slate-100 transition cursor-move drag-handle" 
        title="Drag to reorder"
      >
        <GripVertical size={16} className="text-slate-400" />
      </div>
      
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="p-2 rounded-lg hover:bg-red-50 transition group/btn" 
        title="Delete block"
      >
        <Trash2 size={16} className="text-slate-400 group-hover/btn:text-red-600" />
      </button>
      
      <div className="border-t border-slate-200 my-1" />
      
      {canMoveUp && (
        <>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoveToTop();
            }}
            className="p-2 rounded-lg hover:bg-purple-50 transition group/btn" 
            title="Move to top"
          >
            <ChevronsUp size={16} className="text-slate-400 group-hover/btn:text-purple-600" />
          </button>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoveUp();
            }}
            className="p-2 rounded-lg hover:bg-blue-50 transition group/btn" 
            title="Move up"
          >
            <ChevronUp size={16} className="text-slate-400 group-hover/btn:text-blue-600" />
          </button>
        </>
      )}
      
      {canMoveDown && (
        <>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoveDown();
            }}
            className="p-2 rounded-lg hover:bg-blue-50 transition group/btn" 
            title="Move down"
          >
            <ChevronDown size={16} className="text-slate-400 group-hover/btn:text-blue-600" />
          </button>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMoveToBottom();
            }}
            className="p-2 rounded-lg hover:bg-purple-50 transition group/btn" 
            title="Move to bottom"
          >
            <ChevronsDown size={16} className="text-slate-400 group-hover/btn:text-purple-600" />
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Heading Block ---------- */
function HeadingBlock({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom, canMoveUp, canMoveDown, isDragging }) {
  const [value, setValue] = useState(block.value || "");

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    onUpdate(index, { ...block, value: newValue });
  };

  const isH1 = block.type === "h1";
  const Tag = isH1 ? "h1" : "h2";
  const className = isH1 
    ? "text-5xl font-extrabold text-slate-900 tracking-tight leading-tight" 
    : "text-4xl font-bold text-purple-800 leading-snug";
  const placeholder = isH1 ? "Main Heading" : "Subheading";

  return (
    <div 
      className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      data-block-index={index}
    >
      {isH1 && index > 0 && (
        <div className="mb-12 pt-12 border-t-2 border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">
            New Section
          </div>
        </div>
      )}
      <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
        <BlockToolbar
          onDelete={() => onDelete(index)}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onMoveToTop={() => onMoveToTop(index)}
          onMoveToBottom={() => onMoveToBottom(index)}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>
      {isH1 && index === 0 && (
        <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-purple-600 rounded-full"></span>
          Main Heading
        </div>
      )}
      <Tag className={className}>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full bg-transparent focus:outline-none placeholder-slate-300 focus:placeholder-slate-400 caret-slate-900"
          style={{ caretColor: '#0f172a' }}
        />
      </Tag>
    </div>
  );
}

/* ---------- Text Block with Rich Formatting ---------- */
function TextBlock({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom, canMoveUp, canMoveDown, isDragging }) {
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const editorRef = useRef(null);
  const colorPickerRef = useRef(null);

  // Initialize content once
  useEffect(() => {
    if (editorRef.current && block.value && editorRef.current.innerHTML !== block.value) {
      editorRef.current.innerHTML = block.value;
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      onUpdate(index, { ...block, value: newValue });
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const colors = [
    { hex: '#000000', name: 'Black' },
    { hex: '#374151', name: 'Gray 700' },
    { hex: '#6B7280', name: 'Gray 500' },
    { hex: '#9CA3AF', name: 'Gray 400' },
    { hex: '#EF4444', name: 'Red' },
    { hex: '#F59E0B', name: 'Orange' },
    { hex: '#10B981', name: 'Green' },
    { hex: '#3B82F6', name: 'Blue' },
    { hex: '#8B5CF6', name: 'Purple' },
    { hex: '#EC4899', name: 'Pink' },
    { hex: '#14B8A6', name: 'Teal' },
    { hex: '#F97316', name: 'Orange' }
  ];

  return (
    <div 
      className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      data-block-index={index}
    >
      <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
        <BlockToolbar
          onDelete={() => onDelete(index)}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onMoveToTop={() => onMoveToTop(index)}
          onMoveToBottom={() => onMoveToBottom(index)}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>

      {/* Formatting Toolbar */}
      {showFormatBar && (
        <div className="mb-2 flex flex-wrap items-center gap-1 p-2 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
          {/* Text Style */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('bold');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Bold"
              type="button"
            >
              <span className="font-bold text-slate-700">B</span>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('italic');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Italic"
              type="button"
            >
              <span className="italic text-slate-700">I</span>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('underline');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Underline"
              type="button"
            >
              <span className="underline text-slate-700">U</span>
            </button>
          </div>

          {/* Alignment */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('justifyLeft');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Align Left"
              type="button"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4h16v2H2V4zm0 4h10v2H2V8zm0 4h16v2H2v-2zm0 4h10v2H2v-2z"/>
              </svg>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('justifyCenter');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Align Center"
              type="button"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4h16v2H2V4zm3 4h10v2H5V8zm-3 4h16v2H2v-2zm3 4h10v2H5v-2z"/>
              </svg>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('justifyRight');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Align Right"
              type="button"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4h16v2H2V4zm6 4h10v2H8V8zm-6 4h16v2H2v-2zm6 4h10v2H8v-2z"/>
              </svg>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('justifyFull');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Justify"
              type="button"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4h16v2H2V4zm0 4h16v2H2V8zm0 4h16v2H2v-2zm0 4h16v2H2v-2z"/>
              </svg>
            </button>
          </div>

          {/* Lists */}
          <div className="flex gap-1 pr-2 border-r border-slate-200">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('insertUnorderedList');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Bullet List"
              type="button"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 100 2 1 1 0 000-2zm4 1h10v1H7V5zm-4 4a1 1 0 100 2 1 1 0 000-2zm4 1h10v1H7v-1zm-4 4a1 1 0 100 2 1 1 0 000-2zm4 1h10v1H7v-1z"/>
              </svg>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                execCommand('insertOrderedList');
              }}
              className="p-2 rounded hover:bg-slate-100 transition"
              title="Numbered List"
              type="button"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3h1v3H3V3zm0 5h1.5v1H3.5v1H4.5v1H3V9zm.5 5H3v1h2v1H3v1h2v-3h-.5zM7 5h10v1H7V5zm0 5h10v1H7v-1zm0 5h10v1H7v-1z"/>
              </svg>
            </button>
          </div>

          {/* Color Picker */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-2 rounded hover:bg-slate-100 transition flex items-center gap-1"
              title="Text Color"
              type="button"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.414 4.586a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-2-2a2 2 0 012.828-2.828L7 8.172l3.586-3.586a2 2 0 012.828 0zM16 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <span className="text-xs font-bold">A</span>
            </button>
            
            {showColorPicker && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 min-w-[200px]">
                <div className="text-xs font-semibold text-slate-500 mb-2 px-1">Text Color</div>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.hex}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCommand('foreColor', color.hex);
                        setShowColorPicker(false);
                      }}
                      className="w-10 h-10 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:scale-110 transition-all shadow-sm hover:shadow-md"
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Font Size */}
          <div className="flex gap-1">
            <select
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                execCommand('fontSize', e.target.value);
              }}
              className="text-sm px-2 py-1 rounded border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="3"
            >
              <option value="1">Small</option>
              <option value="3">Normal</option>
              <option value="5">Large</option>
              <option value="7">Huge</option>
            </select>
          </div>
        </div>
      )}

      {/* Editor with list styling - bullets inherit text color */}
      <style>{`
        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 2rem;
          margin: 0.5rem 0;
        }
        [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 2rem;
          margin: 0.5rem 0;
        }
        [contenteditable] li {
          margin: 0.25rem 0;
        }
        [contenteditable] li::marker {
          color: inherit;
        }
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        [contenteditable] p:first-child {
          margin-top: 0;
        }
        [contenteditable] p:last-child {
          margin-bottom: 0;
        }
      `}</style>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={(e) => {
          // Allow Enter to create new lines/paragraphs within the block
          if (e.key === 'Enter' && !e.shiftKey) {
            // Let browser handle default Enter behavior for creating new paragraphs
          }
        }}
        onFocus={() => setShowFormatBar(true)}
        onBlur={(e) => {
          const toolbar = e.currentTarget.parentElement?.querySelector('.shadow-lg');
          if (!toolbar?.contains(e.relatedTarget)) {
            setTimeout(() => setShowFormatBar(false), 150);
          }
        }}
        data-placeholder="Start typing your paragraph..."
        className="w-full text-lg text-slate-700 leading-relaxed focus:outline-none bg-transparent hover:bg-slate-50/50 rounded-lg px-3 py-2 -mx-3 -my-2 transition focus:bg-slate-50/50 font-normal min-h-[48px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"
        style={{ wordBreak: 'break-word' }}
      />
    </div>
  );
}

/* ---------- Image Block ---------- */
function ImageBlock({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom, canMoveUp, canMoveDown, onUpload, isDragging }) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(block.value || "");
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setImageUrl(block.value || "");
    setImageError(false);
  }, [block.value]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
    setImageError(false);
    onUpdate(index, { ...block, value: localUrl });

    setUploading(true);
    try {
      const uploadedUrl = await onUpload(file);
      setImageUrl(uploadedUrl);
      onUpdate(index, { ...block, value: uploadedUrl });
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
      setImageUrl("");
      onUpdate(index, { ...block, value: "" });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = () => {
    fileInputRef.current?.click();
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (!imageUrl || imageError) {
    return (
      <div 
        className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        data-block-index={index}
      >
        <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
          <BlockToolbar
            onDelete={() => onDelete(index)}
            onMoveUp={() => onMoveUp(index)}
            onMoveDown={() => onMoveDown(index)}
            onMoveToTop={() => onMoveToTop(index)}
            onMoveToBottom={() => onMoveToBottom(index)}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
          />
        </div>
        <div className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-16 text-center hover:border-blue-400 hover:shadow-lg transition-all">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="p-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg">
              <Upload size={32} className="text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-700 mb-1">Upload an Image</h4>
              <p className="text-sm text-slate-500">PNG, JPG, GIF up to 10MB</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Choose Image"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      data-block-index={index}
    >
      <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
        <BlockToolbar
          onDelete={() => onDelete(index)}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onMoveToTop={() => onMoveToTop(index)}
          onMoveToBottom={() => onMoveToBottom(index)}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>
      <div className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all relative ring-1 ring-slate-200 group">
        <img 
          src={imageUrl} 
          alt="" 
          className="w-full" 
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition" />
        <button
          onClick={handleEdit}
          className="absolute top-4 right-4 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-lg text-sm font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:shadow-xl hover:bg-white"
        >
          Change Image
        </button>
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm font-medium text-slate-700">Uploading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Code Block ---------- */
function CodeBlock({ block, index, onUpdate, onDelete, onMoveUp, onMoveDown, onMoveToTop, onMoveToBottom, canMoveUp, canMoveDown, isDragging }) {
  const [value, setValue] = useState(block.value || "");
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    onUpdate(index, { ...block, value: newValue });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languageColors = {
    javascript: "text-yellow-400",
    typescript: "text-blue-400",
    python: "text-green-400",
    html: "text-orange-400",
    css: "text-pink-400"
  };

  const currentLang = block.language || "javascript";

  return (
    <div 
      className={`group/block relative py-4 transition-all duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      data-block-index={index}
    >
      <div className="opacity-0 group-hover/block:opacity-100 transition-opacity duration-200">
        <BlockToolbar
          onDelete={() => onDelete(index)}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onMoveToTop={() => onMoveToTop(index)}
          onMoveToBottom={() => onMoveToBottom(index)}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-900 shadow-xl ring-1 ring-slate-700">
        <div className="px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between border-b border-slate-700">
          <select
            value={currentLang}
            onChange={(e) => onUpdate(index, { ...block, language: e.target.value })}
            className={`text-sm ${languageColors[currentLang]} bg-slate-700/50 rounded-lg px-4 py-2 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold cursor-pointer hover:bg-slate-700 transition`}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
          </select>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white transition bg-slate-700/50 hover:bg-slate-600 rounded-lg font-medium"
          >
            {copied ? (
              <>
                <Check size={16} className="text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
        </div>
        <textarea
          value={value}
          onChange={handleChange}
          placeholder="// Write your code here..."
          className="w-full h-64 p-5 bg-slate-900 text-slate-100 font-mono text-sm leading-relaxed focus:outline-none resize-none placeholder-slate-600"
          spellCheck="false"
        />
      </div>
    </div>
  );
}

/* ---------- Main Editor ---------- */
export default function BIMEditor() {
  const { owner } = useOwnerMode();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const addButtonRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setBusy(true);
        const data = await fetchJSON(`/api/bim/${encodeURIComponent(id)}`);
        const loadedBlocks = Array.isArray(data?.blocks) ? data.blocks : [];
        
        const blocksWithIds = loadedBlocks.map((block, idx) => {
          const preservedBlock = {
            ...block,
            type: block.type,
            id: block.id || `${Date.now()}-${idx}`
          };
          return preservedBlock;
        });
        
        setBlocks(blocksWithIds);
        setErr("");
      } catch (e) {
        setErr(e?.message || "Failed to load");
      } finally {
        setBusy(false);
      }
    })();
  }, [id, isEdit]);

  // Drag and drop setup
  useEffect(() => {
    const handleDragStart = (e) => {
      const dragHandle = e.target.closest('.drag-handle');
      if (!dragHandle) return;

      const blockContainer = e.target.closest('[data-block-index]');
      if (!blockContainer) return;

      const index = parseInt(blockContainer.dataset.blockIndex);
      setDraggedIndex(index);
      
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", blockContainer);
      
      setTimeout(() => {
        blockContainer.style.opacity = "0.4";
      }, 0);
    };

    const handleDragEnd = (e) => {
      const blockContainer = e.target.closest('[data-block-index]');
      if (blockContainer) {
        blockContainer.style.opacity = "1";
      }
      setDraggedIndex(null);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      const blockContainer = e.target.closest('[data-block-index]');
      if (!blockContainer || draggedIndex === null) return;

      const index = parseInt(blockContainer.dataset.blockIndex);
      if (draggedIndex === index) return;

      const newBlocks = [...blocks];
      const draggedBlock = newBlocks[draggedIndex];
      
      if (draggedBlock.type === "h1" && newBlocks[index].type === "h1") {
        return;
      }

      newBlocks.splice(draggedIndex, 1);
      newBlocks.splice(index, 0, draggedBlock);
      
      setBlocks(newBlocks);
      setDraggedIndex(index);
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('dragover', handleDragOver);
    };
  }, [blocks, draggedIndex]);

  const addBlock = (type) => {
    const newBlock = { 
      type, 
      value: "",
      id: Date.now() + Math.random()
    };
    if (type === "code") newBlock.language = "javascript";
    setBlocks([...blocks, newBlock]);
    setShowAddMenu(false);
  };

  const updateBlock = (index, updatedBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    setBlocks(newBlocks);
  };

  const deleteBlock = (index) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const findPreviousH1 = (index) => {
    for (let i = index - 1; i >= 0; i--) {
      if (blocks[i].type === "h1") return i;
    }
    return -1;
  };

  const findNextH1 = (index) => {
    for (let i = index + 1; i < blocks.length; i++) {
      if (blocks[i].type === "h1") return i;
    }
    return blocks.length;
  };

  const moveBlockUp = (index) => {
    if (index <= 0) return;
    if (blocks[index].type === "h1") {
      const prevH1Index = findPreviousH1(index);
      if (prevH1Index >= 0 && index - 1 === prevH1Index) return;
    }
    if (blocks[index - 1].type === "h1") return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const moveBlockDown = (index) => {
    if (index >= blocks.length - 1) return;
    if (blocks[index].type === "h1" && blocks[index + 1].type === "h1") return;
    if (blocks[index + 1].type === "h1") return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const moveBlockToTop = (index) => {
    if (index <= 0) return;
    const newBlocks = [...blocks];
    const movedBlock = newBlocks[index];
    const targetIndex = movedBlock.type === "h1" ? 0 : (findPreviousH1(index) >= 0 ? findPreviousH1(index) + 1 : 0);
    if (targetIndex === index) return;
    newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);
    setBlocks(newBlocks);
  };

  const moveBlockToBottom = (index) => {
    if (index >= blocks.length - 1) return;
    const newBlocks = [...blocks];
    const movedBlock = newBlocks[index];
    const targetIndex = movedBlock.type === "h1" ? blocks.length - 1 : findNextH1(index) - 1;
    if (targetIndex === index) return;
    newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);
    setBlocks(newBlocks);
  };

  const onUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const data = await fetchJSON("/api/bim/upload-image", { 
      method: "POST", 
      headers: { ...ownerHeaders() },
      body: formData 
    });
    if (!data?.url) throw new Error("No URL returned");
    return data.url;
  };

  const handleSave = async () => {
    if (!owner || blocks.length === 0) {
      alert("Please add at least one block");
      return;
    }

    const rawTitle = blocks.find(b => b.type === "h1" || b.type === "h2")?.value || "";
    const title = (rawTitle || "").trim() || "Untitled";

    const langMap = { javascript: "js", typescript: "ts", python: "py", html: "html", css: "css" };
    
    const normalizedBlocks = blocks.map((b) => {
      const base = { 
        type: b.type,
        value: (b.value ?? "").toString() 
      };
      if (b.type === "code") {
        const uiLang = (b.language || "javascript").toLowerCase();
        base.language = langMap[uiLang] || "js";
      }
      return base;
    });

    try {
      setBusy(true);
      const payload = { title, blocks: normalizedBlocks };
      
      if (isEdit) {
        await fetchJSON(`/api/bim/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...ownerHeaders() },
          body: JSON.stringify(payload)
        });
      } else {
        await fetchJSON("/api/bim", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...ownerHeaders() },
          body: JSON.stringify(payload)
        });
      }

      nav("/bim", { replace: true });
    } catch (e) {
      alert(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
          <button
            onClick={() => nav("/bim")}
            className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all font-semibold"
          >
            <ArrowLeft size={20} />
            Back to Posts
          </button>

          <button
            onClick={handleSave}
            disabled={!owner || busy || blocks.length === 0}
            className="flex items-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 transition-all text-sm font-bold shadow-xl shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-purple-500/40"
          >
            <Save size={20} />
            {busy ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 pt-36 pb-32">
        {blocks.length === 0 ? (
          <div className="text-center py-32">
            <div className="mb-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shadow-lg">
                <Type size={36} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Start Creating Your Content</h3>
              <p className="text-slate-500">Add your first block to begin writing</p>
            </div>
            <div className="relative inline-block" ref={addButtonRef}>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all text-base font-semibold text-slate-600 hover:text-purple-700 shadow-lg hover:shadow-xl"
              >
                <Plus size={22} />
                Add Your First Block
              </button>
              {showAddMenu && (
                <AddBlockMenu 
                  onAdd={addBlock} 
                  onClose={() => setShowAddMenu(false)} 
                />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pl-20">
            {blocks.map((block, index) => {
              let canMoveUp = index > 0;
              let canMoveDown = index < blocks.length - 1;
              
              if (canMoveUp && blocks[index - 1].type === "h1") canMoveUp = false;
              if (canMoveDown && blocks[index + 1].type === "h1") canMoveDown = false;
              if (block.type === "h1" && canMoveUp) {
                for (let i = index - 1; i >= 0; i--) {
                  if (blocks[i].type === "h1" && i === index - 1) {
                    canMoveUp = false;
                    break;
                  }
                }
              }
              
              const blockProps = {
                block,
                index,
                onUpdate: updateBlock,
                onDelete: deleteBlock,
                onMoveUp: moveBlockUp,
                onMoveDown: moveBlockDown,
                onMoveToTop: moveBlockToTop,
                onMoveToBottom: moveBlockToBottom,
                canMoveUp,
                canMoveDown,
                isDragging: draggedIndex === index
              };

              return (
                <div key={block.id || index}>
                  {(block.type === "h1" || block.type === "h2") ? (
                    <HeadingBlock {...blockProps} />
                  ) : block.type === "text" ? (
                    <TextBlock {...blockProps} />
                  ) : block.type === "image" ? (
                    <ImageBlock {...blockProps} onUpload={onUpload} />
                  ) : block.type === "code" ? (
                    <CodeBlock {...blockProps} />
                  ) : null}
                </div>
              );
            })}

            <div className="relative pt-6" ref={addButtonRef}>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-slate-100 hover:to-transparent transition-all text-sm text-slate-400 hover:text-slate-700 font-semibold border border-dashed border-transparent hover:border-slate-300"
              >
                <Plus size={18} />
                Add block
              </button>
              {showAddMenu && (
                <AddBlockMenu 
                  onAdd={addBlock} 
                  onClose={() => setShowAddMenu(false)} 
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}