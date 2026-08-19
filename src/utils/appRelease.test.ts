import { describe, expect, it } from "vitest";
import {
  isLikelyApkUrl,
  isTesterWebpageUrl,
  isValidEmail,
  normalizeEmail,
  parseRelease,
} from "./appRelease";

describe("parseRelease", () => {
  it("parses a GitHub + App Distribution release", () => {
    const release = parseRelease({
      versionName: "2.1.1",
      versionCode: 41,
      downloadUrl:
        "https://github.com/chkesava/expense-tracker-mobile-application-/releases/download/android-v2.1.1-41/Spendly-2.1.1-41.apk",
      testerUrl: "https://appdistribution.firebase.dev/i/abc",
      notes: "In-app updates",
      mandatory: false,
    });

    expect(release).toMatchObject({
      versionName: "2.1.1",
      versionCode: 41,
      testerUrl: "https://appdistribution.firebase.dev/i/abc",
    });
  });

  it("accepts a tester-only invite when no APK is published yet", () => {
    const release = parseRelease({
      testerUrl: "https://appdistribution.firebase.dev/i/abc",
    });
    expect(release?.testerUrl).toBe("https://appdistribution.firebase.dev/i/abc");
  });

  it("rejects a doc with no download pointers", () => {
    expect(parseRelease({ notes: "hi" })).toBeNull();
  });
});

describe("isTesterWebpageUrl", () => {
  it("detects App Distribution links", () => {
    expect(isTesterWebpageUrl("https://appdistribution.firebase.dev/i/abc")).toBe(true);
    expect(
      isTesterWebpageUrl("https://console.firebase.google.com/project/x/appdistribution")
    ).toBe(true);
    expect(
      isTesterWebpageUrl(
        "https://github.com/chkesava/expense-tracker-mobile-application-/releases/download/android-v2.2.1-42/Spendly-2.2.1-42.apk"
      )
    ).toBe(false);
  });
});

describe("isLikelyApkUrl", () => {
  it("accepts GitHub release APKs and rejects tester webpages", () => {
    expect(
      isLikelyApkUrl(
        "https://github.com/org/repo/releases/download/android-v2.2.1-42/Spendly-2.2.1-42.apk"
      )
    ).toBe(true);
    expect(isLikelyApkUrl("https://appdistribution.firebase.dev/i/abc")).toBe(false);
  });
});

describe("email helpers", () => {
  it("normalizes and validates emails", () => {
    expect(normalizeEmail("  Ada@Example.com ")).toBe("ada@example.com");
    expect(isValidEmail("ada@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});
