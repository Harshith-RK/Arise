import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Winter Arc stores, where it lives, and how to delete it.",
};

const UPDATED = "13 September 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1 className="t-display-2 text-frost-0">Privacy</h1>
      <p className="t-micro mt-2 text-frost-2">LAST UPDATED {UPDATED.toUpperCase()}</p>

      <p className="t-body mt-8 text-frost-1">
        Winter Arc works two ways. Without an account it runs entirely in your browser and nothing is transmitted
        anywhere. If you create an account, the same data is also stored on our server so it follows you between
        devices, readable by you and nobody else. Either way there is no analytics, no tracking and no advertising.
      </p>

      <nav aria-label="On this page" className="mt-8 border-y border-line-1 py-4">
        <ol className="space-y-1.5">
          {[
            ["what-is-stored", "What is stored"],
            ["where-it-lives", "Where it lives"],
            ["what-is-not-collected", "What is not collected"],
            ["your-account", "Your account and sync"],
            ["your-control", "Export and deletion"],
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
          Always in IndexedDB inside your browser, on the device you are using, under this site&apos;s origin.
          Preferences also use localStorage so the correct skin paints before the app loads. If you are signed in, a
          copy is also held in our database, hosted by Supabase, where each row is tied to your account and access
          rules make it unreadable by any other account. Signed out, none of it is transmitted anywhere.
        </p>
      </section>

      <section id="what-is-not-collected" className="mt-10">
        <h2 className="t-title text-frost-0">What is not collected</h2>
        <p className="t-body mt-3 text-frost-1">
          No advertising identifiers, no analytics or telemetry, no cookies for tracking, and no third-party scripts
          that profile you. Fonts are self-hosted, so loading a page does not call out to a font provider. An account
          stores your email address and nothing else about you; using the app without one stores no email at all.
        </p>
      </section>

      <section id="your-account" className="mt-10">
        <h2 className="t-title text-frost-0">Your account and sync</h2>
        <p className="t-body mt-3 text-frost-1">
          An account is optional. Creating one with an email and password, or with Google, stores your email address so
          you can sign back in. Signing in with Google shares your email address with us; it does not give us access to
          anything else in your Google account.
        </p>
        <p className="t-body mt-3 text-frost-1">
          While signed in, your arc is written to both this device and your account, and changes appear live on any
          other device where you are signed in. If you already had an arc on a device when you first signed in, it is
          adopted into the account rather than discarded.
        </p>
        <p className="t-body mt-3 text-frost-1">
          Sign out and the app returns to device-only storage. Your account copy is kept until you delete it.
        </p>
      </section>

      <section id="your-control" className="mt-10">
        <h2 className="t-title text-frost-0">Export and deletion</h2>
        <p className="t-body mt-3 text-frost-1">
          The System screen exports everything as a JSON file you keep, and imports one back. Reset arc erases every
          log, on this device and, if you are signed in, on your account. Clearing site data in your browser removes
          the local copy including preferences. To remove the account copy and the email attached to it, reset the arc
          while signed in and then ask us to delete the account; both are permanent.
        </p>
      </section>

    </>
  );
}
