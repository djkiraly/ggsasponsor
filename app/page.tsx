import { PublicSponsorshipForm } from "@/components/PublicSponsorshipForm";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getPublishableKey } from "@/lib/stripe";

export default async function Home() {
  const stripeKey = await getPublishableKey();

  if (!stripeKey) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Sponsorship Portal
          </h1>
          <p className="mt-4 text-slate-700">
            The sponsorship form is not available at this time. Please check
            back later.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <PublicSponsorshipForm stripePublishableKey={stripeKey} />
  );
}
