# Guardrails / Schutzliste

Diese Datei ist die kurze, leicht pflegbare Schutzliste fuer stabile Bereiche im Projekt.

Der mittlere Schutzmodus laeuft bewusst ohne Branch Protection, verpflichtende CODEOWNERS oder Husky-/Pre-Commit-Pflicht. Technische Pruefung:

```bash
npm run check:protected
```

## Schutzstufen

### `geschuetzt`
- keine strukturellen Umbauten ohne Rueckfrage
- nur gezielte Bugfixes oder klar begrenzte Erweiterungen
- funktionierende Logik nicht still ersetzen
- vor jeder geplanten Aenderung in diesem Bereich erst Freigabe beim Nutzer einholen
- `npm run check:protected` blockiert rote Dateien ohne `ALLOW_PROTECTED_CHANGES=1`

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
- `app/api/crm/bulk-packages/route.ts`
- `app/api/send-mail/route.ts`
- `app/api/send-bulk-mail/route.ts`
- `lib/leadStore.ts`
- `lib/bulkPackageStore.ts`
- `lib/textControllingStore.ts`
- `lib/reminderStore.ts`

## Kritikalitaet innerhalb von `geschuetzt`

### `rot`
Bei einer geplanten Aenderung in diesen Bereichen erst mit roter Warnung Rueckfrage halten:
- `lib/leadStore.ts`
- `lib/bulkPackageStore.ts`
- `lib/textControllingStore.ts`
- `lib/reminderStore.ts`
- `app/api/send-bulk-mail/route.ts`
- `app/api/send-mail/route.ts`
- `app/api/crm/leads/route.ts`
- `app/api/crm/bulk-packages/route.ts`
- `data/*.json` darf niemals fuer normale Code-Aenderungen veraendert, gestaged, committed oder gepusht werden

Rote Dateien blockieren `npm run check:protected`, solange `ALLOW_PROTECTED_CHANGES` nicht auf `1` gesetzt ist. Mit Allow-Flag wird nur gewarnt.

### `gelb`
Bei einer geplanten Aenderung in diesen Bereichen mit gelber Warnung Rueckfrage halten:
- `app/api/crm/emails/route.ts`
- `app/api/crm/send-reminder/route.ts`
- `app/crm/page.tsx`
- `app/photo/page.replacement.tsx`
- `app/photo/page.replacement.v4.tsx`
- `app/photo/BulkLeadsTable.replacement.v4.tsx`
- `app/prompts-text/page.tsx`
- `lib/promptTextStore.ts`
- `app/api/bulk-find-leads/route.ts`
- `app/api/bulk-collect-contact/route.ts`
- `app/api/generate-bulk-email/route.ts`

Gelbe Dateien warnen bei `npm run check:protected`, blockieren aber nicht.

### `orange`
Wenn zwei oder mehr aktive UI-Kerndateien gleichzeitig geaendert sind, blockiert `npm run check:protected` ohne Allow-Flag:
- `app/photo/page.replacement.tsx`
- `app/photo/page.replacement.v4.tsx`
- `app/photo/BulkLeadsTable.replacement.v4.tsx`
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

## Unveraenderliche Arbeitsdaten

CRM-, Paket-, Reminder-, Textcontrolling- und Mailprotokolle sind Laufzeitdaten. Sie duerfen nicht automatisch veraendert werden.

Keine Reset-, Seed-, Cleanup-, Migrations-, Backfill- oder Formatierungsaktionen gegen:
- `data/leads.json`
- `data/bulkPackages.json`
- `data/textControlling.json`
- `data/reminders.json`
- `data/promptTextEntries.json`
- `data/socialPostTemplates.json`

Keine Migrationen oder Backfills ohne ausdrueckliche Freigabe.

`data/*.json` blockiert `npm run check:protected` immer, auch wenn `ALLOW_PROTECTED_CHANGES=1` gesetzt ist.

Bewusste rote Aenderung pruefen:

```bash
ALLOW_PROTECTED_CHANGES=1 npm run check:protected
```

PowerShell:

```powershell
$env:ALLOW_PROTECTED_CHANGES="1"; npm run check:protected; Remove-Item Env:\ALLOW_PROTECTED_CHANGES
```

Vor jedem `cup`:
- `git status --short` pruefen
- keine Laufzeitdaten committen: `data/leads.json`, `data/bulkPackages.json`, `data/textControlling.json`, `data/reminders.json`, `data/promptTextEntries.json`, `data/socialPostTemplates.json`
- wenn eine dieser Dateien auftaucht: stoppen und erst klaeren, niemals einfach mitstagen
