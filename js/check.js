/* Digitalisierungs-Check: Schnell-Check (6 Fragen) und Detaillierter Check (12 Fragen).
   Auswertung im Browser, nichts wird gespeichert. Optionaler Website-Test laeuft
   serverseitig ueber /api/pagespeed. Der detaillierte Check kann die Antworten
   ueber /api/lead an Younes senden (unabhaengig vom normalen Kontaktformular).
   Keine inline style-Attribute (CSP-konform): dynamische Werte via CSSOM. */

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
  const modeQuick = document.getElementById("mode-quick");
  const modeDeep = document.getElementById("mode-deep");
  if (!card || !stepBox || !nextBtn || !backBtn || !result) return;

  const categories = [
    { id: "erreichbarkeit", label: "Erreichbarkeit" },
    { id: "termine", label: "Termine" },
    { id: "website", label: "Website" },
    { id: "google", label: "Google-Profil" },
    { id: "bewertungen", label: "Bewertungen" },
    { id: "automatisierung", label: "Automatisierung" },
  ];

  // Einzelfragen, jeweils einer Kategorie zugeordnet.
  const Q = {
    e1: { key: "e1", cat: "erreichbarkeit", text: "Wie oft bleibt Ihr Telefon unbeantwortet, wenn Kunden anrufen?", help: "Jeder unbeantwortete Anruf kann ein verlorener Auftrag sein.",
      options: [{ label: "Fast nie, es geht immer jemand ran", value: 3 }, { label: "Selten", value: 2 }, { label: "Regelmäßig", value: 1 }, { label: "Oft, gerade wenn viel los ist", value: 0 }] },
    e2: { key: "e2", cat: "erreichbarkeit", text: "Was passiert mit einem Anruf, den niemand annimmt?", help: "Ein zuverlässiger Rückruf rettet viele verlorene Kontakte.",
      options: [{ label: "Der Anrufer bekommt zuverlässig einen Rückruf", value: 3 }, { label: "Manchmal ein Rückruf", value: 1 }, { label: "Meist passiert nichts", value: 0 }] },
    t1: { key: "t1", cat: "termine", text: "Wie vereinbaren Kunden bei Ihnen Termine?", help: "Selbstbuchung spart Ihnen Telefonzeit und ist rund um die Uhr offen.",
      options: [{ label: "Kunden buchen online selbst", value: 3 }, { label: "Telefonisch und per E-Mail", value: 2 }, { label: "Nur telefonisch", value: 1 }] },
    t2: { key: "t2", cat: "termine", text: "Werden Termine automatisch bestätigt oder erinnert?", help: "Automatische Erinnerungen senken Ausfälle spürbar.",
      options: [{ label: "Ja, automatisch", value: 3 }, { label: "Nur von Hand", value: 1 }, { label: "Gar nicht", value: 0 }] },
    w1: { key: "w1", cat: "website", text: "Wie ist Ihre Website aufgestellt?", help: "Eine aktuelle, schnelle Seite ist oft der erste Eindruck.",
      options: [{ label: "Aktuell und schnell", value: 3 }, { label: "Vorhanden, aber veraltet", value: 1 }, { label: "Keine eigene Website", value: 0 }] },
    w2: { key: "w2", cat: "website", text: "Ist Ihre Website auf dem Handy gut bedienbar?", help: "Die meisten Kunden suchen mobil.",
      options: [{ label: "Ja, einwandfrei", value: 3 }, { label: "Nur teilweise", value: 1 }, { label: "Nein oder weiß ich nicht", value: 0 }] },
    g1: { key: "g1", cat: "google", text: "Ist Ihr Google-Unternehmensprofil vollständig gepflegt?", help: "Öffnungszeiten und Leistungen entscheiden über die lokale Sichtbarkeit.",
      options: [{ label: "Ja, vollständig", value: 3 }, { label: "Nur teilweise", value: 1 }, { label: "Nein oder weiß ich nicht", value: 0 }] },
    g2: { key: "g2", cat: "google", text: "Wie aktuell sind Fotos und Infos in Ihrem Google-Profil?", help: "Aktuelle Bilder schaffen Vertrauen und Klicks.",
      options: [{ label: "Aktuell", value: 3 }, { label: "Eher älter", value: 1 }, { label: "Keine oder unbekannt", value: 0 }] },
    b1: { key: "b1", cat: "bewertungen", text: "Sammeln Sie aktiv Google-Bewertungen?", help: "Bewertungen sind für lokale Betriebe ein starker Vertrauensfaktor.",
      options: [{ label: "Ja, systematisch", value: 3 }, { label: "Ab und zu", value: 1 }, { label: "Nie", value: 0 }] },
    b2: { key: "b2", cat: "bewertungen", text: "Reagieren Sie auf eingehende Bewertungen?", help: "Antworten zeigen, dass Sie sich kümmern.",
      options: [{ label: "Ja, immer", value: 3 }, { label: "Manchmal", value: 1 }, { label: "Nie", value: 0 }] },
    a1: { key: "a1", cat: "automatisierung", text: "Wie viele wiederkehrende Aufgaben erledigen Sie von Hand?", help: "Vieles davon lässt sich automatisieren.",
      options: [{ label: "Wenig, vieles läuft automatisch", value: 3 }, { label: "Einiges", value: 1 }, { label: "Fast alles von Hand", value: 0 }] },
    a2: { key: "a2", cat: "automatisierung", text: "Sind Rechnungen und Angebote digitalisiert?", help: "Digitale Belege sparen Zeit und Fehler.",
      options: [{ label: "Weitgehend digital", value: 3 }, { label: "Teilweise", value: 1 }, { label: "Kaum oder gar nicht", value: 0 }] },
  };

  const QUICK = [Q.e1, Q.t1, Q.w1, Q.g1, Q.b1, Q.a1];
  const DEEP = [Q.e1, Q.e2, Q.t1, Q.t2, Q.w1, Q.w2, Q.g1, Q.g2, Q.b1, Q.b2, Q.a1, Q.a2];

  const recMap = {
    erreichbarkeit: { title: "Erreichbarkeit verbessern", text: "Wenn das Telefon oft unbeantwortet bleibt, verlieren Sie Aufträge. Eine automatische Annahme oder ein schneller Rückruf fängt das ab.", free: false },
    termine: { title: "Termine vereinfachen", text: "Eine Online-Terminbuchung nimmt Ihnen Telefonarbeit ab und ist rund um die Uhr erreichbar.", free: false },
    website: { title: "Website erneuern", text: "Ohne aktuelle, schnelle und mobile Seite verlieren Sie Interessenten. Eine schlanke Seite bringt Anfragen.", free: false },
    google: { title: "Google-Profil pflegen", text: "Ein vollständiges, aktuelles Profil bringt Sie in der lokalen Suche nach vorne. Das können Sie kostenlos selbst erledigen.", free: true },
    bewertungen: { title: "Bewertungen sammeln", text: "Bitten Sie aktiv um Google-Bewertungen und reagieren Sie darauf. Das kostet nichts und wirkt stark.", free: true },
    automatisierung: { title: "Abläufe automatisieren", text: "Wiederkehrende Aufgaben wie Rechnungen oder Erinnerungen lassen sich weitgehend automatisieren und sparen Zeit.", free: false },
    tempo: { title: "Website beschleunigen", text: "Ihre Seite lädt auf dem Handy langsam. Langsame Seiten verlieren Besucher, hier lohnt sich eine Optimierung.", free: false },
  };

  const state = { mode: "quick", step: 0, answers: {}, url: "" };
  const active = () => (state.mode === "deep" ? DEEP : QUICK);
  const isUrlStep = () => state.step === active().length;

  function setProgress() {
    const total = active().length + 1;
    const pct = Math.max(6, Math.round(((state.step + 1) / (total + 1)) * 100));
    progress.style.width = pct + "%";
  }

  function playStepAnim() {
    stepBox.classList.remove("step-anim");
    void stepBox.offsetWidth;
    stepBox.classList.add("step-anim");
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
      playStepAnim();
      nextBtn.textContent = "Auswerten";
      nextBtn.disabled = false;
      setProgress();
      return;
    }

    const q = active()[state.step];
    countEl.textContent = `Frage ${state.step + 1} von ${active().length}`;
    stepBox.innerHTML = `
      <h2 class="quiz-question">${q.text}</h2>
      <p class="quiz-help">${q.help}</p>
      <div class="opt-list" role="radiogroup" aria-label="${escapeAttr(q.text)}">
        ${q.options
          .map(
            (o) => `
          <label class="opt-card">
            <input type="radio" name="${q.key}" value="${o.value}" ${state.answers[q.key] === o.value ? "checked" : ""} />
            <span class="opt-check" aria-hidden="true"></span>
            <span class="opt-label">${o.label}</span>
          </label>`
          )
          .join("")}
      </div>`;
    playStepAnim();
    nextBtn.textContent = "Weiter";
    nextBtn.disabled = !(q.key in state.answers);

    stepBox.querySelectorAll('input[type="radio"]').forEach((inp) => {
      inp.addEventListener("change", () => {
        state.answers[q.key] = Number(inp.value);
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

  // Enter geht zur naechsten Frage, sobald eine Antwort gewaehlt ist (iOS-artiges, schnelles Handling).
  card.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const t = e.target;
    if (t === nextBtn || t === backBtn || (t && t.classList && t.classList.contains("mode-btn"))) return;
    if (!card.hidden && !nextBtn.disabled && !nextBtn.hidden) {
      e.preventDefault();
      nextBtn.click();
    }
  });

  function setMode(mode) {
    state.mode = mode;
    state.step = 0;
    state.answers = {};
    state.url = "";
    if (modeQuick) { modeQuick.classList.toggle("is-active", mode === "quick"); modeQuick.setAttribute("aria-pressed", String(mode === "quick")); }
    if (modeDeep) { modeDeep.classList.toggle("is-active", mode === "deep"); modeDeep.setAttribute("aria-pressed", String(mode === "deep")); }
    result.hidden = true;
    card.hidden = false;
    renderStep();
  }
  if (modeQuick) modeQuick.addEventListener("click", () => setMode("quick"));
  if (modeDeep) modeDeep.addEventListener("click", () => setMode("deep"));

  async function showResult() {
    // Werte je Kategorie mitteln
    const cats = [];
    let sum = 0, answered = 0;
    for (const cat of categories) {
      const vals = active().filter((q) => q.cat === cat.id && q.key in state.answers).map((q) => state.answers[q.key]);
      if (!vals.length) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      sum += vals.reduce((a, b) => a + b, 0);
      answered += vals.length;
      cats.push({ id: cat.id, label: cat.label, avg, pct: Math.round((avg / 3) * 100) });
    }
    const score = answered ? Math.round((sum / (answered * 3)) * 100) : 0;

    let ps = null;
    if (state.url) {
      nextBtn.disabled = true;
      nextBtn.textContent = "Werte aus ...";
      ps = await fetchPageSpeed(state.url);
    }

    const recs = [];
    for (const c of cats) {
      if (c.avg <= 1) recs.push({ ...recMap[c.id], prio: c.avg <= 0.5 ? "Hoch" : "Mittel" });
    }
    if (ps && ps.ok && typeof ps.performance === "number" && ps.performance < 60) {
      recs.push({ ...recMap.tempo, prio: ps.performance < 40 ? "Hoch" : "Mittel" });
    }
    recs.sort((a, b) => (a.prio === b.prio ? 0 : a.prio === "Hoch" ? -1 : 1));
    const topRecs = recs.slice(0, state.mode === "deep" ? 6 : 4);

    const barCats = cats.slice();
    if (ps && ps.ok && typeof ps.performance === "number") barCats.push({ label: "Website-Tempo", pct: ps.performance });

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

      ${state.mode === "deep" ? leadFormHtml() : `<a class="btn btn-primary result-cta cta-space" href="index.html#kontakt">Kostenloses Erstgespräch vereinbaren</a>`}
      <div><button type="button" class="restart" id="restart">Check neu starten</button></div>
    `;

    card.hidden = true;
    result.hidden = false;

    result.querySelectorAll(".cat-fill").forEach((el) => {
      el.style.width = (Number(el.getAttribute("data-pct")) || 0) + "%";
    });
    const gaugeVal = result.querySelector(".gauge-val");
    if (gaugeVal) gaugeVal.setAttribute("stroke-dashoffset", offset.toFixed(1));

    const restart = document.getElementById("restart");
    if (restart) restart.addEventListener("click", resetCheck);
    if (state.mode === "deep") wireLeadForm(score);

    progress.style.width = "100%";
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function leadFormHtml() {
    return `
      <form class="lead-form" id="lead-form" novalidate>
        <p class="block-title">Ergebnis an Younes senden</p>
        <p class="lead-intro">Optional. Ich sehe mir Ihre Antworten an und melde mich mit konkreten, passenden Vorschlägen. Unabhängig vom normalen Kontaktformular.</p>
        <div class="field"><label for="lead-name">Name</label><input id="lead-name" name="name" type="text" autocomplete="name" required maxlength="120" /></div>
        <div class="field"><label for="lead-email">E-Mail</label><input id="lead-email" name="email" type="email" autocomplete="email" required maxlength="160" /></div>
        <div class="field"><label for="lead-message">Nachricht <span class="optional">(optional)</span></label><textarea id="lead-message" name="message" rows="3" maxlength="1500"></textarea></div>
        <div class="hp" aria-hidden="true"><label for="lead-website">Website</label><input id="lead-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
        <div class="field field--check"><input id="lead-consent" type="checkbox" required /><label for="lead-consent">Ich habe die <a href="pages/datenschutz.html">Datenschutzerklärung</a> gelesen und bin mit der Übermittlung meiner Angaben und Antworten einverstanden.</label></div>
        <button class="btn btn-primary btn-block" type="submit" id="lead-submit">Antworten senden</button>
        <p class="form-status" id="lead-status" role="status" aria-live="polite"></p>
      </form>`;
  }

  function wireLeadForm(score) {
    const form = document.getElementById("lead-form");
    const status = document.getElementById("lead-status");
    const btn = document.getElementById("lead-submit");
    if (!form || !status || !btn) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const answers = active().map((q) => ({
        frage: q.text,
        antwort: (q.options.find((o) => o.value === state.answers[q.key]) || {}).label || "-",
      }));

      const payload = {
        name: form.querySelector("#lead-name").value,
        email: form.querySelector("#lead-email").value,
        message: form.querySelector("#lead-message").value,
        website: form.querySelector("#lead-website").value,
        consent: true,
        score,
        answers,
      };

      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = "Wird gesendet ...";
      status.textContent = "";
      status.classList.remove("is-error", "is-ok");

      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          form.reset();
          status.textContent = "Danke, Ihre Antworten sind angekommen. Ich melde mich zeitnah.";
          status.classList.add("is-ok");
        } else {
          status.textContent = "Der Versand ist in dieser Demo noch nicht aktiv. Schreiben Sie mir gern direkt an younes1nourddine@gmail.com.";
          status.classList.add("is-error");
        }
      } catch (err) {
        status.textContent = "Verbindung fehlgeschlagen. Schreiben Sie mir gern direkt an younes1nourddine@gmail.com.";
        status.classList.add("is-error");
      } finally {
        btn.disabled = false;
        btn.textContent = orig;
      }
    });
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
