import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const JSON_HEADERS = { "Content-Type": "application/json" };
const DEFAULT_GROUP = "testers";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function initAdmin(): App | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const cred = JSON.parse(raw);
    if (getApps().length) return getApps()[0]!;
    return initializeApp({ credential: cert(cred) });
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", err);
    return null;
  }
}

function projectIdFromApp(app: App): string {
  const fromOptions = app.options.projectId;
  if (fromOptions) return fromOptions;
  try {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
    return String(cred.project_id || "");
  } catch {
    return "";
  }
}

async function getAccessToken(app: App): Promise<string> {
  const credential = app.options.credential;
  if (!credential?.getAccessToken) {
    throw new Error("Service account cannot mint an access token.");
  }
  const token = await credential.getAccessToken();
  if (!token?.access_token) {
    throw new Error("Failed to obtain Google access token.");
  }
  return token.access_token;
}

async function appDistributionRequest(
  accessToken: string,
  url: string,
  body: unknown
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  return { ok: res.ok, status: res.status, payload };
}

export default async (req: Request) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405, cors);
  }

  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = String(body.email || "")
      .trim()
      .toLowerCase();
  } catch {
    return json({ success: false, message: "Invalid JSON body." }, 400);
  }

  if (!EMAIL_RE.test(email)) {
    return json({ success: false, message: "Enter a valid email address." }, 400);
  }

  const app = initAdmin();
  if (!app) {
    return json(
      {
        success: false,
        message:
          "Tester invites are not configured on the server. Use the Firebase tester page instead.",
      },
      503
    );
  }

  const db = getFirestore(app);
  const [settingsSnap, releaseSnap] = await Promise.all([
    db.collection("system_settings").doc("global").get(),
    db.collection("system_settings").doc("latest_release").get(),
  ]);
  const settings = settingsSnap.data() || {};
  const release = releaseSnap.data() || {};
  const testerUrl =
    (typeof release.testerUrl === "string" && release.testerUrl) ||
    (typeof settings.appDistributionInviteUrl === "string" && settings.appDistributionInviteUrl) ||
    "";
  const downloadUrl = typeof release.downloadUrl === "string" ? release.downloadUrl : "";

  try {
    const accessToken = await getAccessToken(app);
    const projectId = projectIdFromApp(app);
    if (!projectId) {
      throw new Error("Missing Firebase project id on the service account.");
    }

    const group = process.env.FIREBASE_APP_DISTRIBUTION_GROUP || DEFAULT_GROUP;
    const addUrl = `https://firebaseappdistribution.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/testers:batchAdd`;
    const joinUrl = `https://firebaseappdistribution.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/groups/${encodeURIComponent(group)}:batchJoin`;

    const added = await appDistributionRequest(accessToken, addUrl, { emails: [email] });
    if (!added.ok && added.status !== 409) {
      const apiMessage =
        added.payload?.error?.message ||
        "Firebase could not add this email as a tester. Open the tester page instead.";
      console.error("App Distribution testers:batchAdd failed", added.status, added.payload);
      return json(
        { success: false, message: apiMessage, testerUrl, downloadUrl },
        added.status >= 400 && added.status < 600 ? added.status : 502
      );
    }

    const joined = await appDistributionRequest(accessToken, joinUrl, { emails: [email] });
    if (!joined.ok && joined.status !== 409) {
      console.error("App Distribution groups:batchJoin failed", joined.status, joined.payload);
      // Tester was created; they may still need to accept the email invite.
    }

    return json({
      success: true,
      alreadyInvited: added.status === 409,
      testerUrl,
      downloadUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invite failed.";
    console.error("app-distribution-invite error", err);
    return json(
      {
        success: false,
        message: `${message} You can still join from the Firebase tester page.`,
        testerUrl,
        downloadUrl,
      },
      502
    );
  }
};
