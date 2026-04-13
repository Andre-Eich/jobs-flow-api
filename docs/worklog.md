# Worklog

## 2026-04-13

### Heute umgesetzt

- Hauptnavigation weiter ausgebaut:
- `CRM`
- `Prompts & Texte`
- `Social Posts`

- Kaltakquise- und Streumail-Bereiche fachlich sauberer getrennt:
- rechte Seitenleiste in den Arbeitsbereichen heisst `Historie`
- zentrales CRM ist eigener Service

- CRM deutlich erweitert:
- Lead-basierte Sicht
- Gesendete Mails pro Lead
- Sammel-Erinnerungen
- Tabellenansicht mit Pagination und Mehrfachauswahl

- Streumails weiter professionalisiert:
- Google Maps Platform statt Brave fuer die Unternehmenssuche
- HR-/Recruiting-Adressen bei Kontaktdatensuche priorisiert
- Bulk-Mails als Pakete im CRM / in der Historie
- Paketlogik fuer Sammelversand stabilisiert
- Bilder, Begruessung und Footer in Bulk-Mails verbessert
- neue Suchoptionen `Nur neue Kontakte` und `Naechste Treffer`

- Reminder-/CRM-Mails verbessert:
- korrekte Grußformel
- gleiche Footer-/Bildlogik wie bei Streumails

- Social Posts stark erweitert:
- eigener Service mit `Content erstellen` und `Template bearbeiten`
- speicherbare Templates
- breitere Arbeitsflaeche
- finaler PNG-Export der gerenderten Vorschau
- robustere Extraktion fuer Jobtitel und Arbeitgeber
- Template-Editor mit Schriftarten-Auswahl, Bold-/Heavy-Kennzeichnung und sichtbaren Bildflaechen

- Doku und Stabilitaet:
- Google-Fonts-Abhaengigkeit fuer Deploy-Stabilitaet entfernt
- `CODEX_CONTEXT.md` angelegt

### Bekannte weiterhin offene Punkte

- `README.md` war veraltet und wurde heute ersetzt; `CODEX_CONTEXT.md` ist noch nicht vollstaendig auf demselben Stand.
- Im Repo liegen weiterhin mehrere `replacement`- und `backup`-Dateien.
- Prompt-/Textverwaltung ist vorhanden, aber noch nicht in allen Services live eingebunden.
- Streumail-Suche und Social-Posts-Extraktion sollten mit mehr echten Produktfaellen gegengeprueft werden.
- JSON-Persistenz bleibt technische Uebergangsloesung.

### Morgen wahrscheinlich sinnvoll

- Streumail-Suche mit realen Suchen gegenpruefen, besonders `Nur neue Kontakte` und `Naechste Treffer`
- Social-Posts-Extraktion mit mehreren echten Anzeigen testen
- `Prompts & Texte` stueckweise an echte Generator-/Mailrouten anbinden
- `replacement`-Dateien konsolidieren oder klarer bereinigen
