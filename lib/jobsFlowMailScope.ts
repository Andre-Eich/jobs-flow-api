import fs from "fs";
import path from "path";

function readJsonArray(filePath: string): unknown[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, ""));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function collectStrings(value: unknown, keys: string[], result: Set<string>) {
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = safeString(record[key]);
    if (candidate) result.add(candidate);
  }
}

export function getKnownJobsFlowResendIds() {
  const ids = new Set<string>();
  const dataDir = path.join(process.cwd(), "data");

  const textEntries = readJsonArray(path.join(dataDir, "textControlling.json"));
  for (const entry of textEntries) {
    collectStrings(entry, ["emailId", "originalEmailId"], ids);
  }

  const leads = readJsonArray(path.join(dataDir, "leads.json"));
  for (const lead of leads) {
    if (!lead || typeof lead !== "object") continue;
    const mails = (lead as { mails?: unknown }).mails;
    if (!Array.isArray(mails)) continue;

    for (const mail of mails) {
      collectStrings(mail, ["emailId", "originalEmailId"], ids);
    }
  }

  const reminders = readJsonArray(path.join(dataDir, "reminders.json"));
  for (const reminder of reminders) {
    collectStrings(reminder, ["emailId"], ids);
  }

  const bulkPackages = readJsonArray(path.join(dataDir, "bulkPackages.json"));
  for (const bulkPackage of bulkPackages) {
    if (!bulkPackage || typeof bulkPackage !== "object") continue;
    const mails = (bulkPackage as { mails?: unknown }).mails;
    if (!Array.isArray(mails)) continue;

    for (const mail of mails) {
      collectStrings(mail, ["emailId", "resendId", "originalEmailId"], ids);
    }
  }

  return ids;
}

export function isKnownJobsFlowEmailId(id: string) {
  const safeId = safeString(id);
  return Boolean(safeId && getKnownJobsFlowResendIds().has(safeId));
}

export function filterJobsFlowEmails<T extends { id?: string }>(emails: T[]) {
  const knownIds = getKnownJobsFlowResendIds();
  return emails.filter((email) => {
    const id = safeString(email.id);
    return Boolean(id && knownIds.has(id));
  });
}
