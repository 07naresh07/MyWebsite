import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../lib/api";
import type { Post } from "../types";

export default function PostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .getPost(slug)
      .then((res) => {
        setPost(res);
        setErr(null);
      })
      .catch((e) => setErr(String(e)));
  }, [slug]);

  if (err) return <p className="text-red-600">Error: {err}</p>;
  if (!post) return <p>Loading…</p>;

  return (
    <article className="prose max-w-none">
      <h1>{post.title}</h1>
      {/* If you store markdown in `content`, render it; else fall back to excerpt */}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {post.content || post.excerpt || ""}
      </ReactMarkdown>
    </article>
  );
}
