import { matchPath } from "react-router-dom";

/** Resolve slug from route params or pathname (public pages render outside nested Routes). */
export function getPaymentSlugFromLocation(pathname: string, paramSlug?: string): string | undefined {
  if (paramSlug) return paramSlug;
  const payment = matchPath({ path: "/payment/:slug", end: true }, pathname);
  if (payment?.params.slug) return payment.params.slug;
  const legacy = matchPath({ path: "/pay/:slug", end: true }, pathname);
  if (legacy?.params.slug) return legacy.params.slug;
  return undefined;
}
