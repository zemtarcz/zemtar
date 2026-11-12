import dynamic from "next/dynamic";
import { Header } from "@/components/sections/Header";
import { ScrollSequence } from "@/components/motion/ScrollSequence";
import { Services } from "@/components/sections/Services";
import { Fleet } from "@/components/sections/Fleet";
import { Pricing } from "@/components/sections/Pricing";
import { Area } from "@/components/sections/Area";
import { Faq } from "@/components/sections/Faq";
import { TruckDriveBy } from "@/components/sections/TruckDriveBy";
import { Footer } from "@/components/sections/Footer";
import { QuoteProvider } from "@/components/quote/QuoteContext";
import { TrackDivider } from "@/components/ui/TrackDivider";

const Contact = dynamic(
  () =>
    import("@/components/sections/Contact").then((mod) => mod.Contact),
  {
    loading: () => (
      <section
        id="kontakt"
        className="border-t border-line bg-void py-16 md:py-20"
        aria-busy="true"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="h-10 w-48 animate-pulse bg-white/10" />
          <div className="mt-8 h-64 animate-pulse bg-white/5" />
        </div>
      </section>
    ),
  },
);

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <ScrollSequence />
        <Services />
        <TruckDriveBy />
        <QuoteProvider>
          <Fleet />
          <TrackDivider />
          <Area />
          <TrackDivider />
          <Faq />
          <TrackDivider />
          <Pricing />
          <TrackDivider />
          <Contact />
        </QuoteProvider>
        <Footer />
      </main>
    </>
  );
}
