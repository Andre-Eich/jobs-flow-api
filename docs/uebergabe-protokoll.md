# Uebergabeprotokoll Jobs Flow

Stand: 30.04.2026

## Kurzueberblick

`jobs-flow-app` ist eine interne Next.js-Anwendung fuer KI-gestuetzte Recruiting-, Vertriebs- und Content-Workflows rund um Stellenanzeigen. Die App verbindet mehrere Services in einer Oberflaeche: Textgenerierung, Kaltakquise-Mails, Streumails, CRM, Prompt-/Textpflege und Social-Post-Erstellung.

Das Projekt ist ein MVP mit produktnahen Kernfunktionen. Die Datenhaltung laeuft aktuell ueber lokale JSON-Dateien in `data/`. Das ist fuer Entwicklung und kleine interne Nutzung praktikabel, aber noch keine finale Produktivarchitektur.

## Einstieg fuer neue Entwickler

- Startpunkt der App: `app/page.tsx`
- Hauptnavigation: linke Sidebar mit allen Services
- Aktive Service-Einstiege: `app/services/*`
- API-Routen: `app/api/*`
- Persistenz/Stores: `lib/*Store.ts`
- Projektkontext: `README.md`, `CODEX_CONTEXT.md`, `docs/architecture.md`, `docs/guardrails.md`

Aktive Service-Entry-Karte:
- `app/services/bulk-mail-entry.tsx` -> `app/photo/page.replacement.v4.tsx`
- `app/services/cold-mail-entry.tsx` -> `app/photo/page.replacement.tsx`
- `app/services/crm-entry.tsx` -> `app/crm/page.tsx`
- `app/services/prompts-text-entry.tsx` -> `app/prompts-text/page.tsx`
- `app/services/social-posts-entry.tsx` -> `app/social-posts/page.tsx`

Wichtig: Die aktive Streumail-UI laeuft aktuell nicht ueber `app/photo/page.tsx`, sondern ueber `app/photo/page.replacement.v4.tsx` und `app/photo/BulkLeadsTable.replacement.v4.tsx`.

Lokaler Start:

```bash
npm install
npm run dev
```

Wichtige Checks:

```bash
npm run lint
npx tsc --noEmit
```

## Hauptfeatures

### 1. Service Text

Der Bereich `Service Text` ist ein freier KI-Textgenerator direkt in `app/page.tsx`.

Funktion:
- Nutzer gibt Thema, Eigenschaften und Wortanzahl ein.
- Die App generiert einen natuerlichen deutschen Text.
- Es kann ein einzelner Text oder zwei Varianten erzeugt werden.
- Die zugrunde liegende Aufgabe kann im UI eingesehen, bearbeitet und zurueckgesetzt werden.
- Ergebnisse koennen kopiert werden.

Technik:
- Frontend: `app/page.tsx`
- API: `app/api/generate/route.ts`
- Abhaengigkeit: `OPENAI_API_KEY`

Status:
- Funktionsfaehig als einfacher Textservice.
- Prompt ist lokal im UI verwaltbar, aber nicht dauerhaft im Prompt-Store gespeichert.

### 2. Text Generator

Der Bereich `Text Generator` ist in der Navigation vorhanden, aber aktuell nur ein Platzhalter.

Funktion:
- Dient als reservierter Bereich fuer spaetere Text-Workflows.
- Noch kein voll ausgebauter produktiver Ablauf.

Technik:
- Frontend: `app/page.tsx`

Status:
- Bewusst nicht entfernt.
- Muss fachlich entschieden werden: ausbauen oder klar als Platzhalter belassen.

### 3. Kaltakquise-Mails

Der Bereich `Kaltakquise-Mails` ist der Einzelmail-Workflow fuer konkrete Stellenanzeigen.

Funktion:
- Stellenanzeige kann per Bild oder URL analysiert werden.
- Die App extrahiert Jobtitel, Firma, Ansprechpartner und E-Mail-Adresse.
- Extrahierte Werte koennen manuell korrigiert werden.
- Alternative E-Mail- oder Ansprechpartner-Vorschlaege koennen angezeigt und ausgewaehlt werden.
- Nutzer waehlt Stil-/Hook-Optionen fuer die Mail.
- KI generiert eine passende Vertriebs-Mail fuer `jobs-in-berlin-brandenburg.de`.
- Versand erfolgt ueber Resend.
- Testmodus leitet Versand an `TEST_RECIPIENT_EMAIL`.
- Optional kann eine Kopie/CRM-relevante Versandlogik genutzt werden.
- Rechte Spalte zeigt eine kontextbezogene `Historie`.
- Erinnerungen koennen aus der Historie heraus versendet werden.

Technik:
- Service-Einstieg: `app/services/cold-mail-entry.tsx`
- Aktive UI: `app/photo/page.replacement.tsx`
- Bildanalyse: `app/api/photo-to-mail/route.ts`
- URL-Analyse: `app/api/photo-to-mail-url/route.ts`
- Mailgenerierung: `app/api/regenerate-email/route.ts`
- Versand: `app/api/send-mail/route.ts`
- CRM-/Historienabruf: `app/api/crm/emails/route.ts`, `app/api/crm/email/[id]/route.ts`
- Persistenz: `lib/leadStore.ts`, `lib/textControllingStore.ts`, `lib/reminderStore.ts`

Status:
- Kernworkflow ist vorhanden.
- Bereich ist stabil genug, sollte aber gemaess Guardrails nicht unbedacht umgebaut werden.

### 4. Streumails

Der Bereich `Streumails` ist der Bulk-Outreach-Workflow fuer mehrere Unternehmen in einer Region.

Funktion:
- Nutzer gibt Ort oder PLZ ein.
- Optional koennen Fokus/Branche, Radius und Zielanzahl gewaehlt werden.
- Zielanzahlen: typischerweise 10, 20 oder 30 Leads.
- Unternehmenssuche nutzt Google Maps Platform / Places API New.
- Option `Nur neue Kontakte` filtert CRM-bekannte Leads aus.
- Option `Naechste Treffer` sucht fuer denselben Kontext weitere, bisher nicht angezeigte Leads.
- Gefundene Leads werden tabellarisch dargestellt.
- Leads koennen einzeln oder gesammelt ausgewaehlt werden.
- Batch-Aktionen:
  - Unternehmen analysieren
  - Kontaktdaten sammeln
  - Qualitaet bewerten
  - E-Mails generieren und senden
- Analyse erkennt Job-/Karriere-Signale und vergibt Sterne.
- Kontaktdatensuche priorisiert E-Mail, Ansprechpartner und Branche.
- E-Mail- und Ansprechpartner-Alternativen koennen als Optionen angezeigt werden.
- Qualitaetsbewertung warnt bei moeglichen Dubletten oder kuerzlich angeschriebenen Firmen.
- Testmodus sendet an `TEST_RECIPIENT_EMAIL`.
- Kurzmodus erzeugt kompaktere Bulk-Mails.
- Frei bearbeitbare Textbausteine koennen als Badges aktiviert werden.
- Aktive Textbausteine werden in jede Bulk-Mail eingebaut.
- Bulk-Sendungen werden als Pakete angelegt und in CRM/Historie gruppiert.

Technik:
- Service-Einstieg: `app/services/bulk-mail-entry.tsx`
- Aktive UI: `app/photo/page.replacement.v4.tsx`
- Tabelle: `app/photo/BulkLeadsTable.replacement.v4.tsx`
- Lead-Suche: `app/api/bulk-find-leads/route.ts`
- Analyse: `app/api/bulk-analyze-company/route.ts`
- Kontaktdaten: `app/api/bulk-collect-contact/route.ts`
- Mailgenerierung: `app/api/generate-bulk-email/route.ts`
- Versand: `app/api/send-bulk-mail/route.ts`
- Paket-API: `app/api/crm/bulk-packages/route.ts`
- Persistenz: `lib/leadStore.ts`, `lib/bulkPackageStore.ts`, `lib/textControllingStore.ts`

Status:
- Der Streumail-Bereich ist der aktuell am staerksten ausgebaute Wachstumsbereich.
- Suche, Paketlogik und Versand sind vorhanden.
- Weiterer Feinschliff ist sinnvoll bei Trefferqualitaet, Dublettenlogik, UX und echter Gegenprobe mit Realdaten.

Bulk-Flow:
1. Liste finden: `/api/bulk-find-leads`
2. Unternehmen analysieren: `/api/bulk-analyze-company`
3. Kontaktdaten sammeln: `/api/bulk-collect-contact`
4. Qualitaet bewerten: lokale Pruefung gegen CRM-/Mailhistorie
5. Paket vorbereiten: `/api/crm/leads`, dann `/api/crm/bulk-packages`
6. Bulk-Mail generieren: `/api/generate-bulk-email`
7. Bulk-Mail senden: `/api/send-bulk-mail`
8. Persistenz/Historie: `textControllingStore`, `leadStore`, `bulkPackageStore`

### 5. CRM

Der Bereich `CRM` ist die zentrale Lead-Sicht ueber Einzel- und Streumailkontakte.

Funktion:
- Zeigt Leads aus Kaltakquise und Streumails.
- Lead-Tabelle mit Sortierung, Pagination und Seitengroessen.
- Mehrfachauswahl und `Alle auswaehlen`.
- Sammelaktion fuer Erinnerungen.
- Detail-/Dashboard-Ansicht pro Lead.
- Leads koennen angelegt, bearbeitet, archiviert und wiederhergestellt werden.
- Historie zeigt gesendete Mails und CRM-Metadaten.
- Reminder koennen aus dem CRM heraus versendet werden.
- Opt-out-/Archivstatus wird im Lead-Datenmodell beruecksichtigt.

Technik:
- Service-Einstieg: `app/services/crm-entry.tsx`
- UI: `app/crm/page.tsx`
- Lead-API: `app/api/crm/leads/route.ts`
- Einzel-Lead-API: `app/api/crm/leads/[id]/route.ts`
- Mailhistorie: `app/api/crm/emails/route.ts`
- Maildetail: `app/api/crm/email/[id]/route.ts`
- Reminder: `app/api/crm/send-reminder/route.ts`
- Textstatistik: `app/api/crm/text-stats/route.ts`
- Persistenz: `lib/leadStore.ts`, `lib/reminderStore.ts`, `lib/textControllingStore.ts`

Status:
- Zentrale CRM-Funktion ist produktnah.
- `app/crm/page.tsx`, CRM-APIs und `lib/leadStore.ts` sind geschuetzte Bereiche laut Guardrails.

### 6. Prompts & Texte

Der Bereich `Prompts & Texte` ist die Verwaltungsoberflaeche fuer Prompt- und Textbausteine.

Funktion:
- Bereiche fuer Kaltakquise, Streumail, Erinnerungen, CRM, Service Text, Text Generator und Textbausteine.
- Eintraege werden als Karten angezeigt.
- Detail-/Edit-Ansicht erlaubt Bearbeitung von Titel, Inhalt, Nutzungshinweis und Beispielwerten.
- Beispielmails fuer Streumail, Kaltakquise und Erinnerung koennen als Vorschau erzeugt werden.
- Textstatistiken aus CRM/Textcontrolling koennen angezeigt werden.
- Bulk-Textbausteine lassen sich pflegen.

Technik:
- Service-Einstieg: `app/services/prompts-text-entry.tsx`
- UI: `app/prompts-text/page.tsx`
- API: `app/api/prompts-text/route.ts`
- Store: `lib/promptTextStore.ts`
- Statistik: `app/api/crm/text-stats/route.ts`

Status:
- Pflegeoberflaeche und Persistenz sind vorhanden.
- Noch nicht alle Generator- und Versandrouten ziehen ihre Texte vollstaendig live aus dem Store.

### 7. Social Posts

Der Bereich `Social Posts` erstellt visuelle Social-Media-Posts aus Stellenanzeigen.

Funktion:
- Zwei Hauptbereiche:
  - `Content erstellen`
  - `Template bearbeiten`
- URL einer Jobanzeige kann analysiert werden.
- Extraktion liefert u.a. Firmenname, Jobtitel, Ort, Arbeitszeit, Highlight, Logo, Arbeitgeberbild, Benefits und CTA.
- Vorschau rendert die extrahierten Inhalte in ein Template.
- Template-Editor erlaubt Position, Groesse, Schrift, Farben und Bildflaechen fuer einzelne Elemente.
- Hintergrundbild kann hochgeladen werden.
- Template-Konfigurationen werden gespeichert.
- Gerenderte Vorschau kann als PNG exportiert werden.
- Caption-/Textvorschau kann kopiert werden.

Technik:
- Service-Einstieg: `app/services/social-posts-entry.tsx`
- UI: `app/social-posts/page.tsx`
- Extraktion: `app/api/social-posts/extract/route.ts`
- Template-API: `app/api/social-posts/template/route.ts`
- Bildproxy: `app/api/social-posts/image-proxy/route.ts`
- Store: `lib/socialPostTemplateStore.ts`

Status:
- Funktionsreich und sichtbar ausgebaut.
- Extraktion sollte weiter mit echten Stellenanzeigen getestet werden, besonders Arbeitgebername, Logo und Bildquellen.

## Datenhaltung

Aktuelle Persistenz erfolgt lokal in JSON-Dateien:

- `data/leads.json`: CRM-Leads und Mailzuordnung
- `data/bulkPackages.json`: Streumail-Pakete
- `data/textControlling.json`: Versand-/Textauswertung
- `data/reminders.json`: gesendete Erinnerungen
- `data/promptTextEntries.json`: Prompt- und Textpflege
- `data/socialPostTemplates.json`: Social-Post-Templates

Wichtig:
- `data/*.json` sind Laufzeitdaten.
- Diese Dateien sollen fuer normale Code-Aenderungen nicht gestaged, committed oder gepusht werden.
- Vor jedem Commit `git status --short` pruefen.

## Externe Dienste und Umgebungsvariablen

Erforderliche oder relevante Variablen:

```env
OPENAI_API_KEY=
RESEND_API_KEY=
RESEND_CRM_API_KEY=
TEST_RECIPIENT_EMAIL=
GOOGLE_MAPS_API_KEY=
```

Bedeutung:
- `OPENAI_API_KEY`: Analyse, Extraktion, Text- und Mailgenerierung
- `RESEND_API_KEY`: Versand von Einzel-, Bulk- und Reminder-Mails
- `RESEND_CRM_API_KEY`: Abruf von CRM-/Mailhistorie, alternativ teils `RESEND_API_KEY`
- `TEST_RECIPIENT_EMAIL`: Zieladresse im Testmodus
- `GOOGLE_MAPS_API_KEY`: Geocoding und Places-Suche fuer Streumails

Teilweise werden auch spezifischere Google-Variablen unterstuetzt:
- `GOOGLE_GEOCODING_API_KEY`
- `GOOGLE_PLACES_API_KEY`

## Wichtige technische Hinweise

### Aktive Dateien vs. historische Varianten

Im Repo liegen mehrere `replacement`- und `backup`-Dateien. Nicht jede Datei ist aktiv eingebunden.

Aktuell wichtige aktive Einstiege:
- Kaltakquise: `app/photo/page.replacement.tsx`
- Streumails: `app/photo/page.replacement.v4.tsx`
- Streumail-Tabelle: `app/photo/BulkLeadsTable.replacement.v4.tsx`
- CRM: `app/crm/page.tsx`
- Prompts & Texte: `app/prompts-text/page.tsx`
- Social Posts: `app/social-posts/page.tsx`

Die historischen Varianten sollten spaeter konsolidiert oder klar archiviert werden.

### Guardrails

Vor Aenderungen immer `docs/guardrails.md` beachten.

Besonders geschuetzt:
- `lib/leadStore.ts`
- `app/api/send-mail/route.ts`
- `app/api/send-bulk-mail/route.ts`
- `app/api/crm/leads/route.ts`
- `app/api/crm/emails/route.ts`
- `app/api/crm/send-reminder/route.ts`
- `app/crm/page.tsx`

Bei diesen Dateien nur gezielte Bugfixes oder klar abgesprochene Erweiterungen vornehmen.

## Bekannte offene Punkte

- JSON-Persistenz durch robustere Datenbankloesung ersetzen.
- Replacement-/Backup-Dateien bereinigen und aktive Dateien klarer machen.
- Prompt-/Textverwaltung vollstaendiger an echte Generator- und Versandlogik anbinden.
- Streumail-Suche mit mehr echten Suchlaeufen pruefen.
- `Nur neue Kontakte` und `Naechste Treffer` gegen echte CRM-Daten absichern.
- Dubletten- und 14-Tage-Warnlogik weiter verfeinern.
- Social-Posts-Extraktion mit mehreren echten Anzeigen validieren.
- Teststrategie ausbauen, besonders fuer Bulk-Suche, CRM-Reminder und Social Posts.
- Text Generator fachlich entscheiden.
- Potenzieller kleiner Bugfix in `app/api/send-bulk-mail/route.ts`: Im Testmodus sollte vermutlich kein `bcc` auf dieselbe Testadresse gesetzt werden. Datei ist rot/geschuetzt, daher nur nach ausdruecklicher Freigabe aendern.
- Langfristig Mailstruktur klaeren: `generate-bulk-email` und `send-bulk-mail` normalisieren beide Anrede/Grußlogik. Sauberer waere, wenn `generate-bulk-email` nur Body/Argumentation/CTA erzeugt und `send-bulk-mail` final fuer Anrede, Grussformel, Signatur und Struktur verantwortlich ist.

## Empfohlene naechste Schritte

1. Streumail-Suche und Kontaktqualitaet mit echten Regionen testen.
2. CRM-Paketdarstellung fuer Bulk-Sendungen weiter pruefen.
3. Prompt-/Textstore schrittweise an aktive Routen anbinden.
4. Social-Post-Templates mit echten Anzeigen testen und UX verfeinern.
5. Historische `replacement`-/`backup`-Dateien konsolidieren.
6. Datenmodell fuer Leads, Pakete, Prompttexte und Templates fuer spaetere DB-Migration festziehen.

## Uebergabe-Fazit

Die App ist fachlich bereits breit aufgestellt und deckt die wichtigsten Workflows fuer Jobs-Flow ab: Lead-Findung, Einzelakquise, Streumail-Versand, CRM-Nachverfolgung, Promptpflege und Social-Content. Der groesste Wert liegt derzeit im Zusammenspiel von Streumail, CRM und Mailhistorie.

Fuer die Weiterentwicklung ist wichtig, bestehende stabile Bereiche nicht durch grosse Umbauten zu gefaehrden. Sinnvoll sind kleine, pruefbare Schritte: reale Suchlaeufe, bessere Prompt-Anbindung, Konsolidierung historischer Dateien und spaeter eine robuste Datenhaltung.
