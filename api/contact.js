/**
 * Vercel Serverless Function: Kontaktformular
 * Route: POST /api/contact
 *
 * Sicherheit / Datenschutz:
 * - Keinerlei Schluessel im Code. Alles ueber Umgebungsvariablen (Vercel > Settings > Environment Variables):
 *     RESEND_API_KEY     : API-Key deines E-Mail-Dienstes (Resend)
 *     CONTACT_TO_EMAIL   : deine Zieladresse (wohin die Anfrage geht)
 *     CONTACT_FROM_EMAIL : verifizierte Absenderadresse deiner Domain
 * - Der Versand laeuft ueber Resend (EU-Region waehlbar). Kein Datenabfluss an Dritte im Frontend.
 */

const MAX = { name: 120, company: 160, email: 160, message: 2000 };

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: gefuellt = Bot. Wir antworten freundlich, versenden aber nichts.
  if (body.website) return res.status(200).json({ ok: true });

  const name = (body.name || "").toString().trim().slice(0, MAX.name);
  const company = (body.company || "").toString().trim().slice(0, MAX.company);
  const email = (body.email || "").toString().trim().slice(0, MAX.email);
  const message = (body.message || "").toString().trim().slice(0, MAX.message);
  const consent = body.consent === true || body.consent === "on" || body.consent === "true";

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Pflichtfelder fehlen." });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: "E-Mail-Adresse ist ungueltig." });
  }
  if (!consent) {
    return res.status(400).json({ error: "Einwilligung fehlt." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    // Fehlkonfiguration soll keine Details preisgeben.
    console.error("Kontaktformular: Umgebungsvariablen fehlen.");
    return res.status(500).json({ error: "Versand momentan nicht moeglich." });
  }

  const html = `
    <h2>Neue Anfrage ueber die Website</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Betrieb:</strong> ${escapeHtml(company || "-")}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
    <p><strong>Nachricht:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  try {
    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Website-Anfrage von ${name}`,
        html,
      }),
    });

    if (!resend.ok) {
      console.error("Resend-Fehler:", resend.status);
      return res.status(502).json({ error: "Versand fehlgeschlagen." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Kontaktformular-Ausnahme:", err && err.message);
    return res.status(500).json({ error: "Unerwarteter Fehler." });
  }
}
