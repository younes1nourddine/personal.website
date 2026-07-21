# Portfolio Younes Nourddine

Statische Landingpage plus eine Serverless-Funktion für das Kontaktformular. Keine Build-Tools, keine externen Ressourcen, keine Secrets im Code.

## Struktur

```
portfolio/
  index.html            Startseite
  css/styles.css        Styles, Tokens, Animationen
  js/main.js            Navigation, Scroll-Reveal, Formular
  api/contact.js        Vercel Serverless Function (POST /api/contact)
  pages/impressum.html  Impressum (Platzhalter ausfuellen)
  pages/datenschutz.html Datenschutz (Platzhalter ausfuellen)
  favicon.svg
  vercel.json           Security-Header inkl. CSP
  .gitignore
  .env.example          Vorlage, enthaelt KEINE echten Werte
```

## Vor dem Deploy ausfuellen

1. LinkedIn-URL ersetzen: Suche im Projekt nach `DEIN-LINKEDIN-PROFIL`.
2. Domain und E-Mail ersetzen: Suche nach `deine-domain.de`.
3. Impressum und Datenschutz: alle mit Platzhalter markierten Felder ersetzen und juristisch pruefen lassen.
4. `og-image.jpg` (1200 x 630) in den Ordner legen, damit Social-Vorschauen ein Bild haben.

## Deploy auf Vercel (sicher, ohne Datenlecks)

1. Diesen Ordner als **eigenes** Repo verwenden (getrennt vom bestehenden Projekt). In `portfolio/`: `git init`, committen, zu GitHub pushen. Die `.gitignore` haelt `.env` und `.vercel` heraus.
2. Auf vercel.com das Repo importieren. Ist `portfolio/` ein Unterordner eines groesseren Repos, in den Vercel-Projekteinstellungen **Root Directory** auf `portfolio` setzen.
3. Unter **Settings > Environment Variables** anlegen (niemals ins Repo):
   - `RESEND_API_KEY`
   - `CONTACT_TO_EMAIL`
   - `CONTACT_FROM_EMAIL`
4. Deployen. Vercel erkennt `api/contact.js` automatisch als Function.
5. Formular testen. Danach Domain verbinden.

## E-Mail-Versand

Das Formular sendet ueber [Resend](https://resend.com). Konto anlegen, Domain verifizieren (dann eine EU-Region waehlen), API-Key erzeugen und als `RESEND_API_KEY` in Vercel hinterlegen. Ohne diese Variablen antwortet die Funktion bewusst mit einer neutralen Fehlermeldung und verraet keine Details.

## Sicherheit

- Keine Schluessel im Code, nur `process.env`.
- Strikte Content-Security-Policy und weitere Header in `vercel.json`.
- Honeypot-Feld plus serverseitige Validierung gegen Spam.
- Nur System-Schriften, keine externen Requests, DSGVO-freundlich.
