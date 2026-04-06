import { PublicSponsorshipForm } from "@/components/PublicSponsorshipForm";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getPublishableKey } from "@/lib/stripe";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stripeKey = await getPublishableKey();

  if (!stripeKey) {
    let s: Record<string, string> = {};
    try { s = await getSettings(); } catch {}

    return (
      <div className="min-h-screen bg-white">
        <Header logoUrl={s.hero_logo_url} />
        <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Sponsorship Portal
          </h1>
          <p className="mt-4 text-slate-700">
            The sponsorship form is not available at this time. Please check
            back later.
          </p>
        </main>
        <Footer contactEmail={s.contact_email} footerText={s.footer_text} />
      </div>
    );
  }

  return (
    <PublicSponsorshipForm stripePublishableKey={stripeKey} />
  );
}
