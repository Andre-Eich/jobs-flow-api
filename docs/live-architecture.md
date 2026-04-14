# Live Architecture

Diese Datei beschreibt die aktuell aktiven Service-Einstiege. Ziel ist: genau ein stabiler Einstieg pro Service.

## Aktive Service-Einstiege

| Menüpunkt | Aktive Datei | Lädt aktuell |
| --- | --- | --- |
| `Kaltakquise-Mails` | `app/services/cold-mail-entry.tsx` | `app/photo/page.replacement.tsx` |
| `Streumails` | `app/services/bulk-mail-entry.tsx` | `app/photo/page.replacement.v4.tsx` |
| `CRM` | `app/services/crm-entry.tsx` | `app/crm/page.tsx` |
| `Prompts & Texte` | `app/services/prompts-text-entry.tsx` | `app/prompts-text/page.tsx` |
| `Social Posts` | `app/services/social-posts-entry.tsx` | `app/social-posts/page.tsx` |

## Regeln

- `app/page.tsx` soll nur Navigation und diese Entry-Dateien kennen.
- Service-spezifische Logik soll nicht direkt an Menü-Buttons hängen.
- Wenn sich eine interne Service-Datei ändert, bleibt der Menü-Einstieg stabil.
- Alte `replacement`- oder `backup`-Dateien sind keine offiziellen Menüziele.

## CRM-Performance-Regel

- Die CRM-Liste lädt keine Öffnungsrate.
- Öffnungsrate darf nur im Lead-Dashboard nachgeladen und angezeigt werden.

## Nächste sinnvolle Strukturschritte

- `cold-mail` und `bulk-mail` weiter in kleinere Service-Module zerlegen.
- gemeinsame Mail-Regeln in eine zentrale Prompt-/Rendering-Regeldatei ziehen.
- Legacy-Dateien mittelfristig in einen klaren `legacy/`-Bereich verschieben.
