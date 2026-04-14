import fs from "fs";
import path from "path";
import { getTextControllingEntries, type TextControllingEntry } from "@/lib/textControllingStore";

const filePath = path.join(process.cwd(), "data", "leads.json");

export type LeadChannel = "kaltakquise" | "streumail" | "mixed";

export type LeadMailRecord = {
  id: string;
  emailId: string;
  createdAt: string;
  subject: string;
  bodyText: string;
  textBlockTitles: string[];
  shortMode: boolean;
  testMode: boolean;
  channel: "kaltakquise" | "streumail";
  followUp: boolean;
  originalEmailId: string;
};

export type LeadRecord = {
  id: string;
  company: string;
  postalCode: string;
  city: string;
  recipientEmail: string;
  phone: string;
  website: string;
  contactPerson: string;
  industry: string;
  channel: LeadChannel;
  createdAt: string;
  updatedAt: string;
  mails: LeadMailRecord[];
};

export type UpsertLeadMailInput = {
  company: string;
  postalCode?: string;
  city?: string;
  recipientEmail: string;
  phone?: string;
  website?: string;
  contactPerson?: string;
  industry?: string;
  channel: "kaltakquise" | "streumail";
  mail: LeadMailRecord;
};

export type UpsertLeadInput = {
  company: string;
  postalCode?: string;
  city?: string;
  recipientEmail?: string;
  phone?: string;
  website?: string;
  contactPerson?: string;
  industry?: string;
  channel: "kaltakquise" | "streumail";
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

function normalizeCompany(company: string) {
  return company
    .toLowerCase()
    .replace(/\b(gmbh|mbh|ag|ug|kg|e\.v\.|ev|stadt|gemeinde)\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWebsite(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.trim();
  }
}

function deriveChannel(current: LeadChannel | "", next: "kaltakquise" | "streumail") {
  if (!current) return next;
  if (current === next) return current;
  return "mixed";
}

function deriveLocationParts(args: {
  postalCode?: string;
  city?: string;
}) {
  const explicitPostalCode = safeString(args.postalCode);
  const explicitCity = safeString(args.city);

  if (explicitPostalCode || explicitCity) {
    return {
      postalCode: explicitPostalCode,
      city: explicitCity,
    };
  }

  return {
    postalCode: "",
    city: "",
  };
}

function normalizeLeadMail(mail: LeadMailRecord): LeadMailRecord {
  return {
    id: safeString(mail.id) || crypto.randomUUID(),
    emailId: safeString(mail.emailId),
    createdAt: safeString(mail.createdAt) || new Date().toISOString(),
    subject: safeString(mail.subject),
    bodyText: safeString(mail.bodyText),
    textBlockTitles: Array.isArray(mail.textBlockTitles)
      ? mail.textBlockTitles.map((item) => safeString(item)).filter(Boolean)
      : [],
    shortMode: Boolean(mail.shortMode),
    testMode: Boolean(mail.testMode),
    channel: mail.channel === "streumail" ? "streumail" : "kaltakquise",
    followUp: Boolean(mail.followUp),
    originalEmailId: safeString(mail.originalEmailId),
  };
}

function normalizeLeadRecord(lead: LeadRecord): LeadRecord {
  const mails = Array.isArray(lead.mails) ? lead.mails.map((mail) => normalizeLeadMail(mail)) : [];

  return {
    id: safeString(lead.id) || crypto.randomUUID(),
    company: safeString(lead.company),
    postalCode: safeString(lead.postalCode),
    city: safeString(lead.city),
    recipientEmail: safeString(lead.recipientEmail),
    phone: safeString(lead.phone),
    website: normalizeWebsite(safeString(lead.website)),
    contactPerson: safeString(lead.contactPerson),
    industry: safeString(lead.industry),
    channel:
      lead.channel === "kaltakquise" || lead.channel === "streumail" || lead.channel === "mixed"
        ? lead.channel
        : "kaltakquise",
    createdAt: safeString(lead.createdAt) || new Date().toISOString(),
    updatedAt: safeString(lead.updatedAt) || new Date().toISOString(),
    mails: mails.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  };
}

export function getLeads() {
  try {
    ensureFile();
    const file = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(file);
    return Array.isArray(parsed) ? parsed.map((item) => normalizeLeadRecord(item)) : [];
  } catch {
    return [];
  }
}

function saveLeads(leads: LeadRecord[]) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(leads, null, 2), "utf-8");
}

function findLeadIndex(leads: LeadRecord[], input: UpsertLeadMailInput) {
  const normalizedEmail = safeString(input.recipientEmail).toLowerCase();
  const normalizedWebsite = normalizeWebsite(safeString(input.website)).toLowerCase();
  const normalizedName = normalizeCompany(input.company);
  const normalizedCity = safeString(input.city).toLowerCase();

  return leads.findIndex((lead) => {
    const emailMatch =
      normalizedEmail && safeString(lead.recipientEmail).toLowerCase() === normalizedEmail;
    const websiteMatch =
      normalizedWebsite && normalizeWebsite(safeString(lead.website)).toLowerCase() === normalizedWebsite;
    const companyMatch =
      normalizedName &&
      normalizeCompany(lead.company) === normalizedName &&
      (!normalizedCity || safeString(lead.city).toLowerCase() === normalizedCity);

    return emailMatch || websiteMatch || companyMatch;
  });
}

function findLeadIndexByLeadData(leads: LeadRecord[], input: UpsertLeadInput) {
  const normalizedEmail = safeString(input.recipientEmail).toLowerCase();
  const normalizedWebsite = normalizeWebsite(safeString(input.website)).toLowerCase();
  const normalizedName = normalizeCompany(input.company);
  const normalizedCity = safeString(input.city).toLowerCase();

  return leads.findIndex((lead) => {
    const emailMatch =
      normalizedEmail && safeString(lead.recipientEmail).toLowerCase() === normalizedEmail;
    const websiteMatch =
      normalizedWebsite &&
      normalizeWebsite(safeString(lead.website)).toLowerCase() === normalizedWebsite;
    const companyMatch =
      normalizedName &&
      normalizeCompany(lead.company) === normalizedName &&
      (!normalizedCity || safeString(lead.city).toLowerCase() === normalizedCity);

    return emailMatch || websiteMatch || companyMatch;
  });
}

export function upsertLead(input: UpsertLeadInput) {
  const safeEmail = safeString(input.recipientEmail);
  const safeCompany = safeString(input.company);

  if (!safeEmail && !safeCompany) {
    return null;
  }

  const leads = getLeads();
  const index = findLeadIndexByLeadData(leads, {
    ...input,
    recipientEmail: safeEmail,
    company: safeCompany,
  });
  const location = deriveLocationParts({
    postalCode: input.postalCode,
    city: input.city,
  });
  const now = new Date().toISOString();

  if (index === -1) {
    const createdLead: LeadRecord = normalizeLeadRecord({
      id: crypto.randomUUID(),
      company: safeCompany,
      postalCode: location.postalCode,
      city: location.city,
      recipientEmail: safeEmail,
      phone: safeString(input.phone),
      website: normalizeWebsite(safeString(input.website)),
      contactPerson: safeString(input.contactPerson),
      industry: safeString(input.industry),
      channel: input.channel,
      createdAt: now,
      updatedAt: now,
      mails: [],
    });

    leads.unshift(createdLead);
    saveLeads(leads);
    return createdLead;
  }

  const existing = leads[index];

  leads[index] = normalizeLeadRecord({
    ...existing,
    company: safeCompany || existing.company,
    postalCode: location.postalCode || existing.postalCode,
    city: location.city || existing.city,
    recipientEmail: safeEmail || existing.recipientEmail,
    phone: safeString(input.phone) || existing.phone,
    website: normalizeWebsite(safeString(input.website)) || existing.website,
    contactPerson: safeString(input.contactPerson) || existing.contactPerson,
    industry: safeString(input.industry) || existing.industry,
    channel: deriveChannel(existing.channel, input.channel),
    updatedAt: now,
    mails: existing.mails,
  });

  saveLeads(leads);
  return leads[index];
}

export function upsertLeadMail(input: UpsertLeadMailInput) {
  const safeEmail = safeString(input.recipientEmail);
  const safeCompany = safeString(input.company);

  if (!safeEmail && !safeCompany) {
    return null;
  }

  const leads = getLeads();
  const index = findLeadIndex(leads, { ...input, recipientEmail: safeEmail, company: safeCompany });
  const location = deriveLocationParts({
    postalCode: input.postalCode,
    city: input.city,
  });
  const normalizedMail = normalizeLeadMail(input.mail);
  const now = new Date().toISOString();

  if (index === -1) {
    const createdLead: LeadRecord = normalizeLeadRecord({
      id: crypto.randomUUID(),
      company: safeCompany,
      postalCode: location.postalCode,
      city: location.city,
      recipientEmail: safeEmail,
      phone: safeString(input.phone),
      website: normalizeWebsite(safeString(input.website)),
      contactPerson: safeString(input.contactPerson),
      industry: safeString(input.industry),
      channel: input.channel,
      createdAt: now,
      updatedAt: now,
      mails: [normalizedMail],
    });

    leads.unshift(createdLead);
    saveLeads(leads);
    return createdLead;
  }

  const existing = leads[index];
  const mailIndex = existing.mails.findIndex(
    (mail) => mail.id === normalizedMail.id || (mail.emailId && mail.emailId === normalizedMail.emailId)
  );

  const nextMails =
    mailIndex === -1
      ? [normalizedMail, ...existing.mails]
      : existing.mails.map((mail, currentIndex) =>
          currentIndex === mailIndex ? { ...mail, ...normalizedMail } : mail
        );

  leads[index] = normalizeLeadRecord({
    ...existing,
    company: safeCompany || existing.company,
    postalCode: location.postalCode || existing.postalCode,
    city: location.city || existing.city,
    recipientEmail: safeEmail || existing.recipientEmail,
    phone: safeString(input.phone) || existing.phone,
    website: normalizeWebsite(safeString(input.website)) || existing.website,
    contactPerson: safeString(input.contactPerson) || existing.contactPerson,
    industry: safeString(input.industry) || existing.industry,
    channel: deriveChannel(existing.channel, input.channel),
    updatedAt: now,
    mails: nextMails,
  });

  saveLeads(leads);
  return leads[index];
}

function leadMailFromEntry(entry: TextControllingEntry): LeadMailRecord {
  return normalizeLeadMail({
    id: safeString(entry.id) || crypto.randomUUID(),
    emailId: safeString(entry.emailId),
    createdAt: safeString(entry.createdAt) || new Date().toISOString(),
    subject: safeString(entry.subject),
    bodyText: safeString(entry.bodyText),
    textBlockTitles: Array.isArray(entry.textBlockTitles) ? entry.textBlockTitles : [],
    shortMode: Boolean(entry.shortMode),
    testMode: Boolean(entry.testMode),
    channel: entry.kind === "bulk" ? "streumail" : "kaltakquise",
    followUp: Boolean(entry.followUp),
    originalEmailId: safeString(entry.originalEmailId),
  });
}

export function syncLeadsFromTextControlling() {
  const entries = getTextControllingEntries();
  let leads = getLeads();
  let changed = false;

  for (const entry of entries) {
    const mail = leadMailFromEntry(entry);
    const beforeCount = leads.length;

    upsertLeadMail({
      company: safeString(entry.company),
      postalCode: safeString(entry.postalCode),
      city: safeString(entry.city) || safeString(entry.searchLocation),
      recipientEmail: safeString(entry.recipientEmail),
      phone: safeString(entry.phone),
      website: safeString(entry.website),
      contactPerson: safeString(entry.contactPerson),
      industry: safeString(entry.industry),
      channel: entry.kind === "bulk" ? "streumail" : "kaltakquise",
      mail,
    });

    leads = getLeads();
    if (leads.length !== beforeCount || leads.some((lead) => lead.mails.some((item) => item.id === mail.id))) {
      changed = true;
    }
  }

  return changed ? getLeads() : leads;
}

export function getLeadById(id: string) {
  return syncLeadsFromTextControlling().find((lead) => lead.id === safeString(id)) || null;
}
