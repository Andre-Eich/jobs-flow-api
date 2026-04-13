# Technische Projektuebersicht

## Charakter des Repos

`jobs-flow-api` ist aktuell eine Next.js-App mit mehreren fachlich getrennten Services, serverseitigen API-Routen und lokaler JSON-Persistenz. Das Repo enthaelt sowohl Produkt-UI als auch Versand-, CRM-, Such- und Content-Logik.

## Aktuelle Hauptservices

### Service Text

- freier Textservice direkt in `app/page.tsx`
- eigener Prompt fuer freie deutsche Textgenerierung

### Text Generator

- aktuell weiterhin Platzhalter
- bewusst nicht entfernt, aber noch kein ausgebauter Produktbereich

### Kaltakquise-Mails

- Rendert ueber `app/photo/page.replacement.tsx`
- Einzelworkflow fuer Stellenanzeigen aus Bild oder URL
- Unterbereiche:
- Mail generieren und senden
- Erinnerungen
- Texte und Auswertungen
- rechte Spalte ist kontextbezogene `Historie`, nicht das zentrale CRM

### Streumails

- Rendert ueber `app/photo/page.tsx`
- Unternehmenssuche, Analyse, Kontaktdatensuche, Qualitaetsbewertung und Versand
- aktuelle Suchquelle:
- Google Geocoding API
- Places API (New)
- neue Suchlogik:
- `Nur neue Kontakte` gegen CRM-Leads
- `Naechste Treffer` gegen bereits angezeigte Leads desselben Suchkontexts
- rechte Spalte ist kontextbezogene `Historie`, nicht das zentrale CRM

### CRM

- eigene Seite in `app/crm/page.tsx`
- zentrale Lead-Sicht ueber Kaltakquise und Streumails
- Tabellendarstellung mit Pagination, Mehrfachauswahl und Sammel-Erinnerung

### Prompts & Texte

- eigene Seite in `app/prompts-text/page.tsx`
- Karten-Grid fuer Texttypen und Prompts
- Editieren und Speichern ueber `promptTextStore`
- noch nicht in allen Services vollstaendig live verdrahtet

### Social Posts

- eigene Seite in `app/social-posts/page.tsx`
- Bereiche:
- `Content erstellen`
- `Template bearbeiten`
- speicherbare Template-Konfigurationen
- Extraktion aus Jobseiten
- finaler PNG-Export der gerenderten Vorschau

## Persistenz

Der aktuelle Stand speichert Daten in JSON-Dateien unter `data/`.

Wichtige Stores:

- `leadStore.ts`: zentrale Lead-Historie fuer CRM
- `bulkPackageStore.ts`: Streumail-Pakete
- `textControllingStore.ts`: Text- und Mail-Auswertung
- `promptTextStore.ts`: Prompts und Texttypen
- `socialPostTemplateStore.ts`: Social-Post-Templates

Das ist fuer lokale Entwicklung praktikabel, aber weiterhin eine Uebergangsloesung.

## Wichtige API-Bloecke

### Kaltakquise

- `app/api/photo-to-mail/route.ts`
- `app/api/photo-to-mail-url/route.ts`
- `app/api/regenerate-email/route.ts`
- `app/api/send-mail/route.ts`

### Streumails

- `app/api/bulk-find-leads/route.ts`
- `app/api/bulk-analyze-company/route.ts`
- `app/api/bulk-collect-contact/route.ts`
- `app/api/generate-bulk-email/route.ts`
- `app/api/send-bulk-mail/route.ts`

### CRM

- `app/api/crm/leads/route.ts`
- `app/api/crm/emails/route.ts`
- `app/api/crm/send-reminder/route.ts`
- `app/api/crm/bulk-packages/route.ts`

### Social Posts

- `app/api/social-posts/extract/route.ts`
- `app/api/social-posts/template/route.ts`
- `app/api/social-posts/image-proxy/route.ts`

## Aktuelle bekannte Spannungsfelder

### 1. Replacement- und Backup-Dateien

Im Repo liegen weiterhin mehrere `replacement`- und `backup`-Dateien, vor allem im Bereich `app/photo` und bei Bulk-API-Routen. Sie sind aktuell dokumentiert, aber noch nicht konsequent bereinigt.

### 2. Teilweise doppelte oder historisch gewachsene Logik

Einige Bulk-, Prompt- und Mailpfade sind mehrfach iteriert worden. Die aktuelle aktive Logik sitzt in den echten `route.ts`-/`page.tsx`-Dateien, die historischen Varianten sind aber noch vorhanden.

### 3. JSON statt Datenbank

Der Datenstand ist lokal nachvollziehbar, aber fuer groessere Datenmengen, Parallelitaet und Deployments nicht robust genug.

### 4. Social-Posts-Extraktion

Die Extraktion fuer Arbeitgebername und Logo ist deutlich verbessert, sollte aber mit mehr Realbeispielen weiter getestet werden.

### 5. Streumail-Feinschliff

Suche, CRM-Abgleich und Paketdarstellung sind auf gutem Stand, brauchen aber weiterhin Feinschliff bei Suchqualitaet, Treffer-Varianz und Nachbearbeitungs-UX.
