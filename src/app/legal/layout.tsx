import Link from "next/link";

export default function LegalLayout({ children }: LayoutProps<"/legal">) {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-12">
      <Link href="/" className="t-micro text-frost-2 transition-none hov:text-frost-0">
        WINTER ARC
      </Link>
      <article className="mt-8 max-w-[68ch]">{children}</article>
      <footer className="mt-16 flex gap-6 border-t border-line-1 pt-6">
        <Link href="/legal/terms" className="t-micro text-frost-2 transition-none hov:text-frost-0">
          TERMS
        </Link>
        <Link href="/legal/privacy" className="t-micro text-frost-2 transition-none hov:text-frost-0">
          PRIVACY
        </Link>
      </footer>
    </div>
  );
}
