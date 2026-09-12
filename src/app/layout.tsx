import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import { prefsScript } from "@/lib/prefs-script";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import "./globals.css";

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
  metadataBase: new URL("https://winter-arc.local"),
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
