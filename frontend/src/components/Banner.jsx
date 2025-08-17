// Responsive banner with fixed height and "contain" option
export default function Banner({
  src,
  alt = "Banner",
  height="h-40 md:h-48 lg:h-56", // tweak here: smaller or larger
  contain = true,                  // true => keep entire image (no cropping)
  rounded = "2xl",
  className = "",
  bg = "bg-gray-100"
}) {
  const radius =
    rounded === "full" ? "rounded-full" :
    rounded === "xl"   ? "rounded-xl"   : "rounded-2xl";

  return (
    <div className={`relative w-full ${height} ${radius} overflow-hidden ${bg} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full ${contain ? "object-contain" : "object-cover"}`}
        />
      ) : (
        <div className="w-full h-full bg-gray-200" />
      )}
    </div>
  );
}
