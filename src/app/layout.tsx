import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import { prefsScript } from "@/lib/prefs-script";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import "./globals.css";

/**
 * Absolute URLs for metadata. Vercel supplies the production domain and the
 * per-deployment URL; NEXT_PUBLIC_SITE_URL overrides both for a custom domain.
 */
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const martian = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-martian",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Winter Arc. The System for a ninety day arc.",
    template: "%s | Winter Arc",
  },
  description:
    "A local-first training and diet tracker styled as the System. Every set, meal and cardio session feeds your level, rank and streaks.",
  applicationName: "Winter Arc",
  appleWebApp: { capable: true, title: "Winter Arc", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0D0F" },
    { media: "(prefers-color-scheme: light)", color: "#E7EAE6" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-skin="permafrost"
      data-motion="full"
      data-rank="E"
      className={`${archivo.variable} ${martian.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsScript }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
