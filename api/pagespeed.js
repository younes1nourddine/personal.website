/**
 * Vercel Serverless Function: Website-Tempo pruefen
 * Route: POST /api/pagespeed  Body: { "url": "https://..." }
 *
 * Ruft die Google PageSpeed Insights API serverseitig auf. Dadurch wird die
 * Besucher-IP NICHT an Google uebermittelt, nur die eingegebene Website-Adresse.
 *
 * Optionaler Umgebungsschluessel (kein Secret im Code):
 *   PAGESPEED_API_KEY  erhoeht das Kontingent, ist aber nicht zwingend.
 *
 * Hinweis Sicherheit: Fuer den Produktivbetrieb sollte hier ein Rate-Limit
 * pro IP ergaenzt werden (z. B. ueber Vercel KV / Upstash), um Missbrauch zu
 * begrenzen. Google-seitiges Kontingent dient bis dahin als Notbremse.
 */

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const url = (body.url || "").toString().trim().slice(0, 300);
  if (!url || !isHttpUrl(url)) {
    return res.status(400).json({ ok: false, error: "Ungueltige URL." });
  }

  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  if (process.env.PAGESPEED_API_KEY) params.set("key", process.env.PAGESPEED_API_KEY);

  try {
    const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
    const r = await fetch(api);
    if (!r.ok) return res.status(200).json({ ok: false });

    const data = await r.json();
    const raw = data &&
      data.lighthouseResult &&
      data.lighthouseResult.categories &&
      data.lighthouseResult.categories.performance &&
      data.lighthouseResult.categories.performance.score;

    if (typeof raw !== "number") return res.status(200).json({ ok: false });

    return res.status(200).json({ ok: true, performance: Math.round(raw * 100) });
  } catch (err) {
    console.error("PageSpeed-Fehler:", err && err.message);
    return res.status(200).json({ ok: false });
  }
}
