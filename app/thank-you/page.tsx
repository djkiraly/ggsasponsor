import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function ThankYouPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const nameRaw = searchParams?.name;
  const name = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;
  const sponsorName = name?.trim() || "Sponsor";

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10">
        <div className="flex flex-col items-center text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "#1C3FCF" }}
            aria-hidden="true"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl font-bold" style={{ color: "#1C3FCF" }}>
            Thank you, {sponsorName}!
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-700">
            A receipt has been emailed to you. The GGSA team will follow up with
            next steps shortly.
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex h-11 items-center justify-center rounded-md px-5 font-semibold"
            style={{ background: "#1C3FCF", color: "#FFFFFF" }}
          >
            Return Home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

