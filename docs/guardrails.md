# Guardrails / Schutzliste

Diese Datei ist die kurze, leicht pflegbare Schutzliste fuer stabile Bereiche im Projekt.

## Schutzstufen

### `geschuetzt`
- keine strukturellen Umbauten ohne Rueckfrage
- nur gezielte Bugfixes oder klar begrenzte Erweiterungen
- funktionierende Logik nicht still ersetzen
- vor jeder geplanten Aenderung in diesem Bereich erst Freigabe beim Nutzer einholen

### `nur additiv`
- bestehende Logik erhalten
- neue Logik nur daneben oder als klar abgegrenzte Erweiterung
- keine stillen Komplettumbauten

### `frei bearbeitbar`
- normale Aenderungen erlaubt

## Bereiche

### `geschuetzt`
- `app/crm/page.tsx`
- `app/api/crm/leads/route.ts`
- `app/api/crm/emails/route.ts`
- `app/api/crm/send-reminder/route.ts`
- `app/api/send-mail/route.ts`
- `app/api/send-bulk-mail/route.ts`
- `lib/leadStore.ts`

## Kritikalitaet innerhalb von `geschuetzt`

### `rot`
Bei einer geplanten Aenderung in diesen Bereichen erst mit roter Warnung Rueckfrage halten:
- `lib/leadStore.ts`
- `app/api/send-bulk-mail/route.ts`
- `app/api/send-mail/route.ts`
- `app/api/crm/leads/route.ts`

### `gelb`
Bei einer geplanten Aenderung in diesen Bereichen mit gelber Warnung Rueckfrage halten:
- `app/api/crm/emails/route.ts`
- `app/api/crm/send-reminder/route.ts`
- `app/crm/page.tsx`

### `nur additiv`
- `app/page.tsx`
- `app/photo/page.tsx`
- `app/photo/BulkLeadsTable.replacement.v4.tsx`
- `app/prompts-text/page.tsx`
- `lib/promptTextStore.ts`
- `app/api/bulk-find-leads/route.ts`
- `app/api/bulk-collect-contact/route.ts`
- `app/api/generate-bulk-email/route.ts`

### `frei bearbeitbar`
- `docs/*`
- `CODEX_CONTEXT.md`
- `docs/guardrails.md`

## Wie du sie anpasst

Wenn du einen Bereich besser schuetzen willst:
- Datei in die naechsthoehere Schutzstufe verschieben
- optional kurzen Grund dazuschreiben

Beispiel:
- `app/photo/page.tsx` von `nur additiv` auf `geschuetzt`, wenn die Streumail-UI stabil bleiben soll

## Empfohlene Teamregel

Vor Aenderungen an `geschuetzt` oder `nur additiv`:
- zuerst vorhandene Logik lesen
- bestehendes Verhalten erhalten
- nachher mindestens `eslint` und `tsc --noEmit` pruefen
