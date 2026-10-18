import Image from "next/image";

/** Municipal seal shown while any page other than the home is still loading. */
export function LoadingSeal({
  label = "Lecture…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" className={`loading-seal ${className}`.trim()}>
      <Image src="/sceau-mairie.png" alt="" width={280} height={280} className="loading-seal-mark" />
      <p className="loading-label">{label}</p>
    </div>
  );
}
