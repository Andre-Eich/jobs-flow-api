# Technische Projektübersicht

## Projektcharakter

`jobs-flow-api` ist aktuell keine reine API, sondern eine vollständige **Next.js-Anwendung mit UI und serverseitigen API-Routen**.

Das Projekt bündelt mehrere interne KI-gestützte Workflows rund um Stellenanzeigen, Vertriebsautomatisierung und Mailauswertung.

## Produktziel

Die Anwendung soll helfen,
- Stellenanzeigen aus **URLs** oder **Bildern/Screenshots** zu analysieren,
- daraus strukturierte Informationen wie Jobtitel, Firma, Ansprechpartner und E-Mail-Adresse zu extrahieren,
- passende **Kaltakquise-Mails** für ein regionales Stellenportal zu generieren,
- diese Mails zu versenden,
- spätere Follow-ups, CRM-Übersichten und Text-Auswertungen zu unterstützen.

Zusätzlich gibt es einen kleineren separaten Bereich für freie Textgenerierung.

## Hauptbereiche der Anwendung

### 1. Service Text
Freie Generierung deutscher Texte auf Basis von:
- Thema
- Eigenschaften
- gewünschter Wortanzahl

Der Bereich unterstützt Einzelausgabe sowie zwei parallele Varianten.

### 2. Kaltakquise-Mails
Dies ist derzeit der wichtigste Bereich des Produkts.

Unterstützte Schritte:
1. Quelle analysieren (Bild oder URL)
2. Kerndaten extrahieren
3. Vertriebs-Mail generieren
4. Testversand oder Produktivversand
5. Versandhistorie im CRM anzeigen
6. Follow-up-/Reminder-Kandidaten erkennen
7. Hook-/Text-Auswertungen anzeigen

### 3. Streumail / Bulk
Es existiert bereits eine UI für einen Streumail-Workflow.

Aktueller Stand:
- Firmenlisten werden aktuell noch über MVP-/Mock-Logik erzeugt
- Analyse, Datensammlung und Qualitätsbewertung sind noch nicht an echte externe Datenquellen angebunden

### 4. Text Generator
Der Bereich ist aktuell noch nicht umgesetzt und im Frontend nur als Platzhalter vorhanden.

## Technologiestack

- **Framework:** Next.js 16
- **Frontend:** React 19
- **Sprache:** TypeScript
- **KI-Integration:** OpenAI API
- **Mailversand / Maildaten:** Resend
- **Aktuelle Persistenz:** JSON-Dateien im lokalen Dateisystem (`data/`)

## Verzeichnisstruktur

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

## Kern-Workflow: Kaltakquise-Mail

### Schritt 1: Quelle analysieren
Es gibt zwei Analysepfade:

#### A. Bildanalyse
- Nutzer lädt ein Bild / Screenshot / Foto einer Stellenanzeige hoch
- Das Bild wird serverseitig verarbeitet und an OpenAI übergeben
- Ergebnis:
  - Jobtitel
  - Firmenname
  - Ansprechpartner
  - E-Mail-Adresse
  - optionale Alternativen je Feld
  - erster Mail-Vorschlag

#### B. URL-Analyse
- Nutzer gibt eine URL zu einer Stellenanzeige ein
- Der Server lädt die Seite, entfernt grob HTML-Sonderbereiche und extrahiert den sichtbaren Text
- Der bereinigte Text wird an OpenAI gesendet
- Ergebnis ist strukturell identisch zur Bildanalyse

### Schritt 2: Mail generieren
Die Route `regenerate-email` erzeugt eine kurze Vertriebs-Mail auf Basis der strukturierten Daten.

Unterstützte Elemente:
- verschiedene Hook-Basen
- zufällige Varianten pro Hook-Basis
- Follow-up-Modus
- zusätzliche Hinweise wie Social Media, Print, Multiposting oder mehrere Jobs

### Schritt 3: Mail versenden
Die Route `send-mail` übernimmt:
- Generierung einer Betreffzeile
- Aufbau von Text- und HTML-Version
- Ergänzung eines Abschluss- und Signaturblocks
- Versand über Resend
- Speichern von einfachen Text-Controlling-Daten

### Schritt 4: CRM und Follow-up
Über die CRM-Routen können gesendete Mails geladen und dargestellt werden.

Dazu gehören:
- Mail-Historie
- Mail-Detailansicht
- Filterung nach Unternehmen oder Domain
- Reminder-Kandidaten nach Zeitlogik

### Schritt 5: Text- und Hook-Auswertung
Gesendete Hooks und Varianten werden lokal gespeichert und mit Resend-Ereignissen abgeglichen.

Ausgewertet werden unter anderem:
- Anzahl gesendeter Mails je Hook-Basis
- Öffnungsrate je Hook-Basis
- Öffnungsrate je Hook-Variante
- Reminder-Quote
- Bestperformer je Hook-Basis

## Bekannte architektonische Schwächen

### 1. Repo-Name passt nur teilweise
Der Name `jobs-flow-api` beschreibt das tatsächliche Projekt nur ungenau, weil Frontend, CRM und UI-Logik ebenfalls Teil des Repos sind.

### 2. Persistenz ist aktuell MVP-Niveau
Text-Controlling und Reminder werden aktuell in JSON-Dateien gespeichert:
- `data/textControlling.json`
- `data/reminders.json`

Das ist für lokale Entwicklung brauchbar, aber keine robuste Langfristlösung für produktiven Betrieb.

### 3. Business-Logik ist teilweise dupliziert
Prompt-Bestandteile, Hint-Mappings und Teile der Verarbeitungslogik liegen in mehreren API-Routen in ähnlicher Form vor.

### 4. CRM-/Reminder-Datenfluss sollte stabilisiert werden
Der Bereich um CRM-Metadaten, Follow-up-Zuordnung und Reminder-Status sollte explizit überprüft und vereinheitlicht werden.

### 5. Bulk-Bereich ist noch nicht echt angebunden
Der Streumail-Bereich bildet den Prozess schon ab, läuft aber noch nicht auf einer echten Lead-Quelle.

## Empfohlene nächste Schritte

### Kurzfristig
1. README projektspezifisch erneuern
2. CRM-Metadaten beim Versand sauber und strukturiert mitspeichern
3. Reminder-/Follow-up-Logik technisch prüfen
4. gemeinsame Prompt- und Hint-Logik in `lib/` auslagern

### Mittelfristig
1. JSON-Dateien durch echte Datenbank ersetzen
2. Bulk-/Streumail an echte Lead-Suche anbinden
3. saubere Trennung zwischen UI, Domain-Logik und Integrationen ausbauen

## Hinweise für neue Chats / neue Mitwirkende

Damit neue Arbeitskontexte schnell wieder in das Projekt einsteigen können, sollten dauerhaft folgende Informationen im Repo gepflegt werden:
- README mit Produktziel und Setup
- technische Projektübersicht
- aktueller Stand
- nächste Schritte / Backlog
- optional zusätzliche Dateien wie `docs/roadmap.md`
