import https from "node:https";
import dns from "node:dns/promises";

export type Ipv4Response = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
};

/**
 * HTTPS GET forced over IPv4.
 * Avoids hangs when a host has broken IPv6 (common with api.mfapi.in on Windows/Node).
 */
export async function ipv4Fetch(
  urlString: string,
  init: { signal?: AbortSignal } = {}
): Promise<Ipv4Response> {
  const url = new URL(urlString);
  const { address } = await dns.lookup(url.hostname, { family: 4 });

  if (init.signal?.aborted) {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  }

  const { status, body } = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: address,
        servername: url.hostname,
        port: Number(url.port) || 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          Host: url.hostname,
          Accept: "application/json",
          "User-Agent": "expense-tracker/1.0",
          Connection: "close",
        },
        timeout: 20_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    const onAbort = () => {
      req.destroy();
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      reject(err);
    };
    if (init.signal) {
      init.signal.addEventListener("abort", onAbort, { once: true });
    }

    req.on("timeout", () => {
      req.destroy();
      const err = new Error("Request timed out");
      err.name = "AbortError";
      reject(err);
    });
    req.on("error", reject);
    req.end();
  });

  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}
