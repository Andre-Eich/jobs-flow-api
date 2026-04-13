import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "bulkPackages.json");

export type BulkPackageMailStatus = "planned" | "sending" | "sent" | "failed";

export type BulkPackageMailRecord = {
  id: string;
  leadId: string;
  company: string;
  recipientEmail: string;
  phone: string;
  subject: string;
  textBlockTitles: string[];
  contactPerson: string;
  status: BulkPackageMailStatus;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string;
};

export type BulkPackageRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  searchLocation: string;
  radiusKm: string;
  plannedCount: number;
  textBlockTitles: string[];
  shortMode: boolean;
  testMode: boolean;
  mails: BulkPackageMailRecord[];
};

export type CreateBulkPackageInput = {
  id?: string;
  createdAt?: string;
  searchLocation?: string;
  radiusKm?: string;
  textBlockTitles?: string[];
  shortMode?: boolean;
  testMode?: boolean;
  mails?: Array<Partial<BulkPackageMailRecord>>;
};

function ensureFile() {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf-8");
  }
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMailRecord(mail: Partial<BulkPackageMailRecord>): BulkPackageMailRecord {
  const now = new Date().toISOString();
  const status =
    mail.status === "sending" || mail.status === "sent" || mail.status === "failed"
      ? mail.status
      : "planned";

  return {
    id: safeString(mail.id) || crypto.randomUUID(),
    leadId: safeString(mail.leadId),
    company: safeString(mail.company),
    recipientEmail: safeString(mail.recipientEmail),
    phone: safeString(mail.phone),
    subject: safeString(mail.subject),
    textBlockTitles: Array.isArray(mail.textBlockTitles)
      ? mail.textBlockTitles.map((item) => safeString(item)).filter(Boolean)
      : [],
    contactPerson: safeString(mail.contactPerson),
    status,
    errorMessage: safeString(mail.errorMessage),
    createdAt: safeString(mail.createdAt) || now,
    updatedAt: safeString(mail.updatedAt) || now,
    sentAt: safeString(mail.sentAt),
  };
}

function normalizeBulkPackage(record: Partial<BulkPackageRecord>): BulkPackageRecord {
  const mails = Array.isArray(record.mails)
    ? record.mails.map((mail) => normalizeMailRecord(mail))
    : [];
  const createdAt = safeString(record.createdAt) || new Date().toISOString();

  return {
    id: safeString(record.id) || crypto.randomUUID(),
    createdAt,
    updatedAt: safeString(record.updatedAt) || createdAt,
    searchLocation: safeString(record.searchLocation),
    radiusKm: safeString(record.radiusKm),
    plannedCount:
      typeof record.plannedCount === "number" && Number.isFinite(record.plannedCount)
        ? record.plannedCount
        : mails.length,
    textBlockTitles: Array.isArray(record.textBlockTitles)
      ? record.textBlockTitles.map((item) => safeString(item)).filter(Boolean)
      : [],
    shortMode: Boolean(record.shortMode),
    testMode: Boolean(record.testMode),
    mails,
  };
}

export function getBulkPackages() {
  try {
    ensureFile();
    const file = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(file);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => normalizeBulkPackage(item))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : [];
  } catch {
    return [];
  }
}

function saveBulkPackages(packages: BulkPackageRecord[]) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(packages, null, 2), "utf-8");
}

export function createBulkPackage(input: CreateBulkPackageInput) {
  const packages = getBulkPackages();
  const now = safeString(input.createdAt) || new Date().toISOString();
  const created = normalizeBulkPackage({
    id: safeString(input.id) || crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    searchLocation: safeString(input.searchLocation),
    radiusKm: safeString(input.radiusKm),
    plannedCount: Array.isArray(input.mails) ? input.mails.length : 0,
    textBlockTitles: Array.isArray(input.textBlockTitles) ? input.textBlockTitles : [],
    shortMode: Boolean(input.shortMode),
    testMode: Boolean(input.testMode),
    mails: Array.isArray(input.mails)
      ? input.mails.map((mail) =>
          normalizeMailRecord({
            ...mail,
            createdAt: safeString(mail.createdAt) || now,
            updatedAt: safeString(mail.updatedAt) || now,
          })
        )
      : [],
  });

  const existingIndex = packages.findIndex((item) => item.id === created.id);

  if (existingIndex === -1) {
    packages.unshift(created);
  } else {
    packages[existingIndex] = created;
  }

  saveBulkPackages(packages);
  return created;
}

export function updateBulkPackageMailStatus(args: {
  packageId: string;
  mailId: string;
  status: BulkPackageMailStatus;
  errorMessage?: string;
  subject?: string;
}) {
  const packages = getBulkPackages();
  const packageIndex = packages.findIndex((item) => item.id === safeString(args.packageId));

  if (packageIndex === -1) {
    return null;
  }

  const mailIndex = packages[packageIndex].mails.findIndex(
    (item) => item.id === safeString(args.mailId)
  );

  if (mailIndex === -1) {
    return null;
  }

  const now = new Date().toISOString();
  const current = packages[packageIndex].mails[mailIndex];

  packages[packageIndex].mails[mailIndex] = normalizeMailRecord({
    ...current,
    status: args.status,
    errorMessage:
      args.status === "failed" ? safeString(args.errorMessage) || current.errorMessage : "",
    subject: safeString(args.subject) || current.subject,
    updatedAt: now,
    sentAt: args.status === "sent" ? now : current.sentAt,
  });
  packages[packageIndex] = normalizeBulkPackage({
    ...packages[packageIndex],
    updatedAt: now,
    plannedCount: packages[packageIndex].plannedCount || packages[packageIndex].mails.length,
  });

  saveBulkPackages(packages);
  return packages[packageIndex];
}
