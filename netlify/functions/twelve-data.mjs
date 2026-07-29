const ALLOWED_ENDPOINTS = new Set(["quote", "symbol_search"]);

/** Same-origin Twelve Data proxy: keeps TWELVE_DATA_API_KEY out of the browser bundle. */
export default async (request) => {
  const token = process.env.TWELVE_DATA_API_KEY;
  if (!token) {
    return Response.json(
      { error: "Twelve Data API key is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const incoming = new URL(request.url);
  const endpoint = incoming.pathname.split("/").filter(Boolean).pop();
  if (!endpoint || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return Response.json({ error: "Unsupported Twelve Data endpoint" }, { status: 404 });
  }

  const upstream = new URL(`https://api.twelvedata.com/${endpoint}`);
  incoming.searchParams.forEach((value, key) => {
    if (key !== "apikey") upstream.searchParams.set(key, value);
  });

  const response = await fetch(upstream, {
    headers: { Authorization: `apikey ${token}` },
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, max-age=60",
    },
  });
};
