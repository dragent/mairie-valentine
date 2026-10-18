import Image from "next/image";

const LINES = ["Greffe ouvert", "Valentine", "Sceau présenté"];

/** Closed register whose cover lifts when the town hall is entered. */
export function LoadingBook({ className = "" }: { className?: string }) {
  return (
    <div role="status" aria-label="Ouverture du registre" className={`loading-book ${className}`.trim()}>
      <div className="book" aria-hidden="true">
        <div className="book-board" />
        <div className="book-pages">
          <div className="page-ink" />
          <div className="page-ink">
            <p className="page-heading">Registre</p>
            {LINES.map((line) => (
              <p key={line} className="page-line">
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="book-cover">
          <div className="book-cover-face">
            <Image src="/sceau-mairie.png" alt="" width={220} height={220} className="book-cover-seal" />
          </div>
        </div>
      </div>
      <p className="loading-label">Ouverture du registre</p>
    </div>
  );
}
