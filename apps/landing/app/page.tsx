import { ContactProvider } from "@/lib/contact/ContactContext";
import { PageBackdrop } from "@/components/PageBackdrop";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { Divisions } from "@/components/Divisions";
import { Labs } from "@/components/Labs";
import { Ventures } from "@/components/Ventures";
import { GlobeSection } from "@/components/GlobeSection";
import { Team } from "@/components/Team";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { ContactDialog } from "@/components/ContactDialog";
import { OrganizationJsonLd } from "@/components/OrganizationJsonLd";
import { Hairline } from "@/components/ui/Hairline";

export default function Home() {
  return (
    <ContactProvider>
      <OrganizationJsonLd />
      <PageBackdrop />
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <Divisions />
        <Hairline />
        <Labs />
        <Hairline />
        <Ventures />
        <GlobeSection />
        <Team />
        <Hairline />
        <FinalCta />
      </main>
      <Footer />
      <ContactDialog />
    </ContactProvider>
  );
}
