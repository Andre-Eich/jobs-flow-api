import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "textControlling.json");
const backupRoot = path.join(process.cwd(), "data", "backups");

export type TextControllingEntry = {
  id: string;
  createdAt: string;
  emailId?: string;
  jobTitle: string;
  company: string;
  postalCode?: string;
  city?: string;
  contactPerson?: string;
  phone?: string;
  website?: string;
  industry?: string;
  recipientEmail: string;
  subject: string;
  bodyText?: string;
  hookBaseId: string;
  hookBaseLabel: string;
  hookVariantId: string;
  hookText: string;
  followUp: boolean;
  originalEmailId?: string;
  batchId?: string;
  kind?: "single" | "bulk";
  searchLocation?: string;
  radiusKm?: string;
  textBlockTitles?: string[];
  shortMode?: boolean;
  testMode?: boolean;
  opened?: boolean;
  lastEvent?: string;
  reminderSent?: boolean;
};

function readJsonArray(file: string) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, ""));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function findTextControllingBackups(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...findTextControllingBackups(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name === "textControlling.json") {
      result.push(entryPath);
    }
  }

  return result;
}

function restoreTextControllingFromBackupIfPossible() {
  const backupPath = findTextControllingBackups(backupRoot)
    .map((currentPath) => ({
      path: currentPath,
      mtime: fs.statSync(currentPath).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .find((entry) => readJsonArray(entry.path).length > 0)?.path;

  if (!backupPath) return false;

  fs.copyFileSync(backupPath, filePath);
  return true;
}

function ensureFile() {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    if (!restoreTextControllingFromBackupIfPossible()) {
      fs.writeFileSync(filePath, "[]", "utf-8");
    }
    return;
  }

  if (readJsonArray(filePath).length === 0) {
    restoreTextControllingFromBackupIfPossible();
  }
}

export function getTextControllingEntries(): TextControllingEntry[] {
  try {
    ensureFile();
    return readJsonArray(filePath);
  } catch {
    return [];
  }
}

export function saveTextControllingEntry(entry: TextControllingEntry) {
  ensureFile();
  const entries = getTextControllingEntries();
  entries.unshift(entry);
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
}

export function updateTextControllingEntry(
  id: string,
  updates: Partial<TextControllingEntry>
) {
  ensureFile();
  const entries = getTextControllingEntries();
  const index = entries.findIndex((item) => item.id === id);

  if (index === -1) return;

  entries[index] = {
    ...entries[index],
    ...updates,
  };

  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
}

export type HookVariantStats = {
  hookVariantId: string;
  hookText: string;
  sent: number;
  opened: number;
  openRate: number;
  reminderSent: number;
  reminderRate: number;
};

export type HookBaseStats = {
  hookBaseId: string;
  hookBaseLabel: string;
  sent: number;
  opened: number;
  openRate: number;
  reminderSent: number;
  reminderRate: number;
  bestVariantId: string;
  bestVariantOpenRate: number;
  variants: HookVariantStats[];
};

export function buildHookStats(
  entries: TextControllingEntry[]
): HookBaseStats[] {
  const baseMap = new Map<string, TextControllingEntry[]>();

  for (const entry of entries) {
    const key = entry.hookBaseId;
    const list = baseMap.get(key) || [];
    list.push(entry);
    baseMap.set(key, list);
  }

  const result: HookBaseStats[] = [];

  for (const [hookBaseId, baseEntries] of baseMap.entries()) {
    const hookBaseLabel = baseEntries[0]?.hookBaseLabel || hookBaseId;

    const sent = baseEntries.length;
    const opened = baseEntries.filter((item) => item.opened).length;
    const reminderSent = baseEntries.filter((item) => item.reminderSent).length;

    const variantMap = new Map<string, TextControllingEntry[]>();

    for (const entry of baseEntries) {
      const key = entry.hookVariantId;
      const list = variantMap.get(key) || [];
      list.push(entry);
      variantMap.set(key, list);
    }

    const variants: HookVariantStats[] = Array.from(variantMap.entries()).map(
      ([hookVariantId, variantEntries]) => {
        const variantSent = variantEntries.length;
        const variantOpened = variantEntries.filter((item) => item.opened).length;
        const variantReminderSent = variantEntries.filter(
          (item) => item.reminderSent
        ).length;

        return {
          hookVariantId,
          hookText: variantEntries[0]?.hookText || "",
          sent: variantSent,
          opened: variantOpened,
          openRate: variantSent ? variantOpened / variantSent : 0,
          reminderSent: variantReminderSent,
          reminderRate: variantSent ? variantReminderSent / variantSent : 0,
        };
      }
    );

    variants.sort((a, b) => b.openRate - a.openRate || b.sent - a.sent);

    const bestVariant = variants[0];

    result.push({
      hookBaseId,
      hookBaseLabel,
      sent,
      opened,
      openRate: sent ? opened / sent : 0,
      reminderSent,
      reminderRate: sent ? reminderSent / sent : 0,
      bestVariantId: bestVariant?.hookVariantId || "-",
      bestVariantOpenRate: bestVariant?.openRate || 0,
      variants,
    });
  }

  result.sort((a, b) => b.sent - a.sent);

  return result;
}
