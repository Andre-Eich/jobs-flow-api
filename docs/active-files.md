# Aktive Dateien / Arbeitskarte

Stand: 30.04.2026

## Aktive Service-Einstiege

### Streumails

- Entry: `app/services/bulk-mail-entry.tsx`
- Aktive UI: `app/photo/page.replacement.v4.tsx`
- Tabelle: `app/photo/BulkLeadsTable.replacement.v4.tsx`

### Kaltakquise-Mails

- Entry: `app/services/cold-mail-entry.tsx`
- Aktive UI: `app/photo/page.replacement.tsx`

### CRM

- Entry: `app/services/crm-entry.tsx`
- Aktive UI: `app/crm/page.tsx`

### Prompts & Texte

- Entry: `app/services/prompts-text-entry.tsx`
- Aktive UI: `app/prompts-text/page.tsx`

### Social Posts

- Entry: `app/services/social-posts-entry.tsx`
- Aktive UI: `app/social-posts/page.tsx`

## Achtung: historische / nicht aktive Dateien

`app/photo/page.tsx` ist nach aktuellem Service-Entry-Stand nicht der aktive Streumail-Servicepfad.

Vor Arbeiten an `app/photo/page.tsx` immer pruefen, ob die Datei ueberhaupt noch verwendet wird.

Replacement- und Backup-Dateien nicht loeschen oder konsolidieren ohne ausdrueckliche Freigabe.

## Rote Schutzbereiche

Rote Dateien blockieren `npm run check:protected`, sofern `ALLOW_PROTECTED_CHANGES=1` nicht gesetzt ist:

- `lib/leadStore.ts`
- `lib/bulkPackageStore.ts`
- `lib/textControllingStore.ts`
- `lib/reminderStore.ts`
- `app/api/send-mail/route.ts`
- `app/api/send-bulk-mail/route.ts`
- `app/api/crm/leads/route.ts`
- `app/api/crm/emails/route.ts`
- `app/api/crm/bulk-packages/route.ts`
- `app/api/crm/send-reminder/route.ts`

## Gelbe Schutzbereiche

Gelbe Dateien erzeugen Warnungen, blockieren aber nicht:

- `app/photo/page.replacement.tsx`
- `app/photo/page.replacement.v4.tsx`
- `app/photo/BulkLeadsTable.replacement.v4.tsx`
- `app/crm/page.tsx`
- `app/prompts-text/page.tsx`
- `lib/promptTextStore.ts`
- `app/api/bulk-find-leads/route.ts`
- `app/api/bulk-collect-contact/route.ts`
- `app/api/generate-bulk-email/route.ts`

## Orange Mehrfachschutz

Wenn zwei oder mehr aktive UI-Kerndateien gleichzeitig geaendert sind, blockiert `npm run check:protected`:

- `app/photo/page.replacement.tsx`
- `app/photo/page.replacement.v4.tsx`
- `app/photo/BulkLeadsTable.replacement.v4.tsx`
- `app/crm/page.tsx`

Ausnahme nur mit `ALLOW_PROTECTED_CHANGES=1`.

## Niemals automatisch veraendern

Diese Dateien sind Laufzeit-/Protokolldaten:

- `data/leads.json`
- `data/bulkPackages.json`
- `data/textControlling.json`
- `data/reminders.json`
- `data/promptTextEntries.json`
- `data/socialPostTemplates.json`

Nicht loeschen.
Nicht formatieren.
Nicht zuruecksetzen.
Nicht stagen.
Nicht committen.
Nicht fuer Tests ueberschreiben.

Wenn `data/*.json` in `git status --short` auftaucht, immer stoppen und Rueckfrage halten. Diese Regel blockiert auch mit Allow-Flag.

## Schutzcheck

Normale Pruefung:

```bash
npm run check:protected
```

Bewusste Aenderung an roten Dateien:

```bash
ALLOW_PROTECTED_CHANGES=1 npm run check:protected
```

Windows PowerShell:

```powershell
$env:ALLOW_PROTECTED_CHANGES="1"; npm run check:protected; Remove-Item Env:\ALLOW_PROTECTED_CHANGES
```

Gesamter Sicherheitscheck:

```bash
npm run check:safe
```

`check:safe` fuehrt `check:protected`, `lint` und `tsc --noEmit` aus.
