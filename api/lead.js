/**
 * Vercel Serverless Function: Antworten aus dem detaillierten Digitalisierungs-Check
 * Route: POST /api/lead
 *
 * Unabhaengig vom normalen Kontaktformular. Sendet die Check-Antworten plus
 * Name, E-Mail und optionaler Nachricht an dich.
 *
 * Keine Secrets im Code. Umgebungsvariablen (Vercel > Settings > Environment Variables):
 *   RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL
 *
 * Hinweis Sicherheit: Fuer den Produktivbetrieb hier ein Rate-Limit pro IP
 * ergaenzen (z. B. Vercel KV / Upstash).
 */

const MAX = { name: 120, email: 160, message: 1500 };

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

  // Honeypot
  if (body.website) return res.status(200).json({ ok: true });

  const name = (body.name || "").toString().trim().slice(0, MAX.name);
  const email = (body.email || "").toString().trim().slice(0, MAX.email);
  const message = (body.message || "").toString().trim().slice(0, MAX.message);
  const consent = body.consent === true || body.consent === "on" || body.consent === "true";
  const score = Number.isFinite(body.score) ? Math.round(body.score) : null;
  const answers = Array.isArray(body.answers) ? body.answers.slice(0, 30) : [];

  if (!name || !email) return res.status(400).json({ error: "Pflichtfelder fehlen." });
  if (!isEmail(email)) return res.status(400).json({ error: "E-Mail-Adresse ist ungueltig." });
  if (!consent) return res.status(400).json({ error: "Einwilligung fehlt." });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("Lead-Formular: Umgebungsvariablen fehlen.");
    return res.status(500).json({ error: "Versand momentan nicht moeglich." });
  }

  const answerRows = answers
    .map((a) => {
      const frage = escapeHtml((a && a.frage) || "");
      const antwort = escapeHtml((a && a.antwort) || "");
      return `<tr><td style="padding:4px 10px 4px 0;vertical-align:top;">${frage}</td><td style="padding:4px 0;"><strong>${antwort}</strong></td></tr>`;
    })
    .join("");

  const html = `
    <h2>Neuer Digitalisierungs-Check</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
    ${score !== null ? `<p><strong>Score:</strong> ${score} von 100</p>` : ""}
    ${message ? `<p><strong>Nachricht:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` : ""}
    <h3>Antworten</h3>
    <table>${answerRows}</table>
  `;

  try {
    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Digitalisierungs-Check von ${name}${score !== null ? ` (Score ${score})` : ""}`,
        html,
      }),
    });
    if (!resend.ok) {
      console.error("Resend-Fehler (lead):", resend.status);
      return res.status(502).json({ error: "Versand fehlgeschlagen." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Lead-Ausnahme:", err && err.message);
    return res.status(500).json({ error: "Unerwarteter Fehler." });
  }
}
