/**
 * Vercel Serverless Function: Demo eines KI-Assistenten
 * Route: POST /api/assistant  Body: { branch, messages: [{role, content}] }
 *
 * Anbieter-neutral. Der Anbieter wird per Umgebungsvariable gewaehlt,
 * damit du dich erst spaeter festlegen musst. Keine Schluessel im Code.
 *
 *   AI_PROVIDER = "openai" | "cloudflare" | "anthropic"
 *
 *   openai     (deckt Mistral, Groq, OpenRouter, Together, DeepInfra ...):
 *     AI_BASE_URL   z. B. https://api.mistral.ai/v1  oder  https://api.groq.com/openai/v1
 *     AI_API_KEY
 *     AI_MODEL
 *
 *   cloudflare (Workers AI, kostenloses Tageskontingent):
 *     CF_ACCOUNT_ID
 *     CF_API_TOKEN
 *     AI_MODEL      z. B. @cf/meta/llama-3.1-8b-instruct
 *
 *   anthropic  (Claude):
 *     ANTHROPIC_API_KEY
 *     AI_MODEL      z. B. claude-haiku-4-5
 *     ANTHROPIC_DISABLE_THINKING = "true"   optional, sinnvoll bei claude-sonnet-5
 *
 * Schutz: Eingabelaenge, Verlaufslaenge, kurze Antworten, einfaches Rate-Limit.
 */

const MAX_INPUT = 500;
const MAX_HISTORY = 8;
const MAX_OUTPUT_TOKENS = 300;

// Einfaches Rate-Limit im Arbeitsspeicher. Best effort: bei einem Kaltstart
// beginnt die Zaehlung neu. Fuer harten Schutz spaeter Vercel KV / Upstash.
const HITS = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 15;

function rateLimited(ip) {
  const now = Date.now();
  const entry = HITS.get(ip) || [];
  const recent = entry.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 500) HITS.clear(); // simple Notbremse gegen Speicherwachstum
  return recent.length > MAX_HITS;
}

const BRANCHES = {
  werkstatt: "eine Kfz-Werkstatt (Inspektion, Ölwechsel, Reifen, Hauptuntersuchung, Bremsen)",
  friseur: "einen Friseursalon (Schnitt, Farbe, Styling, Terminvergabe)",
  fahrschule: "eine Fahrschule (Anmeldung, Fahrstunden, Theorie, Prüfungstermine)",
  handwerk: "einen Handwerksbetrieb (Angebote, Termine vor Ort, Notfälle)",
  sonstiges: "einen lokalen Dienstleistungsbetrieb",
};

function systemPrompt(branchKey) {
  const branch = BRANCHES[branchKey] || BRANCHES.sonstiges;
  return [
    `Du bist eine freundliche Telefon- und Empfangsassistenz für ${branch} in Deutschland.`,
    "Das hier ist eine öffentliche Demo auf der Website von Younes Nourddine.",
    "Regeln:",
    "1. Antworte immer auf Deutsch, höflich, in maximal drei kurzen Sätzen.",
    "2. Du nimmst Anliegen entgegen, erklärst Abläufe und schlägst Terminmöglichkeiten vor.",
    "3. Erfinde niemals verbindliche Preise, Termine oder Zusagen. Sage stattdessen, dass ein Mitarbeiter das bestätigt.",
    "4. Bei Themen außerhalb dieses Betriebs lehne freundlich ab und biete an, das Anliegen weiterzuleiten.",
    "5. Gib keine medizinischen, rechtlichen oder steuerlichen Auskünfte.",
    "6. Wenn jemand nach dir fragt: Du bist eine Demo eines KI-Assistenten und kannst Fehler machen.",
  ].join("\n");
}

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, MAX_INPUT);
}

async function callOpenAICompatible(system, messages) {
  const base = (process.env.AI_BASE_URL || "").replace(/\/+$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || null;
}

async function callCloudflare(system, messages) {
  const account = process.env.CF_ACCOUNT_ID;
  const model = process.env.AI_MODEL;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.result?.response || null;
}

async function callAnthropic(system, messages) {
  // Hinweis: temperature/top_p werden von Opus 4.8, Opus 4.7, Sonnet 5 und
  // Fable 5 mit 400 abgelehnt. Deshalb senden wir sie bewusst nicht.
  const body = {
    model: process.env.AI_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system,
    messages,
  };
  // Sinnvoll bei claude-sonnet-5, das sonst adaptives Denken nutzt (langsamer).
  if (process.env.ANTHROPIC_DISABLE_THINKING === "true") {
    body.thinking = { type: "disabled" };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const block = Array.isArray(data?.content) ? data.content.find((b) => b.type === "text") : null;
  return block ? block.text : null;
}

function providerConfigured(provider) {
  if (provider === "openai") return !!(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL);
  if (provider === "cloudflare") return !!(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN && process.env.AI_MODEL);
  if (process.env.AI_PROVIDER === "anthropic" || provider === "anthropic")
    return !!(process.env.ANTHROPIC_API_KEY && process.env.AI_MODEL);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, reason: "rate_limited" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const branch = typeof body.branch === "string" ? body.branch : "sonstiges";
  const incoming = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: clean(m.content) }))
    .filter((m) => m.content.length > 0);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ ok: false, error: "Keine gueltige Nachricht." });
  }

  const provider = process.env.AI_PROVIDER || "openai";
  if (!providerConfigured(provider)) {
    return res.status(503).json({ ok: false, reason: "not_configured" });
  }

  try {
    const system = systemPrompt(branch);
    let reply = null;
    if (provider === "cloudflare") reply = await callCloudflare(system, messages);
    else if (provider === "anthropic") reply = await callAnthropic(system, messages);
    else reply = await callOpenAICompatible(system, messages);

    if (!reply) return res.status(502).json({ ok: false, reason: "upstream" });
    return res.status(200).json({ ok: true, reply: String(reply).trim() });
  } catch (err) {
    console.error("Assistent-Fehler:", err && err.message);
    return res.status(500).json({ ok: false, reason: "error" });
  }
}
