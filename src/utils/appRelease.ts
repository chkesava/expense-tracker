/**
 * Shape of `system_settings/latest_release`, written by the Android release
 * workflow. Shared with the mobile app so the web shutdown page can offer
 * the same APK + Firebase App Distribution tester link.
 */

export type AppRelease = {
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  storagePath?: string;
  testerUrl?: string;
  notes: string;
  mandatory: boolean;
  apkFileName?: string;
  publishedAt?: string;
  contentLength?: number;
  sha256?: string;
};

export const LATEST_RELEASE_DOC = ["system_settings", "latest_release"] as const;

export function parseRelease(
  data: Record<string, unknown> | undefined
): AppRelease | null {
  if (!data) return null;

  const versionCode = Number(data.versionCode);
  const downloadUrl = typeof data.downloadUrl === "string" ? data.downloadUrl.trim() : "";
  const storagePath = typeof data.storagePath === "string" ? data.storagePath.trim() : "";
  const testerUrl = typeof data.testerUrl === "string" ? data.testerUrl.trim() : "";

  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    if (!downloadUrl && !testerUrl && !storagePath) return null;
  }

  if (!downloadUrl && !storagePath && !testerUrl) return null;

  const contentLength = Number(data.contentLength);

  return {
    versionName: typeof data.versionName === "string" ? data.versionName : "",
    versionCode: Number.isInteger(versionCode) && versionCode > 0 ? versionCode : 0,
    downloadUrl,
    storagePath: storagePath || undefined,
    testerUrl: testerUrl || undefined,
    notes: typeof data.notes === "string" ? data.notes : "",
    mandatory: data.mandatory === true,
    apkFileName: typeof data.apkFileName === "string" ? data.apkFileName : undefined,
    publishedAt: typeof data.publishedAt === "string" ? data.publishedAt : undefined,
    contentLength: Number.isFinite(contentLength) && contentLength > 0 ? contentLength : undefined,
    sha256: typeof data.sha256 === "string" ? data.sha256 : undefined,
  };
}

export function isTesterWebpageUrl(url: string): boolean {
  return (
    url.includes("appdistribution.firebase") ||
    url.includes("console.firebase.google.com")
  );
}

export function isLikelyApkUrl(url: string): boolean {
  if (!url) return false;
  if (isTesterWebpageUrl(url)) return false;
  return /\.apk(\?|#|$)/i.test(url) || url.includes("releases/download/");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(normalizeEmail(value));
}
