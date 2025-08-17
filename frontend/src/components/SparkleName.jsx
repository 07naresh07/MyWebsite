// Letter-by-letter animated name banner (calm colors, unified with quote)
export default function SparkleName({
  name = "Naresh Singh Dhami",
  quote = "Practice what you preach or change your speech.",
  height = "h-24 md:h-28 lg:h-32",
  className = ""
}) {
  const letters = [...name];

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden ${className}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,.45)_100%)]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />

      {/* Content */}
      <div className="relative h-full w-full flex items-center px-5 md:px-8">
        {/* Animated letters */}
        <h1 className="flex items-baseline gap-[0.02em] text-white/95 tracking-tight font-extrabold text-2xl md:text-4xl lg:text-5xl">
          {letters.map((ch, i) => (
            <span
              key={i}
              className={`letter ${ch === " " ? "mx-[0.18em]" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
              aria-hidden="true"
            >
              {ch}
            </span>
          ))}
          <span className="sr-only">{name}</span>
        </h1>

        {/* Quote — bottom right */}
        {quote && (
          <span className="absolute bottom-2 right-4 text-[0.8rem] md:text-sm lg:text-base text-white/80 italic tracking-tight text-right">
            {`"${quote}"`}
          </span>
        )}
      </div>
    </div>
  );
}
