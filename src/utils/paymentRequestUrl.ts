/**
 * Public proxy URL for the hosted payment page (QR + amount).
 * Set VITE_PUBLIC_APP_URL in production (e.g. https://kesavaexpensetracking.netlify.app).
 */
export function getPublicAppOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getPaymentRequestShareUrl(slug: string): string {
  return `${getPublicAppOrigin()}/payment/${slug}`;
}
