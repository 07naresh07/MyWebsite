export default function Timeline({ items, renderTitle, renderMeta, renderBody }) {
  return (
    <ol className="relative border-s-2 border-neutral-200 pl-6">
      {items.map((it) => (
        <li key={it.id} className="mb-8 ms-4">
          <div className="absolute w-3 h-3 bg-blue-600 rounded-full -start-1.5 mt-2"></div>
          <h3 className="text-lg font-semibold">{renderTitle(it)}</h3>
          <div className="text-sm text-neutral-600 mb-2">{renderMeta(it)}</div>
          <div className="prose max-w-none">{renderBody(it)}</div>
        </li>
      ))}
    </ol>
  );
}
