import { useEffect, useMemo, useState } from "react";
import { getSkills, createSkill, updateSkill, deleteSkill } from "../lib/api";

export default function SkillsPanel() {
  const [skills, setSkills] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // id | null

  useEffect(() => { refresh(); }, []);
  async function refresh() { setSkills(await getSkills()); }

  const categories = useMemo(() => {
    const map = new Map();
    for (const s of skills) {
      const k = (s.category || "General").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    }
    // stable order: General first, then alpha
    const keys = Array.from(map.keys()).sort((a,b) =>
      (a==="General") ? -1 : (b==="General") ? 1 : a.localeCompare(b));
    return keys.map(k => [k, map.get(k)]);
  }, [skills]);

  async function onAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createSkill({ name: name.trim(), category: (category || "General").trim(), level: level ? Number(level) : null, sortOrder: 0 });
      setName(""); setCategory(""); setLevel("");
      await refresh();
    } finally { setBusy(false); }
  }

  async function onSaveEdit(id, patch) {
    setBusy(true);
    try {
      const cur = skills.find(s => s.id === id);
      await updateSkill(id, {
        name: patch.name ?? cur.name,
        category: patch.category ?? cur.category,
        level: ("level" in patch) ? patch.level : cur.level,
        sortOrder: cur.sortOrder ?? 0
      });
      setEditing(null);
      await refresh();
    } finally { setBusy(false); }
  }

  async function onDel(id) {
    setBusy(true);
    try { await deleteSkill(id); await refresh(); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Skills</h3>
        {/* Add row inline, compact */}
        <form onSubmit={onAdd} className="flex gap-2 items-center">
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="Skill name (e.g., Revit)"
            className="h-9 rounded-lg border px-3 text-sm outline-none focus:ring-2 ring-gray-300"
            />
          <input
            list="skill-cats"
            value={category}
            onChange={e=>setCategory(e.target.value)}
            placeholder="Category (e.g., Modeling)"
            className="h-9 rounded-lg border px-3 text-sm outline-none focus:ring-2 ring-gray-300"
            />
          <datalist id="skill-cats">
            {Array.from(new Set(skills.map(s=>s.category || "General"))).map(c =>
              <option key={c} value={c} />)}
          </datalist>
          <input
            type="number" min="0" max="5" step="1"
            value={level || ""} onChange={e=>setLevel(e.target.value)}
            placeholder="Lv"
            className="h-9 w-16 rounded-lg border px-2 text-sm text-center outline-none focus:ring-2 ring-gray-300"
          />
          <button disabled={busy} className="h-9 rounded-lg bg-gray-900 text-white px-3 text-sm disabled:opacity-50">
            Add
          </button>
        </form>
      </div>

      {/* grouped chips */}
      <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map(([cat, list]) => (
          <div key={cat} className="rounded-xl border border-gray-200 p-3">
            <div className="text-sm font-medium mb-2 opacity-80">{cat}</div>
            <div className="flex flex-wrap gap-2">
              {list.map(s => (
                <SkillChip key={s.id} s={s}
                  editing={editing === s.id}
                  onEdit={()=>setEditing(s.id)}
                  onCancel={()=>setEditing(null)}
                  onSave={onSaveEdit}
                  onDel={onDel}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillChip({ s, editing, onEdit, onCancel, onSave, onDel }) {
  const [name, setName] = useState(s.name);
  const [category, setCategory] = useState(s.category || "General");
  const [level, setLevel] = useState(s.level ?? "");

  if (!editing) {
    return (
      <div className="group relative">
        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
          {s.name}
          {s.level != null && <span className="text-xs opacity-60">Lv{s.level}</span>}
        </span>
        <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2">
          <button onClick={onEdit} title="Edit"
            className="rounded-full bg-black/80 text-white px-2 py-1 text-xs">Edit</button>
          <button onClick={()=>onDel(s.id)} title="Delete"
            className="rounded-full bg-red-600 text-white px-2 py-1 text-xs">Del</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border px-2 py-1">
      <input value={name} onChange={e=>setName(e.target.value)} className="w-24 text-sm outline-none"/>
      <input value={category} onChange={e=>setCategory(e.target.value)} className="w-24 text-sm outline-none"/>
      <input type="number" min="0" max="5" step="1" value={level}
        onChange={e=>setLevel(e.target.value)} className="w-12 text-sm text-center outline-none"/>
      <button onClick={()=>onSave(s.id,{name,category,level: level===""?null:Number(level)})}
        className="text-xs rounded bg-black text-white px-2 py-1">Save</button>
      <button onClick={onCancel} className="text-xs rounded bg-gray-200 px-2 py-1">Cancel</button>
    </div>
  );
}
