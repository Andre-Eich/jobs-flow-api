# Replacement files summary

This repo currently contains several replacement files intended for manual local swap-in while the original files remain untouched.

## Latest useful replacements

### Bulk routes
- `app/api/bulk-find-leads/route.replacement.v2.ts`
- `app/api/bulk-analyze-company/route.replacement.v2.ts`
- `app/api/bulk-collect-contact/route.replacement.v3.ts`
- `app/api/generate-bulk-email/route.replacement.v2.ts`
- `app/api/send-bulk-mail/route.replacement.v3.ts`

### Bulk UI
- `app/photo/BulkLeadsTable.replacement.v5.tsx`

## What these latest replacements focus on
- target count filling for bulk search
- focus field support for the search query
- stronger career/jobs/stelle detection during analysis
- obfuscated email normalization like `[at]` and `(at)`
- fallback email search when website extraction fails
- no duplicate email suggestions / no duplicate contact suggestions
- hard timeout and pragmatic early return for contact collection
- softer bulk email wording
- greeting + paragraph structure in generated bulk mail text
- closing safeguard so greeting / closing are not missing
- batch metadata in bulk send route for later package-style CRM grouping

## Manual local swap example (PowerShell)

```powershell
git pull
copy app\api\bulk-find-leads\route.replacement.v2.ts app\api\bulk-find-leads\route.ts
copy app\api\bulk-analyze-company\route.replacement.v2.ts app\api\bulk-analyze-company\route.ts
copy app\api\bulk-collect-contact\route.replacement.v3.ts app\api\bulk-collect-contact\route.ts
copy app\api\generate-bulk-email\route.replacement.v2.ts app\api\generate-bulk-email\route.ts
copy app\api\send-bulk-mail\route.replacement.v3.ts app\api\send-bulk-mail\route.ts
copy app\photo\BulkLeadsTable.replacement.v5.tsx app\photo\BulkLeadsTable.tsx
npm run dev
```

## Important note
A full page replacement that restores all four top-level services and switches CRM behavior by active view still needs a clean final pass before it should replace the current production page.
