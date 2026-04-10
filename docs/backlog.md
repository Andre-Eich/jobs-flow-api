# Backlog

Dieses Dokument bündelt die aktuell wichtigsten Arbeitsblöcke für `jobs-flow-api`.

## P1 – sofort sinnvoll

### 1. README neu schreiben
**Ziel:** Das Standard-README von Next.js durch ein projektspezifisches README ersetzen.

**Soll enthalten:**
- Produktziel
- Kernfunktionen
- Tech-Stack
- Setup
- Umgebungsvariablen
- API-Routen im Überblick
- Arbeitsmodus für neue Chats / neue Entwickler

---

### 2. CRM-Metadaten beim Mailversand sauber speichern
**Ziel:** Jobtitel, Firma, Ansprechpartner, Follow-up-Status und Original-Mail-ID so mitspeichern, dass CRM und Reminder zuverlässig darauf zugreifen können.

**Zu prüfen / umzusetzen:**
- einheitliches Metadatenformat
- strukturierte Speicherung im Mailkontext
- stabile Wiederherstellung in CRM-Routen
- saubere Zuordnung von Follow-up zu Erstmail

---

### 3. Reminder-/Follow-up-Logik prüfen und stabilisieren
**Ziel:** Sicherstellen, dass offene Erinnerungen korrekt erkannt, angezeigt und nicht doppelt verarbeitet werden.

**Zu prüfen / umzusetzen:**
- Reminder-Zeitlogik
- Status- und Zuordnungslogik
- Konsistenz zwischen UI, Versand und CRM-Daten

---

### 4. Gemeinsame Business-Logik aus API-Routen extrahieren
**Ziel:** Duplizierte Logik in zentrale Module verschieben.

**Kandidaten:**
- Hint-Mappings
- Prompt-Bausteine
- Hook-Definitionen
- Hilfsfunktionen für CRM und Normalisierung

---

## P2 – hoher Hebel

### 5. Technische Dokumentation weiter ausbauen
**Ziel:** Das Repo so dokumentieren, dass neue Kontexte schnell arbeitsfähig werden.

**Nächste mögliche Dateien:**
- `README.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/decisions.md`

---

### 6. Bulk-/Streumail-Bereich von Mock auf echte Datenquelle umbauen
**Ziel:** Den vorhandenen Bulk-Workflow mit echter Lead-Recherche und echter Datenanreicherung verbinden.

**Offene Punkte:**
- Datenquelle / APIs
- Qualitätslogik
- Duplikaterkennung
- Versandstrategie
- CRM-Integration

---

### 7. Repo-Namen und Außenstruktur prüfen
**Ziel:** Bewerten, ob `jobs-flow-api` langfristig als Name noch passend ist.

**Optionen:**
- `jobs-flow`
- `jobs-flow-app`
- aktueller Name bleibt bestehen

---

## P3 – mittelfristig

### 8. JSON-Speicherung durch echte Datenbank ersetzen
**Ziel:** Die lokale Speicherung in JSON-Dateien langfristig ablösen.

**Betroffene Bereiche:**
- Text-Controlling
- Reminder
- spätere CRM-Zusatzdaten

**Zu entscheiden:**
- Ziel-Datenbank
- Datenmodell
- Migrationspfad
- Betriebskonzept

---

### 9. Text Generator umsetzen oder klar ausblenden
**Ziel:** Den Platzhalterbereich entweder produktiv machen oder bis dahin bewusst deaktivieren / kennzeichnen.

---

### 10. Test- und Qualitätsstrategie definieren
**Ziel:** Für Mailfluss, Analysepfade und CRM-Logik wiederholbare Prüfungen einführen.

**Mögliche Bausteine:**
- Testfälle für URL-Analyse
- Testfälle für Bildanalyse
- Snapshot-/Golden-Tests für Mailausgaben
- Tests für Reminder-Logik
