import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Winter Arc.",
};

const UPDATED = "11 September 2026";

export default function TermsPage() {
  return (
    <>
      <h1 className="t-display-2 text-frost-0">Terms of use</h1>
      <p className="t-micro mt-2 text-frost-2">LAST UPDATED {UPDATED.toUpperCase()}</p>

      <nav aria-label="On this page" className="mt-8 border-y border-line-1 py-4">
        <ol className="space-y-1.5">
          {[
            ["what-this-is", "What this is"],
            ["not-medical-advice", "Not medical or dietary advice"],
            ["your-data", "Your data and your device"],
            ["availability", "Availability and changes"],
            ["liability", "Liability"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="t-small text-frost-1 transition-none hov:text-ember">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="what-this-is" className="mt-10">
        <h2 className="t-title text-frost-0">What this is</h2>
        <p className="t-body mt-3 text-frost-1">
          Winter Arc is a personal training and diet tracker that runs in your browser. It is provided as-is, at no
          cost, with no account and no subscription. Using it means you accept these terms.
        </p>
      </section>

      <section id="not-medical-advice" className="mt-10">
        <h2 className="t-title text-frost-0">Not medical or dietary advice</h2>
        <p className="t-body mt-3 text-frost-1">
          Winter Arc records what you tell it and does arithmetic on it. Calorie targets, BMR, estimated energy
          expenditure and estimated one-rep max are rough calculations from standard formulas, not measurements, and not
          advice. Talk to a doctor or a qualified dietitian before changing how you train or eat, especially if you have
          a health condition, are pregnant, or are recovering from injury. Stop and seek help if something hurts.
        </p>
      </section>

      <section id="your-data" className="mt-10">
        <h2 className="t-title text-frost-0">Your data and your device</h2>
        <p className="t-body mt-3 text-frost-1">
          Everything you log is stored in your own browser. There is no server holding your training history. That also
          means it can be lost: clearing site data, uninstalling the browser, or a device failure will take it with it.
          Export a backup from the System screen regularly. You are responsible for keeping your own copies.
        </p>
      </section>

      <section id="availability" className="mt-10">
        <h2 className="t-title text-frost-0">Availability and changes</h2>
        <p className="t-body mt-3 text-frost-1">
          Features may change and the app may be unavailable at times. If a future version adds optional sync to a
          server, it will be opt-in, and these terms will be updated before it ships.
        </p>
      </section>

      <section id="liability" className="mt-10">
        <h2 className="t-title text-frost-0">Liability</h2>
        <p className="t-body mt-3 text-frost-1">
          To the extent the law allows, Winter Arc is provided without warranties, and its authors are not liable for
          injury, lost data, or any other loss arising from using it.
        </p>
      </section>
    </>
  );
}
