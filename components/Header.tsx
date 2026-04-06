import React from "react";

export function Header({
  title,
  logoUrl,
}: {
  title?: string;
  logoUrl?: string;
}) {
  const orgName = title ?? "Gering Girls Softball Association";

  return (
    <header className="w-full" style={{ background: "#1C3FCF", color: "#FFFFFF" }}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 py-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName}
              className="h-10 w-10 rounded bg-white/15 object-contain p-0.5"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded bg-white/15 text-xs font-bold"
              aria-hidden="true"
            >
              GGSA
            </div>
          )}
          <div className="text-center">
            <div className="text-sm font-semibold leading-tight">{orgName}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

