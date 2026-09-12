import Link from "next/link";
import { LiveDemo } from "@/components/landing/LiveDemo";
import dynamic from "next/dynamic";

// Below the fold, and both pull in GSAP ScrollTrigger.
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks").then((m) => m.HowItWorks));
const ArcStrip = dynamic(() => import("@/components/landing/ArcStrip").then((m) => m.ArcStrip));
import { BeginButton } from "@/components/landing/BeginButton";
import { APP_VERSION } from "@/lib/version";

export default function LandingPage() {
  return (
    <>
      <header className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4">
        <span className="t-readout text-frost-0">WINTER ARC</span>
        <BeginButton variant="ghost" size="sm" />
      </header>

      <main>
        {/* Hero: the thesis and the working product, side by side */}
        <section className="mx-auto max-w-[1180px] px-4 pb-20 pt-8 lg:pt-12">
          {/* The headline gets the full measure, so it lands on two lines. */}
          <h1 className="t-display-1 text-[34px] text-frost-0 sm:text-[40px] lg:text-[48px] xl:text-[56px]">
            <span className="lg:block">Ninety days. One System.</span>{" "}
            <span className="lg:block">Every rep logged.</span>
          </h1>

          <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
            <div className="flex flex-col justify-start">
              <p className="t-body max-w-[48ch] text-frost-1">
                A training and diet tracker that runs your actual split and your actual meals as daily quests, and pays
                you in levels, ranks and streaks for clearing them.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <BeginButton variant="primary" size="lg" />
                <a
                  href="#demo"
                  className="pressable t-readout inline-flex h-14 items-center border border-line-2 px-6 text-frost-1 transition-none hov:border-frost-2 hov:text-frost-0"
                >
                  Try the demo
                </a>
              </div>
            </div>

            <div id="demo" className="scroll-mt-8">
              <LiveDemo />
            </div>
          </div>
        </section>

        <HowItWorks />
        <ArcStrip />

        {/* Close */}
        <section className="mx-auto max-w-[760px] px-4 pb-28 text-center">
          <h2 className="t-display-1 text-frost-0">Begin the awakening</h2>
          <p className="t-body mx-auto mt-4 max-w-[50ch] text-frost-1">
            Setup takes about a minute. Your plan is already loaded; edit anything you want, then clear day one.
          </p>
          <div className="mt-8 flex justify-center">
            <BeginButton variant="primary" size="lg" />
          </div>
        </section>
      </main>

      <footer className="border-t border-line-1">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-micro text-frost-2">LOCAL-FIRST. YOUR DATA STAYS ON THIS DEVICE.</p>
          <nav className="flex items-center gap-6" aria-label="Legal">
            <Link href="/legal/terms" className="t-micro text-frost-2 transition-none hov:text-frost-0">
              TERMS
            </Link>
            <Link href="/legal/privacy" className="t-micro text-frost-2 transition-none hov:text-frost-0">
              PRIVACY
            </Link>
            <span className="t-micro text-frost-2">V{APP_VERSION}</span>
          </nav>
        </div>
      </footer>
    </>
  );
}
