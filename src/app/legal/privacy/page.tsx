import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Winter Arc stores, where it lives, and how to delete it.",
};

const UPDATED = "11 September 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1 className="t-display-2 text-frost-0">Privacy</h1>
      <p className="t-micro mt-2 text-frost-2">LAST UPDATED {UPDATED.toUpperCase()}</p>

      <p className="t-body mt-8 text-frost-1">
        Winter Arc has no accounts, no analytics and no servers holding your training data. Everything below describes
        what stays on your own device.
      </p>

      <nav aria-label="On this page" className="mt-8 border-y border-line-1 py-4">
        <ol className="space-y-1.5">
          {[
            ["what-is-stored", "What is stored"],
            ["where-it-lives", "Where it lives"],
            ["what-is-not-collected", "What is not collected"],
            ["your-control", "Export and deletion"],
            ["future-sync", "If sync is ever added"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="t-small text-frost-1 transition-none hov:text-ember">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="what-is-stored" className="mt-10">
        <h2 className="t-title text-frost-0">What is stored</h2>
        <ul className="mt-3 space-y-2">
          {[
            "Your Hunter profile: name, height, weights, body composition readings and targets.",
            "Your workout and diet plans, including every earlier version of them.",
            "Daily logs: which quests you cleared, weights and reps used, meals eaten, cardio and sleep entries.",
            "Weigh-ins, levels, streaks and badges derived from those logs.",
            "Interface preferences: skin, motion, sound, haptics and rest timer length.",
          ].map((t) => (
            <li key={t} className="t-body flex gap-3 text-frost-1">
              <span className="mt-2.5 h-1 w-1 shrink-0 bg-frost-2" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section id="where-it-lives" className="mt-10">
        <h2 className="t-title text-frost-0">Where it lives</h2>
        <p className="t-body mt-3 text-frost-1">
          In IndexedDB inside your browser, on the device you are using, under this site&apos;s origin. Preferences also
          use localStorage so the correct skin paints before the app loads. None of it is transmitted anywhere.
        </p>
      </section>

      <section id="what-is-not-collected" className="mt-10">
        <h2 className="t-title text-frost-0">What is not collected</h2>
        <p className="t-body mt-3 text-frost-1">
          No account, no email, no advertising identifiers, no analytics or telemetry, no cookies for tracking, and no
          third-party scripts that profile you. Fonts are self-hosted, so loading a page does not call out to a font
          provider.
        </p>
      </section>

      <section id="your-control" className="mt-10">
        <h2 className="t-title text-frost-0">Export and deletion</h2>
        <p className="t-body mt-3 text-frost-1">
          The System screen exports everything as a JSON file you keep, and imports one back. Reset arc erases every log
          on the device. Clearing site data in your browser removes all of it, including preferences. Because there is
          no server copy, deletion is immediate and final.
        </p>
      </section>

      <section id="future-sync" className="mt-10">
        <h2 className="t-title text-frost-0">If sync is ever added</h2>
        <p className="t-body mt-3 text-frost-1">
          A future version may offer optional sync so the same history is available on more than one device. It would be
          off by default, would require you to turn it on, and this page would be updated to say exactly what leaves the
          device before it shipped.
        </p>
      </section>
    </>
  );
}
