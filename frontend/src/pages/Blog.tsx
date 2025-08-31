import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "../lib/api";
import type { PagedResult, Post } from "../types";

export default function Blog() {
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<PagedResult<Post> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const pageSize = 5;

  useEffect(() => {
    setLoading(true);
    api
      .getPosts(page, pageSize)
      .then((res) => {
        setData(res);
        setErr(null);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Blog</h1>

      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600">Error: {err}</p>}
      {!loading && !err && data?.items.length === 0 && (
        <p className="text-gray-500">No posts yet.</p>
      )}

      <ul className="space-y-3">
        {data?.items.map((p) => (
          <li
            key={p.id}
            className="border rounded p-4 hover:shadow-sm transition"
          >
            <Link
              to={`/blog/${p.slug}`}
              className="text-lg font-semibold underline"
            >
              {p.title}
            </Link>
            {p.excerpt && (
              <p className="text-sm text-gray-600 mt-1">{p.excerpt}</p>
            )}
            {p.publishedAt && (
              <p className="text-xs text-gray-500 mt-1">
                {dayjs(p.publishedAt).format("MMM D, YYYY")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {data && (
        <div className="flex items-center gap-2">
          <button
            className="border px-3 py-1 rounded"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            className="border px-3 py-1 rounded"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
