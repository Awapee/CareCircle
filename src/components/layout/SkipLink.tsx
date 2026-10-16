/** Lets keyboard and screen-reader users jump past the navigation. Visible only when focused. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Skip to main content
    </a>
  );
}
