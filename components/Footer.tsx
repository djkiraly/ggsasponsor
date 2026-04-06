export function Footer({
  contactEmail,
  footerText,
}: {
  contactEmail?: string;
  footerText?: string;
}) {
  return (
    <footer className="w-full" style={{ background: "#1C3FCF", color: "#FFFFFF" }}>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-sm">
        {footerText && (
          <div className="mb-2">{footerText}</div>
        )}
        <div>
          Contact:{" "}
          <a
            href={`mailto:${contactEmail ?? "info@geringgirlssoftball.org"}`}
            className="underline"
            style={{ color: "#FFFFFF" }}
          >
            {contactEmail ?? "info@geringgirlssoftball.org"}
          </a>
        </div>
      </div>
    </footer>
  );
}
