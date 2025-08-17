import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Project } from "../types";

export default function Projects() {
  const [items, setItems] = useState<Project[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProjects()
      .then((res) => {
        setItems(res);
        setErr(null);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      {err && <p className="text-red-600">Error: {err}</p>}
      {!err && items.length === 0 && (
        <p className="text-gray-500">No projects yet.</p>
      )}
      <ul className="grid md:grid-cols-2 gap-4">
        {items.map((p) => (
          <li key={p.id} className="border rounded p-4 hover:shadow-sm transition">
            <div className="font-semibold">{p.name}</div>
            {p.summary && <p className="text-sm text-gray-600">{p.summary}</p>}
            {p.techStack?.length ? (
              <p className="text-xs text-gray-500 mt-1">
                Tech: {p.techStack.join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
