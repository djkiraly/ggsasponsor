export function Footer({ contactEmail }: { contactEmail?: string }) {
  return (
    <footer className="w-full" style={{ background: "#1C3FCF", color: "#FFFFFF" }}>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-sm">
        Contact:{" "}
        <a
          href={`mailto:${contactEmail ?? "info@geringgirlssoftball.org"}`}
          className="underline"
          style={{ color: "#FFFFFF" }}
        >
          {contactEmail ?? "info@geringgirlssoftball.org"}
        </a>
      </div>
    </footer>
  );
}

