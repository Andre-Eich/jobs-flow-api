# Jobs Flow - Projektkontext fuer Codex

## 1. Projektziel

`jobs-flow-app` ist keine reine API, sondern eine Next.js-Anwendung mit UI und serverseitigen API-Routen.

Ziel des Projekts ist es, mehrere KI-gestuetzte Workflows rund um Recruiting, Stellenanzeigen und Vertriebsansprache zu unterstuetzen.

Im Kern gibt es zwei Hauptanwendungen:

### Kaltakquise-Mails
- Eine Stellenanzeige wird aus URL oder Bild analysiert.
- Daraus werden Jobtitel, Firma, Ansprechpartner und E-Mail-Adresse extrahiert.
- Anschliessend wird eine passende Vertriebs-Mail fuer `jobs-in-berlin-brandenburg.de` generiert und versendet.
- CRM, Follow-ups, Erinnerungen und Textauswertung sind daran angeschlossen.

### Streumail / Bulk Outreach
- Fuer einen Ort oder eine PLZ werden mehrere potenzielle Arbeitgeber gesucht.
- Die Websites werden auf Jobs- und Karriere-Signale geprueft.
- Kontaktdaten werden gesammelt.
- Leads werden bewertet.
- Danach koennen generische, aber anpassbare regionale Vertriebs-Mails im Batch verschickt werden.

Zusaetzlich gibt es einen Bereich fuer Texte und Auswertungen.

## 2. Hauptbereiche der Anwendung

### A. Kaltakquise-Mails
Workflow:
1. Quelle analysieren (Bild oder URL)
2. Strukturierte Daten extrahieren
3. Mail mit KI generieren
4. Test oder produktiv senden
5. CRM-Eintrag anzeigen
6. Reminder oder Follow-up ermoeglichen
7. Hooks oder Texte statistisch auswerten

### B. Streumail
Workflow:
1. Unternehmen fuer Ort oder PLZ finden
2. Websites analysieren
3. Kontaktdaten sammeln
4. Qualitaet einschaetzen
5. Streumail generieren und senden
6. Spaeter CRM-seitig als Paket oder Liste darstellen

### C. Erinnerungen
- Fuer bereits versendete Einzelmails
- Follow-up- und Reminder-Logik
- Separate Reminder-Ansicht

### D. Texte und Auswertungen
- Hook-Basis und Varianten
- Oeffnungsraten
- Reminder-Quoten
- Text-Controlling

## 3. Technischer Stack

- Next.js 16
- React 19
- TypeScript
- OpenAI API
- Resend
- aktuell teilweise lokale JSON-Persistenz in `data/`

## 4. Relevante Bereiche im Code

### Frontend
- `app/photo/page.tsx`
- dort liegen Bulk- oder Streumail-UI, Kaltakquise-UI und CRM-Seitenleiste

### Bulk-Komponenten
- `app/photo/BulkLeadsTable.tsx`
- Tabellenlogik fuer:
- Auswahl
- Analyse
- Kontaktdaten
- Qualitaet
- Senden
- Sortierung
- Batch-Aktionen

### API-Routen
- `app/api/photo-to-mail/route.ts`
- `app/api/photo-to-mail-url/route.ts`
- `app/api/regenerate-email/route.ts`
- `app/api/send-mail/route.ts`

Bulk-spezifisch:
- `app/api/bulk-find-leads/route.ts`
- `app/api/bulk-analyze-company/route.ts`
- `app/api/bulk-collect-contact/route.ts`
- `app/api/generate-bulk-email/route.ts`
- `app/api/send-bulk-mail/route.ts`

### CRM und Textdaten
- `app/api/crm/...`
- `lib/textControllingStore.ts`
- `lib/reminderStore.ts`

## 5. Aktueller Soll-Zustand fuer Streumail

### 5.1 Liste finden
Eingaben:
- PLZ oder Ort
- optional Fokus oder Besonderheiten, zum Beispiel Arzt, Pflege, Handwerk oder kleinere Unternehmen

Erwartung:
- Wenn 10, 20 oder 30 Kontakte gewaehlt sind, soll die Suche moeglichst genau diese Anzahl liefern.
- Nicht nur "bis zu", sondern nach Moeglichkeit wirklich die gewaehlte Zielzahl.
- Die Suche soll bei wiederholten Anfragen nicht immer exakt dieselben Unternehmen zeigen.
- Bereits zuletzt gefundene Domains sollen kurzfristig gemerkt werden, damit neue Anfragen mehr Varianz liefern.

### 5.2 Analysieren
Es sollen echte Jobs- und Karriere-Signale erkannt werden.

Wichtige Karriere- oder Job-Signale in URLs oder Unterseiten:
- `karriere`
- `jobs`
- `stellen`
- `stellenangebote`
- `stellenausschreibungen`
- `bewerbung`
- `offene-stellen`
- `career`
- `join-us`
- `arbeiten-bei`
- `wir-suchen`
- `jobportal`

Wichtig:
- Nicht nur feste Pfade testen.
- Startseite nach relevanten Links durchsuchen.
- Gefundene Karriere- oder Job-Unterseiten zusaetzlich pruefen.
- Grosse Firmen nutzen oft Unterseiten oder externe Karriereportale.

Sortierung der Spalte `Analysieren`:
- 3 Sterne ganz oben
- dann 2
- dann 1
- 0 Sterne oder keine Sterne ganz unten

### 5.3 Kontaktdaten sammeln
Es sollen bevorzugt gesammelt werden:
- E-Mail
- Ansprechpartner
- Branche

Wichtig:
- Verschleierte E-Mails erkennen:
- `[at]`
- `(at)`
- ` at `
- `(dot)`
- `[dot]`
- Falls keine E-Mail gefunden wird, kleine Extrasuche nach `<firma> email` oder `<firma> kontakt email`
- Solche Treffer mit Warnhinweis markieren, zum Beispiel gelbes Warnsymbol mit Tooltip `Vermutlich erkannt, bitte pruefen`
- Mehrere plausible Optionen anbieten
- Beste Option vorausgewaehlt
- 1 bis 2 weitere Optionen als auswaehlbare Badges
- Keine doppelten Vorschlaege anzeigen
- Kontaktdatensuche nicht endlos laufen lassen
- Lieber pragmatisch und schnell
- Harte Begrenzung auf etwa 30 Sekunden je Lauf
- Frueher abbrechen, sobald brauchbare Daten vorliegen

### 5.4 Qualitaet einschaetzen
Lead-Bewertung mit Sternen.

Zusaetzlich rote Warnung, wenn:
- gleiche E-Mail
- gleiche Domain
- oder gleiche Firma
- und in den letzten 14 Tagen bereits eine Streumail oder relevante Mail gesendet wurde

Warnsymbol:
- rot
- mit Tooltip oder Kontext

### 5.5 E-Mail erstellen und senden
Bulk-Mail soll eigene Logik haben, getrennt von der Einzel-Kaltakquise.

Anforderungen:
- eigener Bulk-Prompt
- allgemeiner, regionaler, vertrieblicher
- nicht so tun, als sei eine konkrete einzelne Stellenanzeige exakt geprueft worden
- eher Formulierungen wie:
- zusaetzliche Reichweite
- ergaenzende regionale Sichtbarkeit
- Berlin oder Brandenburg
- unverbindliches Angebot

#### Testmodus
- eigener Checkbox-Schalter fuer Streumail
- wenn aktiv, Versand nur an `TEST_RECIPIENT_EMAIL`

#### Kurze Mail
- eigener Checkbox-Schalter
- wenn aktiv, KI-Haupttext nur 1 bis 2 Saetze
- damit Zusatzbausteine staerker wirken

#### Textbausteine
Oben in der Streumail-UI gibt es auswaehlbare Badges. Jeder Badge enthaelt einen frei bearbeitbaren Textbaustein.

Anforderungen:
- Badge hat Titel und Text
- per kleinem Edit-Icon bearbeitbar
- ausgewaehlte Bausteine werden 1:1 in jede Bulk-Mail eingefuegt
- Einbau eher im unteren Textbereich
- Bausteine sollen nicht durch die KI doppelt oder fast wortgleich vorweggenommen werden

#### Sprachstil
Verbesserungen fuer Bulk-Mails:
- Begruessung muss vorhanden sein
- nach Begruessung neuer Absatz
- weichere Formulierungen
- keine harte Sprache wie `wir platzieren`
- lieber Formulierungen wie `kann helfen`, `laesst sich ergaenzen`, `zusaetzliche Sichtbarkeit`, `regional sichtbar machen`
- Grussformel muss vorhanden sein: `Mit freundlichen Gruessen`

Zusaetzlich:
- frueher waren zwei Bilder in der Mail enthalten
- diese sollen wieder in die Bulk-Mail zurueck

## 6. CRM-Verhalten - gewuenschte Logik

### Kaltakquise-Mails
CRM zeigt Einzelmails.

### Erinnerungen
CRM zeigt Einzelmails und Follow-ups.

### Texte und Auswertungen
CRM zeigt Einzelmails mit Statistikbezug.

### Streumail
CRM soll Pakete oder Listen zeigen, nicht einzelne Mails als Karten.

Kleine Karte:
- `Streumail X`
- Datum
- Baustein

Grosses Popup:
- Firmennamen
- Empfaengeradressen
- verwendete Bausteine
- Kurzmodus ja oder nein
- Testmodus ja oder nein
- Versandzeit
- weitere Details

Wichtig:
- aktuell ist das noch nicht sauber fertig
- Paketlogik fuer Bulk-Sendungen muss noch sauber gruppiert werden

## 7. Wichtige UI-Regeln fuer Streumail

- oben in jeder Spalte Batch-Button
- ganz links `Alle auswaehlen` oder `Alle abwaehlen`
- in den ersten drei Spalten keine Einzelbuttons:
- Analysieren
- Kontaktdaten
- Qualitaet
- Einzelbutton nur in `Email erstellen und senden`
- Sortierung wirkt auf die ganze Liste
- Sortierung pro Spalte moeglich

## 8. Was aktuell noch offen oder fehleranfaellig ist

### Noch offen oder unvollstaendig
- vollstaendige Seitenversion mit allen 4 Hauptbereichen:
- Kaltakquise-Mails
- Streumail
- Erinnerungen
- Texte und Auswertungen
- CRM je nach Hauptbereich unterschiedlich rendern
- Streumail im CRM als Paket statt Einzelmail
- Bilder wieder in Bulk-Mail einbauen
- MFG, Begruessung und weichere Formulierungen endgueltig sauberziehen
- Suchvarianz fuer wiederholte PLZ-Anfragen
- Fokusfeld in Suche besser nutzen
- Paketmetadaten fuer Bulk-Versand vollstaendig nutzen

### Technische Schulden
- viele Aenderungen liegen aktuell teils als `replacement`-Dateien vor
- finale saubere Integration in Originaldateien ist nicht ueberall abgeschlossen
- JSON-Speicherung ist noch Uebergangsloesung

## 9. Arbeitsmodus fuer Codex

Wenn Codex an diesem Projekt arbeitet, dann bitte:

1. Bestehende Hauptfunktionen nicht versehentlich entfernen, insbesondere Kaltakquise-Mails und Erinnerungen.
2. Neue Streumail-Features so integrieren, dass bestehende Services weiter sichtbar bleiben.
3. Bei Refactors immer pruefen:
   obere Navigation vollstaendig
   CRM-Verhalten je Bereich korrekt
   Streumail-Logik getrennt von Einzel-Kaltakquise
4. Lieber kleine, ueberpruefbare Schritte als grosse Komplettumbauten ohne Ruecksicht auf bestehende Flows.

## 10. Priorisierte Roadmap

### Prio 1
- alle 4 Haupttabs wieder sauber in der finalen Seite herstellen
- Streumail-CRM als Pakete gruppieren
- Bulk-Mail-Text final mit Begruessung, Absatz, MFG und weicher Sprache

### Prio 2
- Analyse robuster fuer Karriere-Unterseiten
- Kontaktdatensuche schneller und stabiler
- Alternativ-Badges fuer E-Mail und Ansprechpartner finalisieren
- 14-Tage-Warnlogik sauber machen

### Prio 3
- Suchvarianz oder gemerkte Domains
- Fokusfeld staerker in Suche und Bewertung einbauen
- Bilder wieder in Bulk-Mail
- Datenmodell fuer Bulk-Pakete verbessern

## 11. Kurzfassung fuer Codex

Jobs Flow ist eine Next.js-App fuer:
- KI-gestuetzte Kaltakquise-Mails
- Streumail oder Bulk-Outreach
- CRM, Follow-up und Textauswertungen

Wichtigster aktueller Ausbau:
- Streumail professionell fertigziehen
- ohne die bestehenden Bereiche Kaltakquise und Erinnerungen kaputtzumachen
- CRM fuer Streumail auf Paketdarstellung umstellen
- Bulk-Mail sprachlich und technisch sauber machen

## 12. Schutzliste fuer stabile Bereiche

Diese Schutzliste dient als feste Guardrail fuer kuenftige Aenderungen.

### Schutzstufen

#### `geschuetzt`
- Keine strukturellen Umbauten ohne ausdrueckliche Rueckfrage.
- Nur kleine Bugfixes oder klar begrenzte Erweiterungen.
- Keine stillen Ersetzungen funktionierender bestehender Logik.

#### `nur additiv`
- Bestehende Logik nicht ersetzen.
- Neue Funktionalitaet daneben oder als klar abgegrenzte Erweiterung bauen.
- Bestehende UI, Datenfluesse und API-Verhalten muessen erhalten bleiben.

#### `frei bearbeitbar`
- Normale Aenderungen sind erlaubt.
- Trotzdem bestehende Funktionen vor jedem groesseren Umbau pruefen.

### Aktuelle Schutzliste

#### `geschuetzt`
- `app/crm/page.tsx`
  CRM-Uebersicht, Sortierung, Oeffnungsraten, Lead-Details und Reminder-Auswahl
- `app/api/crm/leads/route.ts`
  CRM-Lead-Aufbereitung, Backfill und Anzeigegrundlage
- `app/api/crm/emails/route.ts`
  Historie, Reminder-Kandidaten und CRM-Meta-Auswertung
- `app/api/send-mail/route.ts`
  Einzelmail-Versand inklusive Signatur, CRM-Meta und Versandlogik
- `app/api/send-bulk-mail/route.ts`
  Streumail-Versand, Bilder, CRM-Meta und Paketstatus
- `lib/leadStore.ts`
  Persistenz der Leads, Mail-Zuordnung und CRM-Datenbasis

#### `nur additiv`
- `app/page.tsx`
  Hauptnavigation und Bereichsumschaltung
- `app/photo/page.tsx`
  Streumail-UI und Bulk-Workflow
- `app/photo/BulkLeadsTable.replacement.v4.tsx`
  Tabellenlogik fuer Auswahl, Analyse, Kontaktdaten, Qualitaet und Versand
- `app/prompts-text/page.tsx`
  Prompt-Pflege, Untermenues und Beispielvorschauen
- `lib/promptTextStore.ts`
  Default-Prompts und Prompt-Speicher
- `app/api/bulk-find-leads/route.ts`
  Listen-Suche und Auswahlmischung
- `app/api/bulk-collect-contact/route.ts`
  Kontaktdatensammlung und Google-Unterstuetzung
- `app/api/generate-bulk-email/route.ts`
  Streumail-Erzeugung aus den Prompt-Bausteinen

#### `frei bearbeitbar`
- `docs/*`
- `CODEX_CONTEXT.md`
- `docs/guardrails.md`

### Arbeitsregel fuer kuenftige Aenderungen

Vor jeder groesseren Aenderung gilt:
1. Pruefen, ob die Datei oder der Bereich in der Schutzliste steht.
2. Bei `geschuetzt` nur gezielt reparieren oder vorher Rueckfrage halten.
3. Bei `nur additiv` bestehende Logik erweitern statt ersetzen.
4. Nach Aenderungen an geschuetzten Bereichen immer mindestens `eslint` und `tsc` laufen lassen.

### Pflege durch den Nutzer

Die Schutzliste kann direkt an zwei Stellen gepflegt werden:
- `CODEX_CONTEXT.md`
- `docs/guardrails.md`

Wenn du einen Bereich staerker absichern willst, verschiebe ihn einfach von
- `frei bearbeitbar` nach `nur additiv`
oder von
- `nur additiv` nach `geschuetzt`
