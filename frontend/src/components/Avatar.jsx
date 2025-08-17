export default function Avatar({
  src,
  alt = "Profile photo",
  size = "lg",          // sm | md | lg | xl
  rounded = "2xl",      // "xl" | "2xl" | "full"
  className = ""
}) {
  const map = { sm: "w-24 h-24", md: "w-32 h-32", lg: "w-48 h-48", xl: "w-56 h-56" };
  const radius =
    rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-2xl";

  return (
    <div className={`${map[size]} ${radius} overflow-hidden border shadow bg-gray-100 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover block"
        />
      ) : (
        <div className="w-full h-full bg-gray-200" />
      )}
    </div>
  );
}


