/*
 * "Welcome back" plays once per sign-in, not once per page load. Sign-in adds
 * this marker to where it sends the Hunter; the app shell plays the sequence
 * when it sees the marker, then removes it, so a reload or a shared link does
 * not replay it.
 */

export const WELCOME_PARAM = "welcome";

/** `path` with the sign-in marker added, keeping any query it already has. */
export function withWelcome(path: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.set(WELCOME_PARAM, "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The current address without the marker. */
export function withoutWelcome(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(WELCOME_PARAM);
  const rest = params.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}

export function hasWelcome(search: string): boolean {
  return new URLSearchParams(search).get(WELCOME_PARAM) === "1";
}
