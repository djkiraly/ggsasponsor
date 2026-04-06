"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Registration failed. Please try again.";
        setError(msg);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header title="GGSA Admin Portal" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold" style={{ color: "#1C3FCF" }}>
              Create an Account
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              Register to access the sponsorship portal
            </p>
          </div>

          {success ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-6 text-center shadow-sm">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "#1C3FCF" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22 6L9.5 18.5 2 11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Check your email</h2>
              <p className="mt-2 text-sm text-slate-700">
                We sent a verification link to <strong>{email}</strong>. Please click the link to verify your email address.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                The link expires in 24 hours.
              </p>
              <Link
                href="/admin/login"
                className="mt-5 inline-block text-sm font-medium text-[#1C3FCF] hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] p-6 shadow-sm"
            >
              <div className="mb-5">
                <label htmlFor="name" className="mb-1 block text-sm font-semibold text-slate-800">
                  Full Name
                </label>
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                />
              </div>

              <div className="mb-5">
                <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-800">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                />
              </div>

              <div className="mb-5">
                <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                  placeholder="Min 8 characters"
                />
              </div>

              <div className="mb-5">
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold text-slate-800">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1C3FCF]"
                />
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-md px-5 py-3 font-semibold text-white"
                style={{ background: "#1C3FCF", opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>

              <p className="mt-4 text-center text-sm text-slate-700">
                Already have an account?{" "}
                <Link href="/admin/login" className="font-medium text-[#1C3FCF] hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
