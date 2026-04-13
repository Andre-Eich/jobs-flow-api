# Backlog

Dieses Dokument buendelt die naechsten sinnvollen Arbeitsbloecke auf Basis des Standes vom 13.04.2026.

## P1 - naechste praktische Schritte

### 1. Streumail-Suche weiter absichern

- Trefferqualitaet fuer `Naechste Treffer` mit echten Suchlaeufen pruefen
- CRM-Abgleich fuer `Nur neue Kontakte` mit mehr Match-Faellen absichern
- Fokusfeld staerker in Ranking und Query-Varianten einbeziehen

### 2. Social Posts weiter validieren

- Extraktion fuer Arbeitgebername und Logo mit mehr echten Anzeigen gegenpruefen
- Template-Editor weiter UX-seitig verfeinern
- optional echten Bildexport-/Downloadflow mit mehr Testfaellen pruefen

### 3. Prompts & Texte an Live-Logik anbinden

- Streumail-Generator direkt auf gespeicherte Prompt-/Text-Eintraege ziehen
- CRM-Reminder und Footer-/Signaturlogik soweit moeglich an den Store anbinden
- Service Text und weitere Bereiche nachziehen

### 4. README / Kontextdateien synchron halten

- `CODEX_CONTEXT.md` bei Gelegenheit an den aktuellen Service-Stand angleichen
- veraltete Formulierungen zu alten Bulk- und CRM-Zustaenden entfernen

## P2 - strukturelle Verbesserungen

### 5. Replacement-Dateien reduzieren

- aktive Dateien und historische Varianten klarer trennen
- unnoetige `replacement`-/`backup`-Dateien schrittweise abbauen
- dokumentieren, welche Datei aktuell wirklich aktiv ist

### 6. Bulk- und CRM-Logik weiter vereinheitlichen

- Qualitaetsbewertung und 14-Tage-Warnlogik robuster machen
- Paket- und Lead-Sicht noch sauberer zusammenspielen lassen
- Batch-Status und Versandfehler noch klarer im UI sichtbar machen

### 7. Test-Strategie ausbauen

- gezielte Checks fuer Bulk-Suche, CRM-Reminder und Social Posts
- wiederholbare Testfaelle fuer echte Beispielanzeigen
- moeglichst kleine technische Regressionstests einfuehren

## P3 - mittelfristig

### 8. Datenhaltung modernisieren

- JSON-Persistenz durch Datenbank ersetzen
- Datenmodell fuer Leads, Bulk-Pakete, Prompt-Texte und Social-Templates stabilisieren

### 9. Text Generator entscheiden

- entweder produktiv ausbauen
- oder klar als Platzhalter markieren, bis ein echter Use Case umgesetzt wird

### 10. Deploy- und Betriebsstabilitaet verbessern

- externe Abhaengigkeiten weiter minimieren
- Build-/Deploy-Pfade schlank halten
- API-Fehler und Timeouts gezielter sichtbar machen
