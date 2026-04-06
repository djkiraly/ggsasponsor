"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type VerifyState = "loading" | "success" | "expired" | "invalid";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/admin/verify-email?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          setState("success");
        } else {
          const data = await res.json();
          if (data.code === "TOKEN_EXPIRED") {
            setState("expired");
          } else {
            setState("invalid");
          }
        }
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header title="GGSA Admin Portal" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          {state === "loading" && (
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1C3FCF]" />
              <span className="text-sm text-slate-700">Verifying your email...</span>
            </div>
          )}

          {state === "success" && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-8 shadow-sm">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "#16A34A" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-5 text-2xl font-bold text-slate-900">Email Verified</h1>
              <p className="mt-3 text-sm text-slate-700">
                Your email address has been verified. An administrator will review and activate your account. You will receive an email when your account is ready.
              </p>
              <Link
                href="/admin/login"
                className="mt-6 inline-block text-sm font-medium text-[#1C3FCF] hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          )}

          {state === "expired" && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-8 shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-5 text-2xl font-bold text-slate-900">Link Expired</h1>
              <p className="mt-3 text-sm text-slate-700">
                This verification link has expired. Please register again to receive a new link.
              </p>
              <Link
                href="/admin/register"
                className="mt-6 inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "#1C3FCF" }}
              >
                Register Again
              </Link>
            </div>
          )}

          {state === "invalid" && (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-8 shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-5 text-2xl font-bold text-slate-900">Invalid Link</h1>
              <p className="mt-3 text-sm text-slate-700">
                This verification link is invalid or has already been used.
              </p>
              <Link
                href="/admin/login"
                className="mt-6 inline-block text-sm font-medium text-[#1C3FCF] hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
