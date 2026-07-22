/* Digitalisierungs-Check als Schritt-fuer-Schritt-Assistent.
   Auswertung im Browser, nichts wird gespeichert. Optionaler Website-Test
   laeuft serverseitig ueber /api/pagespeed, damit keine Besucher-IP an Google geht.
   Keine inline style-Attribute (CSP-konform): dynamische Breiten via CSSOM. */

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const card = document.getElementById("quiz-card");
  const stepBox = document.getElementById("quiz-step");
  const countEl = document.getElementById("quiz-count");
  const progress = document.getElementById("progress-fill");
  const backBtn = document.getElementById("back");
  const nextBtn = document.getElementById("next");
  const result = document.getElementById("check-result");
  if (!card || !stepBox || !nextBtn || !backBtn || !result) return;

  const questions = [
    {
      id: "erreichbarkeit", label: "Erreichbarkeit",
      text: "Wie oft bleibt Ihr Telefon unbeantwortet, wenn Kunden anrufen?",
      help: "Jeder unbeantwortete Anruf kann ein verlorener Auftrag sein.",
      options: [
        { label: "Fast nie, es geht immer jemand ran", value: 3 },
        { label: "Selten", value: 2 },
        { label: "Regelmäßig", value: 1 },
        { label: "Oft, gerade wenn viel los ist", value: 0 },
      ],
    },
    {
      id: "termine", label: "Termine",
      text: "Wie vereinbaren Kunden bei Ihnen Termine?",
      help: "Selbstbuchung spart Ihnen Telefonzeit und ist rund um die Uhr offen.",
      options: [
        { label: "Kunden buchen online selbst", value: 3 },
        { label: "Telefonisch und per E-Mail", value: 2 },
        { label: "Nur telefonisch", value: 1 },
      ],
    },
    {
      id: "website", label: "Website",
      text: "Wie ist Ihre Website aufgestellt?",
      help: "Eine aktuelle, schnelle Seite ist oft der erste Eindruck.",
      options: [
        { label: "Aktuell und schnell", value: 3 },
        { label: "Vorhanden, aber veraltet", value: 1 },
        { label: "Keine eigene Website", value: 0 },
      ],
    },
    {
      id: "google", label: "Google-Profil",
      text: "Ist Ihr Google-Unternehmensprofil vollständig und gepflegt?",
      help: "Fotos, Öffnungszeiten und aktuelle Infos entscheiden über die lokale Sichtbarkeit.",
      options: [
        { label: "Ja, vollständig", value: 3 },
        { label: "Nur teilweise", value: 1 },
        { label: "Nein oder weiß ich nicht", value: 0 },
      ],
    },
    {
      id: "bewertungen", label: "Bewertungen",
      text: "Sammeln Sie aktiv Google-Bewertungen?",
      help: "Bewertungen sind für lokale Betriebe einer der stärksten Vertrauensfaktoren.",
      options: [
        { label: "Ja, systematisch", value: 3 },
        { label: "Ab und zu", value: 1 },
        { label: "Nie", value: 0 },
      ],
    },
    {
      id: "automatisierung", label: "Automatisierung",
      text: "Wie viele wiederkehrende Aufgaben erledigen Sie von Hand?",
      help: "Rechnungen, Erinnerungen und Nachfragen lassen sich oft automatisieren.",
      options: [
        { label: "Wenig, vieles läuft automatisch", value: 3 },
        { label: "Einiges", value: 1 },
        { label: "Fast alles von Hand", value: 0 },
      ],
    },
  ];

  const recMap = {
    erreichbarkeit: { title: "Erreichbarkeit verbessern", text: "Wenn das Telefon oft unbeantwortet bleibt, verlieren Sie Aufträge. Eine automatische Annahme oder ein schneller Rückruf fängt das ab.", free: false },
    termine: { title: "Termine vereinfachen", text: "Eine Online-Terminbuchung nimmt Ihnen Telefonarbeit ab und ist rund um die Uhr erreichbar.", free: false },
    website: { title: "Website erneuern", text: "Ohne aktuelle, schnelle Seite verlieren Sie Interessenten. Eine schlanke, mobile Seite bringt Anfragen.", free: false },
    google: { title: "Google-Profil pflegen", text: "Ein vollständiges Profil mit Fotos und Öffnungszeiten bringt Sie in der lokalen Suche nach vorne. Das können Sie kostenlos selbst erledigen.", free: true },
    bewertungen: { title: "Bewertungen sammeln", text: "Bitten Sie aktiv um Google-Bewertungen, etwa mit einem Link oder QR-Code. Das kostet nichts und wirkt stark.", free: true },
    automatisierung: { title: "Abläufe automatisieren", text: "Wiederkehrende Aufgaben wie Rechnungen oder Erinnerungen lassen sich weitgehend automatisieren und sparen Zeit.", free: false },
    tempo: { title: "Website beschleunigen", text: "Ihre Seite lädt auf dem Handy langsam. Langsame Seiten verlieren Besucher, hier lohnt sich eine Optimierung.", free: false },
  };

  const TOTAL = questions.length + 1; // Fragen plus optionaler Website-Schritt
  const state = { step: 0, answers: {}, url: "" };

  const isUrlStep = () => state.step === questions.length;

  function setProgress() {
    const pct = Math.max(6, Math.round(((state.step + 1) / (TOTAL + 1)) * 100));
    progress.style.width = pct + "%";
  }

  function renderStep() {
    backBtn.hidden = state.step === 0;

    if (isUrlStep()) {
      countEl.textContent = "Fast geschafft: optionaler Website-Test";
      stepBox.innerHTML = `
        <h2 class="quiz-question">Möchten Sie Ihre Website kurz live prüfen lassen?</h2>
        <p class="quiz-help">Optional. Wir messen Ladezeit und Mobiltauglichkeit über Google. Ohne Eingabe geht es einfach weiter.</p>
        <div class="field">
          <label for="url">Website-Adresse</label>
          <input id="url" name="url" type="url" inputmode="url" placeholder="https://ihre-website.de" maxlength="200" value="${escapeAttr(state.url)}" />
        </div>`;
      nextBtn.textContent = "Auswerten";
      nextBtn.disabled = false;
      setProgress();
      return;
    }

    const q = questions[state.step];
    countEl.textContent = `Frage ${state.step + 1} von ${questions.length}`;
    stepBox.innerHTML = `
      <h2 class="quiz-question">${q.text}</h2>
      <p class="quiz-help">${q.help}</p>
      <div class="opt-list" role="radiogroup" aria-label="${escapeAttr(q.text)}">
        ${q.options
          .map(
            (o) => `
          <label class="opt-card">
            <input type="radio" name="${q.id}" value="${o.value}" ${state.answers[q.id] === o.value ? "checked" : ""} />
            <span class="opt-check" aria-hidden="true"></span>
            <span class="opt-label">${o.label}</span>
          </label>`
          )
          .join("")}
      </div>`;
    nextBtn.textContent = "Weiter";
    nextBtn.disabled = !(q.id in state.answers);

    stepBox.querySelectorAll('input[type="radio"]').forEach((inp) => {
      inp.addEventListener("change", () => {
        state.answers[q.id] = Number(inp.value);
        nextBtn.disabled = false;
      });
    });
    setProgress();
  }

  nextBtn.addEventListener("click", async () => {
    if (isUrlStep()) {
      const u = stepBox.querySelector("#url");
      state.url = u && u.value ? u.value.trim() : "";
      await showResult();
      return;
    }
    state.step += 1;
    renderStep();
  });

  backBtn.addEventListener("click", () => {
    if (state.step > 0) state.step -= 1;
    renderStep();
  });

  async function showResult() {
    let sum = 0;
    const cats = [];
    for (const q of questions) {
      const v = q.id in state.answers ? state.answers[q.id] : 0;
      sum += v;
      cats.push({ id: q.id, label: q.label, pct: Math.round((v / 3) * 100), value: v });
    }
    const score = Math.round((sum / (questions.length * 3)) * 100);

    let ps = null;
    if (state.url) {
      nextBtn.disabled = true;
      nextBtn.textContent = "Werte aus ...";
      ps = await fetchPageSpeed(state.url);
    }

    // Empfehlungen aus Luecken plus optional Tempo
    const recs = [];
    for (const c of cats) {
      if (c.value <= 1) {
        const r = recMap[c.id];
        recs.push({ ...r, prio: c.value === 0 ? "Hoch" : "Mittel" });
      }
    }
    if (ps && ps.ok && typeof ps.performance === "number" && ps.performance < 60) {
      recs.push({ ...recMap.tempo, prio: ps.performance < 40 ? "Hoch" : "Mittel" });
    }
    recs.sort((a, b) => (a.prio === b.prio ? 0 : a.prio === "Hoch" ? -1 : 1));
    const topRecs = recs.slice(0, 4);

    const barCats = cats.slice();
    if (ps && ps.ok && typeof ps.performance === "number") {
      barCats.push({ label: "Website-Tempo", pct: ps.performance });
    }

    const band = scoreBand(score);
    const c = 2 * Math.PI * 54;
    const offset = c * (1 - score / 100);
    const psNote = state.url && !(ps && ps.ok)
      ? '<p class="ps-note">Die Live-Prüfung Ihrer Website war gerade nicht möglich. Ihr übriges Ergebnis sehen Sie unten.</p>'
      : "";

    result.innerHTML = `
      <div class="result-head">
        <div class="gauge">
          <svg viewBox="0 0 120 120" role="img" aria-label="Digitalisierungs-Score ${score} von 100">
            <circle class="gauge-track" cx="60" cy="60" r="54"></circle>
            <circle class="gauge-val" cx="60" cy="60" r="54" stroke="${band.color}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" transform="rotate(-90 60 60)"></circle>
          </svg>
          <div class="gauge-center"><span class="gauge-num">${score}</span><span class="gauge-of">von 100</span></div>
        </div>
        <div>
          <p class="score-word">${band.word}</p>
          <p class="score-sub">${band.sub}</p>
        </div>
      </div>
      ${psNote}
      <p class="block-title">Ihre Bereiche im Überblick</p>
      <div class="cat-list">
        ${barCats
          .map(
            (b) => `
          <div class="cat-row">
            <span class="cat-label">${b.label}</span>
            <span class="cat-track"><span class="cat-fill ${zoneClass(b.pct)}" data-pct="${b.pct}"></span></span>
          </div>`
          )
          .join("")}
      </div>

      <p class="block-title">Ihre wichtigsten Hebel</p>
      ${
        topRecs.length
          ? `<div class="recs">${topRecs
              .map(
                (r) => `
        <div class="rec-card">
          <div class="rec-top">
            <span class="rec-badge prio-${r.prio.toLowerCase()}">Priorität ${r.prio}</span>
            ${r.free ? '<span class="rec-free">kostenlos selbst machbar</span>' : ""}
          </div>
          <p class="rec-title">${r.title}</p>
          <p class="rec-text">${r.text}</p>
        </div>`
              )
              .join("")}</div>`
          : `<p class="rec-text">Starkes Ergebnis. Hier ist wenig zu tun, ein Blick auf Feinheiten lohnt sich trotzdem.</p>`
      }

      <a class="btn btn-primary result-cta cta-space" href="index.html#kontakt">Kostenloses Erstgespräch vereinbaren</a>
      <div><button type="button" class="restart" id="restart">Check neu starten</button></div>
    `;

    card.hidden = true;
    result.hidden = false;

    // Balken und Gauge fuellen (CSSOM statt inline style-Attribut, CSP-konform).
    // Direkt gesetzt, damit es auch ohne sichtbares Rendern zuverlaessig greift.
    result.querySelectorAll(".cat-fill").forEach((el) => {
      const pct = Number(el.getAttribute("data-pct")) || 0;
      el.style.width = pct + "%";
    });
    const gaugeVal = result.querySelector(".gauge-val");
    if (gaugeVal) gaugeVal.setAttribute("stroke-dashoffset", offset.toFixed(1));

    const restart = document.getElementById("restart");
    if (restart) restart.addEventListener("click", resetCheck);

    progress.style.width = "100%";
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetCheck() {
    state.step = 0;
    state.answers = {};
    state.url = "";
    result.hidden = true;
    card.hidden = false;
    renderStep();
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scoreBand(score) {
    if (score < 40) return { word: "Deutlich ausbaufähig", sub: "Hier liegt viel Potenzial. Schon zwei, drei Schritte machen einen spürbaren Unterschied.", color: "#9c3b2e" };
    if (score < 70) return { word: "Solide Basis mit Lücken", sub: "Ein gutes Fundament. An einigen Stellen lassen Sie aber Umsatz oder Zeit liegen.", color: "#b5842e" };
    return { word: "Digital gut aufgestellt", sub: "Starke Grundlage. Jetzt geht es vor allem um Feinschliff.", color: "#1f3d2f" };
  }

  function zoneClass(pct) {
    return pct >= 60 ? "is-high" : pct >= 30 ? "is-mid" : "is-low";
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

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  renderStep();
});
