/* Live-Demo des KI-Assistenten.
   Ruft /api/assistant auf. Nichts wird gespeichert, der Verlauf lebt nur im Browser.
   Keine inline style-Attribute (CSP-konform). */

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-text");
  const sendBtn = document.getElementById("chat-send");
  const branchRow = document.getElementById("branch-row");
  const suggestBox = document.getElementById("suggestions");
  if (!log || !form || !input || !sendBtn || !branchRow || !suggestBox) return;

  const GREETING = {
    werkstatt: "Guten Tag, hier ist die automatische Assistenz der Werkstatt. Ich bin ein KI-Assistent. Wie kann ich Ihnen helfen?",
    friseur: "Guten Tag, hier ist die automatische Assistenz des Salons. Ich bin ein KI-Assistent. Wie kann ich Ihnen helfen?",
    fahrschule: "Guten Tag, hier ist die automatische Assistenz der Fahrschule. Ich bin ein KI-Assistent. Wie kann ich Ihnen helfen?",
    handwerk: "Guten Tag, hier ist die automatische Assistenz des Betriebs. Ich bin ein KI-Assistent. Wie kann ich Ihnen helfen?",
    sonstiges: "Guten Tag, hier ist die automatische Assistenz. Ich bin ein KI-Assistent. Wie kann ich Ihnen helfen?",
  };

  const SUGGESTIONS = {
    werkstatt: ["Ich bräuchte einen Termin für die Inspektion", "Macht ihr auch die Hauptuntersuchung?", "Wann habt ihr geöffnet?"],
    friseur: ["Ich hätte gern einen Termin zum Schneiden", "Färbt ihr auch?", "Wie lange dauert das ungefähr?"],
    fahrschule: ["Wie melde ich mich für den Führerschein an?", "Wann ist der nächste Theoriekurs?", "Was kostet eine Fahrstunde ungefähr?"],
    handwerk: ["Ich bräuchte ein Angebot", "Kommt ihr auch vorbei zum Anschauen?", "Habt ihr einen Notdienst?"],
    sonstiges: ["Ich hätte gern einen Termin", "Wann habt ihr geöffnet?", "Ich möchte einen Rückruf"],
  };

  const state = { branch: "werkstatt", messages: [], busy: false };

  function addBubble(role, text) {
    const row = document.createElement("div");
    row.className = "bubble-row " + (role === "user" ? "is-user" : "is-bot");
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function addTyping() {
    const row = document.createElement("div");
    row.className = "bubble-row is-bot";
    row.id = "typing";
    const bubble = document.createElement("div");
    bubble.className = "bubble bubble--typing";
    bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    bubble.setAttribute("aria-label", "Assistenz schreibt");
    row.appendChild(bubble);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById("typing");
    if (t) t.remove();
  }

  function renderSuggestions() {
    suggestBox.innerHTML = "";
    (SUGGESTIONS[state.branch] || []).forEach((text) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip chip--ghost";
      b.textContent = text;
      b.addEventListener("click", () => {
        input.value = text;
        form.requestSubmit();
      });
      suggestBox.appendChild(b);
    });
  }

  function resetChat() {
    state.messages = [];
    log.innerHTML = "";
    addBubble("assistant", GREETING[state.branch] || GREETING.sonstiges);
    renderSuggestions();
  }

  branchRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn || state.busy) return;
    state.branch = btn.getAttribute("data-branch") || "sonstiges";
    branchRow.querySelectorAll(".chip").forEach((c) => {
      const on = c === btn;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-checked", String(on));
    });
    resetChat();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || state.busy) return;

    state.busy = true;
    sendBtn.disabled = true;
    input.value = "";
    addBubble("user", text);
    state.messages.push({ role: "user", content: text });
    suggestBox.innerHTML = "";
    addTyping();

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: state.branch, messages: state.messages.slice(-8) }),
      });
      removeTyping();

      if (res.ok) {
        const data = await res.json();
        const reply = (data && data.reply) || "";
        if (reply) {
          addBubble("assistant", reply);
          state.messages.push({ role: "assistant", content: reply });
        } else {
          addBubble("assistant", "Da ist gerade nichts angekommen. Bitte versuchen Sie es noch einmal.");
        }
      } else if (res.status === 503) {
        addBubble("assistant", "Diese Demo ist noch nicht freigeschaltet. Younes richtet gerade den Zugang ein. Schreiben Sie ihm gern direkt an younes1nourddine@gmail.com.");
      } else if (res.status === 429) {
        addBubble("assistant", "Sie waren gerade sehr fleißig. Bitte warten Sie einen Moment und schreiben Sie dann weiter.");
      } else {
        addBubble("assistant", "Da ist etwas schiefgelaufen. Bitte versuchen Sie es gleich noch einmal.");
      }
    } catch (err) {
      removeTyping();
      addBubble("assistant", "Die Verbindung hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
    } finally {
      state.busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });

  resetChat();
});
