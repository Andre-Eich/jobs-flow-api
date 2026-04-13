# Replacement- und Backup-Dateien

Dieses Repo enthaelt weiterhin mehrere historische `replacement`- und `backup`-Dateien. Sie sind im Alltag leicht zu verwechseln und sollten mittelfristig konsolidiert werden.

## Aktuell aktive Dateien

Die produktiv relevante Logik sitzt derzeit in diesen Dateien:

- `app/page.tsx`
- `app/photo/page.tsx` fuer `Streumails`
- `app/photo/page.replacement.tsx` fuer `Kaltakquise-Mails`
- `app/photo/BulkLeadsTable.replacement.v4.tsx` als aktuell genutzte Bulk-Tabelle
- `app/api/bulk-find-leads/route.ts`
- `app/api/bulk-analyze-company/route.ts`
- `app/api/bulk-collect-contact/route.ts`
- `app/api/generate-bulk-email/route.ts`
- `app/api/send-bulk-mail/route.ts`

## Vorhandene historische Varianten

### Frontend

- `app/photo/page.replacement.v3.tsx`
- `app/photo/page.replacement.v4.tsx`
- `app/photo/page.backup.tsx`
- `app/photo/page.backup.v4.tsx`
- `app/photo/BulkLeadsTable.replacement.v3.tsx`
- `app/photo/BulkLeadsTable.replacement.v5.tsx`
- `app/photo/BulkLeadsTable.next.tsx`

### API

- `app/api/bulk-find-leads/route.replacement.v2.ts`
- `app/api/bulk-analyze-company/route.replacement.v2.ts`
- `app/api/bulk-collect-contact/route.replacement.v2.ts`
- `app/api/bulk-collect-contact/route.replacement.v3.ts`
- `app/api/generate-bulk-email/route.replacement.v2.ts`
- `app/api/send-bulk-mail/route.replacement.v2.ts`
- `app/api/send-bulk-mail/route.replacement.v3.ts`

## Wichtige Hinweise

- Nicht jede Datei mit der hoechsten Versionsnummer ist automatisch die aktive Datei.
- Im Bereich `Kaltakquise-Mails` wird aktuell bewusst `app/photo/page.replacement.tsx` direkt aus `app/page.tsx` gerendert.
- Im Bereich `Streumails` wird aktuell bewusst `app/photo/page.tsx` zusammen mit `app/photo/BulkLeadsTable.replacement.v4.tsx` verwendet.
- Vor Aufraeumarbeiten immer erst pruefen, welche Datei wirklich importiert wird.

## Empfohlener naechster Schritt

Bei Gelegenheit:

1. aktive Dateien eindeutig markieren
2. historische Varianten archivieren oder loeschen
3. `replacement`-Namen nach finaler Uebernahme wieder auf normale Dateinamen zurueckfuehren
