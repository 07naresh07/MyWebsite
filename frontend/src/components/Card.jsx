export default function Card({ children, className = "", as: Tag = "div" }) {
  return (
    <Tag
      className={`
        rounded-2xl border border-slate-200 bg-white/70 backdrop-blur
        shadow-sm transition-all duration-300
        hover:shadow-xl hover:-translate-y-[2px]
        p-5
        ${className}
      `}
    >
      {children}
    </Tag>
  );
}
