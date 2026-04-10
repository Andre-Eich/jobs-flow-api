# jobs-flow-api

Interne Next.js-Anwendung für KI-gestützte Vertriebs- und Recruiting-Workflows rund um Stellenanzeigen.

## Zweck des Projekts

`jobs-flow-api` unterstützt dabei, Stellenanzeigen aus URLs oder Bildern zu analysieren, daraus strukturierte Firmendaten zu extrahieren, passende Kaltakquise-Mails für ein regionales Stellenportal zu generieren, diese zu versenden und den Versand später im CRM und in einfachen Text-Auswertungen nachzuverfolgen.

Der Name des Repos ist aktuell etwas irreführend: technisch handelt es sich nicht nur um eine API, sondern um eine vollständige **Next.js-App mit UI und API-Routen**.

## Aktueller Funktionsumfang

### 1. Service Text
- Freie Textgenerierung auf Deutsch
- Eingaben: Thema, Eigenschaften, Wortanzahl
- Einzelausgabe oder zwei Varianten parallel
- Anpassbares Prompt-Template direkt im UI

### 2. Kaltakquise-Mails
- Analyse einer Stellenanzeige aus:
  - Bild / Screenshot / Foto
  - URL einer Stellenanzeige
- Extraktion von:
  - Jobtitel
  - Firma
  - Ansprechpartner
  - E-Mail-Adresse
- Generierung einer kurzen Vertriebs-E-Mail für `jobs-in-berlin-brandenburg.de`
- Auswahl verschiedener Einstiegs-/Hook-Typen
- Testversand oder Versand an erkannte Empfängeradresse
- CRM-Seitenleiste mit zuletzt versendeten Mails
- Erinnerungs-/Follow-up-Ansicht
- Text- und Hook-Auswertungen

### 3. Streumail
- UI für Firmenlisten, Datensammlung, Qualitätsprüfung und Versand
- Der Bereich ist aktuell noch **MVP / Mock-Logik** und noch nicht an eine echte Lead-Datenquelle angebunden

### 4. Text Generator
- Noch nicht umgesetzt
- Aktuell nur Platzhalter im Frontend

## Tech-Stack

- **Framework:** Next.js 16
- **Frontend:** React 19
- **Sprache:** TypeScript
- **Styling:** Inline Styles + Tailwind im Projekt vorhanden
- **KI:** OpenAI API
- **Mailversand / Maildaten:** Resend
- **Lokale Persistenz (aktuell):** JSON-Dateien im Ordner `data/`

## Wichtige npm-Skripte

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Umgebungsvariablen

Mindestens diese Variablen werden aktuell im Code verwendet:

```env
OPENAI_API_KEY=
RESEND_API_KEY=
RESEND_CRM_API_KEY=
TEST_RECIPIENT_EMAIL=
```

### Bedeutung
- `OPENAI_API_KEY`: für Text-, Bild- und URL-Analyse sowie Mail-Generierung
- `RESEND_API_KEY`: Mailversand
- `RESEND_CRM_API_KEY`: Lesen von versendeten E-Mails und Events im CRM
- `TEST_RECIPIENT_EMAIL`: Testmodus für Mailversand

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Dann im Browser öffnen:

```text
http://localhost:3000
```

## Projektstruktur

```text
app/
  api/
    crm/
      email/[id]/route.ts
      emails/route.ts
      text-stats/route.ts
    generate/route.ts
    photo-to-mail/route.ts
    photo-to-mail-url/route.ts
    regenerate-email/route.ts
    send-mail/route.ts
  photo/page.tsx
  page.tsx
lib/
  reminderStore.ts
  textControllingStore.ts
data/
  reminders.json
  textControlling.json
```

## API-Routen im Überblick

### `POST /api/generate`
Generiert freie deutsche Texte auf Basis von Thema, Eigenschaften und Wortanzahl.

### `POST /api/photo-to-mail`
Analysiert ein Bild / Screenshot einer Stellenanzeige mit OpenAI, extrahiert Kerninformationen und erzeugt zusätzlich einen ersten Mail-Vorschlag.

### `POST /api/photo-to-mail-url`
Lädt eine URL, extrahiert sichtbaren Text der Stellenanzeige und erzeugt daraus strukturierte Daten und einen ersten Mail-Vorschlag.

### `POST /api/regenerate-email`
Erstellt eine Vertriebs-Mail neu auf Basis strukturierter Stellen- und Firmendaten. Unterstützt verschiedene Hook-Basen und Follow-up-Mails.

### `POST /api/send-mail`
Versendet Mails über Resend, erzeugt Betreffzeilen, ergänzt Abschlussblock und speichert einfache Controlling-Daten.

### `GET /api/crm/emails`
Lädt versendete Mails aus Resend, filtert sie optional nach Firma oder Domain und berechnet Reminder-Kandidaten.

### `GET /api/crm/email/[id]`
Lädt Detailinformationen zu einer einzelnen versendeten Mail.

### `GET /api/crm/text-stats`
Aktualisiert lokale Text-Controlling-Daten mit Resend-Events und berechnet Hook-/Varianten-Statistiken.

## Dokumentation im Repo

Weitere Dokumente:
- `docs/architecture.md`
- `docs/backlog.md`
- `docs/README.draft.md`

## Empfohlene nächste Schritte

1. Dieses Draft-README in die bestehende `README.md` übernehmen
2. CRM-Metadaten beim Versand sauber strukturieren
3. Reminder-/Follow-up-Logik stabilisieren
4. gemeinsame Business-Logik in `lib/` bündeln
5. JSON-basierte Persistenz mittelfristig durch Datenbank ersetzen

## Arbeitsmodus für neue Chats

Damit neue Chats schnell arbeitsfähig sind, reicht meist so ein Einstieg:

```text
Arbeite weiter an jobs-flow-api. Lies zuerst README, docs/architecture.md und docs/backlog.md. Ziel heute: ...
```
