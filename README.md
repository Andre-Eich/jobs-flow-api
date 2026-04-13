# jobs-flow-api

`jobs-flow-api` ist eine interne Next.js-Anwendung fuer KI-gestuetzte Recruiting-, Vertriebs- und Content-Workflows rund um Stellenanzeigen. Das Repo ist trotz des Namens keine reine API, sondern eine App mit UI, serverseitigen API-Routen und lokaler JSON-Persistenz fuer den aktuellen MVP-Stand.

## Aktueller Produktstand

Die Hauptnavigation enthaelt derzeit diese Services:

- `Service Text`
- `Text Generator`
- `Kaltakquise-Mails`
- `Streumails`
- `CRM`
- `Prompts & Texte`
- `Social Posts`

### Kaltakquise-Mails

- Einzelworkflow fuer Stellenanzeigen aus Bild oder URL
- Extraktion von Jobtitel, Firma, Ansprechpartner und Mailadresse
- Generierung und Versand von Einzelmails
- kontextbezogene rechte Spalte als `Historie`
- integrierte Unterbereiche fuer Erinnerungen sowie Texte und Auswertungen

### Streumails

- Google-basierte Unternehmenssuche ueber `GOOGLE_MAPS_API_KEY`
- Fokusfeld, Radius und Zielanzahl `10 / 20 / 30`
- neue Suchoptionen:
- `Nur neue Kontakte` filtert CRM-bekannte Leads aus
- `Naechste Treffer` sucht fuer denselben Suchkontext weitere, bisher nicht angezeigte Leads
- Analyse, Kontaktdatensuche, Qualitaetsbewertung und Batch-Versand
- kontextbezogene rechte Spalte als `Historie`
- Paketlogik fuer Sammelversand

### CRM

- zentrale Lead-Sicht ueber Kaltakquise und Streumails
- Tabellenansicht mit Pagination und Seitengroessen `10 / 25 / 50 / 100`
- Mehrfachauswahl, `Alle auswaehlen` und Sammelaktion `Erinnerung schicken`
- Lead-Historie mit gesendeten Mails und Metadaten

### Prompts & Texte

- zentrale Pflegeoberflaeche fuer Prompt- und Texttypen
- Karten-Grid mit Detail-/Edit-Popup
- dauerhafte Speicherung der Eintraege in `data/`

### Social Posts

- eigener Service mit zwei Bereichen:
- `Content erstellen`
- `Template bearbeiten`
- speicherbare Template-Konfigurationen pro Format
- Extraktion aus `jobs-in-berlin-brandenburg.de`
- finaler PNG-Export der gerenderten Vorschau

## Technischer Stack

- Next.js 16
- React 19
- TypeScript
- OpenAI API
- Resend
- Google Maps Platform / Places API (New)
- lokale JSON-Persistenz in `data/`

## Wichtige Umgebungsvariablen

```env
OPENAI_API_KEY=
RESEND_API_KEY=
RESEND_CRM_API_KEY=
TEST_RECIPIENT_EMAIL=
GOOGLE_MAPS_API_KEY=
```

Kurzbeschreibung:

- `OPENAI_API_KEY`: Analyse, Textgenerierung, Prompt-gestuetzte Extraktion
- `RESEND_API_KEY`: Mailversand
- `RESEND_CRM_API_KEY`: Abruf von CRM-/Mailhistorie
- `TEST_RECIPIENT_EMAIL`: Testmodus fuer Einzel- und Streumails
- `GOOGLE_MAPS_API_KEY`: Geocoding und Unternehmenssuche fuer Streumails

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Nützliche Checks:

```bash
npm run lint
npx tsc --noEmit
```

## Wichtige Bereiche im Repo

```text
app/
  page.tsx                       Hauptnavigation aller Services
  photo/page.replacement.tsx     Kaltakquise-Mails
  photo/page.tsx                 Streumails
  crm/page.tsx                   Zentrales CRM
  prompts-text/page.tsx          Prompt- und Textverwaltung
  social-posts/page.tsx          Social-Posts-Service
  api/
    bulk-find-leads/route.ts
    bulk-collect-contact/route.ts
    generate-bulk-email/route.ts
    send-bulk-mail/route.ts
    crm/
lib/
  leadStore.ts
  bulkPackageStore.ts
  promptTextStore.ts
  socialPostTemplateStore.ts
data/
  leads.json
  bulkPackages.json
  promptTextEntries.json
  socialPostTemplates.json
```

## Dokumentation im Repo

- [CODEX_CONTEXT.md](CODEX_CONTEXT.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/backlog.md](docs/backlog.md)
- [docs/worklog.md](docs/worklog.md)
- [docs/replacements-summary.md](docs/replacements-summary.md)

## Bekannte offene Punkte

- Es gibt weiterhin mehrere `replacement`-/`backup`-Dateien im Repo, die mittelfristig konsolidiert werden sollten.
- Die Persistenz laeuft noch ueber JSON-Dateien und ist keine finale Produktivloesung.
- Prompt-/Textverwaltung ist sichtbar und speicherbar, aber noch nicht in allen Services vollstaendig zur Laufzeit verdrahtet.
- Streumail-Suche und CRM sind deutlich weiter, benoetigen aber weiterhin Feinschliff bei Qualitaetslogik, Dublettenerkennung und UX.
- Social-Posts-Extraktion fuer Arbeitgebername und Logo ist verbessert, aber weiterhin ein Bereich fuer reale Gegenproben.

## Hinweis fuer den naechsten Einstieg

Fuer neue Sessions reicht in der Regel diese Reihenfolge:

1. `README.md`
2. `CODEX_CONTEXT.md`
3. `docs/worklog.md`
4. `docs/backlog.md`
