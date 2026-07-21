/* Digitalisierungs-Check
   Reine Auswertung im Browser. Kein Speichern. Optionaler Website-Test
   laeuft serverseitig ueber /api/pagespeed, damit keine Besucher-IP an Google geht. */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("check-form");
  const result = document.getElementById("check-result");
  const btn = document.getElementById("check-submit");
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  if (!form || !result || !btn) return;

  // Pro Frage: Schwelle "low" (bis zu diesem Punktwert gilt es als Luecke) plus Empfehlung.
  const questions = [
    { id: "erreichbarkeit", low: 1, free: false,
      rec: "Erreichbarkeit: Wenn das Telefon oft unbeantwortet bleibt, verlieren Sie Auftraege. Eine automatische Annahme oder ein schneller Rueckruf faengt das ab." },
    { id: "termine", low: 1, free: false,
      rec: "Termine: Eine Online-Terminbuchung nimmt Ihnen Telefonarbeit ab und ist rund um die Uhr erreichbar." },
    { id: "website", low: 1, free: false,
      rec: "Website: Ohne aktuelle, schnelle Seite verlieren Sie Interessenten. Eine schlanke, mobile Seite bringt Anfragen." },
    { id: "google", low: 1, free: true,
      rec: "Google-Profil: Ein vollstaendiges Profil mit Fotos und Oeffnungszeiten bringt Sie in der lokalen Suche nach vorne. Das koennen Sie kostenlos selbst pflegen." },
    { id: "bewertungen", low: 1, free: true,
      rec: "Bewertungen: Bitten Sie aktiv um Google-Bewertungen, zum Beispiel mit einem Link oder QR-Code. Das kostet nichts und wirkt stark." },
    { id: "automatisierung", low: 1, free: false,
      rec: "Automatisierung: Wiederkehrende Aufgaben wie Rechnungen oder Erinnerungen lassen sich weitgehend automatisieren und sparen Zeit." },
  ];

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    let sum = 0;
    const max = questions.length * 3;
    const gaps = [];
    for (const q of questions) {
      const sel = form.querySelector(`input[name="${q.id}"]:checked`);
      const val = sel ? Number(sel.value) : 0;
      sum += val;
      if (val <= q.low) gaps.push(q);
    }
    const score = Math.round((sum / max) * 100);

    const url = form.querySelector("#url").value.trim();
    let ps = null;
    if (url) {
      btn.disabled = true;
      btn.textContent = "Prüfe Ihre Website ...";
      ps = await fetchPageSpeed(url);
      btn.disabled = false;
      btn.textContent = "Auswerten";
    }

    render(score, gaps, ps);
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function label(score) {
    if (score < 40) return "Deutlich ausbaufähig";
    if (score < 70) return "Solide Basis, klare Lücken";
    return "Digital gut aufgestellt";
  }

  function render(score, gaps, ps) {
    const recItems = [];

    if (ps && ps.ok && typeof ps.performance === "number" && ps.performance < 50) {
      recItems.push({
        text: `Website-Tempo: Ihre Seite lädt auf dem Handy langsam (${ps.performance} von 100). Langsame Seiten verlieren Besucher, hier lohnt sich eine Optimierung.`,
        free: false,
      });
    }
    for (const q of gaps) recItems.push({ text: q.rec, free: q.free });

    const top = recItems.slice(0, 4);

    let psLine = "";
    if (ps && ps.ok && typeof ps.performance === "number") {
      psLine = `<p class="ps-line">Live-Prüfung Ihrer Website (mobiles Tempo): <strong>${ps.performance} von 100</strong></p>`;
    } else if (ps && !ps.ok) {
      psLine = `<p class="ps-line">Die Website-Prüfung war gerade nicht möglich. Das ändert nichts an Ihrem Ergebnis unten.</p>`;
    }

    const recsHtml = top.length
      ? `<h3 class="card-title">Ihre wichtigsten Hebel</h3>
         <div class="rec-list">${top
           .map(
             (r) =>
               `<p class="rec-item">${escapeHtml(r.text)}${
                 r.free ? '<span class="rec-free">kostenlos selbst machbar</span>' : ""
               }</p>`
           )
           .join("")}</div>`
      : `<p class="rec-item">Starkes Ergebnis. Hier ist wenig zu tun, ein kurzer Blick auf Feinheiten lohnt sich trotzdem.</p>`;

    result.innerHTML = `
      <p class="score-num">${score}<span style="font-size:1.5rem">/100</span></p>
      <p class="score-label">${label(score)}</p>
      ${psLine}
      ${recsHtml}
      <a class="btn btn-primary" href="index.html#kontakt" style="margin-top:1.5rem">Kostenloses Erstgespräch vereinbaren</a>
      <p class="disclaimer">Diese Auswertung ist eine Orientierung ohne Gewähr und ersetzt keine Rechts- oder Steuerberatung.</p>
    `;
  }

  async function fetchPageSpeed(url) {
    try {
      const res = await fetch("/api/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return { ok: false };
      return await res.json();
    } catch (err) {
      return { ok: false };
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
});
