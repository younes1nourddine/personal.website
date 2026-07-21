/* Younes Nourddine · Portfolio
   Vanilla JS, keine externen Abhaengigkeiten. */

// JS ist aktiv: erst jetzt darf CSS Inhalte fuer die Reveal-Animation ausblenden.
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  // Hero-Animation ausloesen
  requestAnimationFrame(() => document.body.classList.add("loaded"));

  // Aktuelles Jahr im Footer
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  setupNav();
  setupReveal();
  setupForm();
});

/* Mobile-Navigation */
function setupNav() {
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("nav-menu");
  if (!nav || !toggle || !menu) return;

  const setOpen = (open) => {
    nav.dataset.open = open ? "true" : "false";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  };

  toggle.addEventListener("click", () => setOpen(nav.dataset.open !== "true"));

  menu.addEventListener("click", (e) => {
    if (e.target instanceof HTMLElement && e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

/* Scroll-Reveal mit IntersectionObserver */
function setupReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
  );

  items.forEach((el) => io.observe(el));
}

/* Kontaktformular: same-origin POST an /api/contact */
function setupForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const btn = document.getElementById("submit-btn");
  if (!form || !status || !btn) return;

  const setStatus = (msg, type) => {
    status.textContent = msg;
    status.classList.remove("is-error", "is-ok");
    if (type) status.classList.add(type === "ok" ? "is-ok" : "is-error");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      setStatus("Bitte fuellen Sie die Pflichtfelder aus.", "error");
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Wird gesendet ...";
    setStatus("", null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        form.reset();
        setStatus("Danke, Ihre Nachricht ist angekommen. Ich melde mich innerhalb von 24 Stunden.", "ok");
      } else {
        setStatus("Das hat leider nicht geklappt. Schreiben Sie mir gern direkt an kontakt@deine-domain.de.", "error");
      }
    } catch (err) {
      setStatus("Verbindung fehlgeschlagen. Schreiben Sie mir gern direkt an kontakt@deine-domain.de.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}
