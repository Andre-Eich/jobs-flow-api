export type CrmMeta = {
  kind?: "single" | "bulk";
  jobTitle?: string;
  company?: string;
  contactPerson?: string;
  phone?: string;
  followUp?: boolean;
  originalEmailId?: string;
  batchId?: string;
  searchLocation?: string;
  radiusKm?: string;
  textBlockTitles?: string[];
  shortMode?: boolean;
  testMode?: boolean;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeCrmMeta(meta: CrmMeta): CrmMeta {
  return {
    kind: meta.kind === "bulk" ? "bulk" : "single",
    jobTitle: safeString(meta.jobTitle),
    company: safeString(meta.company),
    contactPerson: safeString(meta.contactPerson),
    phone: safeString(meta.phone),
    followUp: Boolean(meta.followUp),
    originalEmailId: safeString(meta.originalEmailId),
    batchId: safeString(meta.batchId),
    searchLocation: safeString(meta.searchLocation),
    radiusKm: safeString(meta.radiusKm),
    textBlockTitles: Array.isArray(meta.textBlockTitles)
      ? meta.textBlockTitles.map((item) => safeString(item)).filter(Boolean)
      : [],
    shortMode: Boolean(meta.shortMode),
    testMode: Boolean(meta.testMode),
  };
}

export function buildCrmMetaText(meta: CrmMeta) {
  return `[CRM_META] ${JSON.stringify(normalizeCrmMeta(meta))}`;
}

export function buildCrmMetaHtmlComment(meta: CrmMeta) {
  return `<!-- CRM_META ${escapeHtml(JSON.stringify(normalizeCrmMeta(meta)))} -->`;
}

export function extractCrmMeta(text: string): CrmMeta {
  if (!text) return {};

  const crmPlainTextMatch = text.match(/\[CRM_META\]\s*(\{[\s\S]*?\})/);
  if (crmPlainTextMatch?.[1]) {
    try {
      return normalizeCrmMeta(JSON.parse(crmPlainTextMatch[1]));
    } catch {
      // ignore
    }
  }

  const crmHtmlCommentMatch = text.match(/CRM_META\s+(\{[\s\S]*?\})/);
  if (crmHtmlCommentMatch?.[1]) {
    try {
      return normalizeCrmMeta(JSON.parse(crmHtmlCommentMatch[1]));
    } catch {
      // ignore
    }
  }

  const bulkPlainTextMatch = text.match(/\[BULK_META:(\{[\s\S]*?\})\]/);
  if (bulkPlainTextMatch?.[1]) {
    try {
      const parsed = JSON.parse(bulkPlainTextMatch[1]);
      return normalizeCrmMeta({
        kind: "bulk",
        company: parsed?.company,
        contactPerson: parsed?.contactPerson,
        phone: parsed?.phone,
        batchId: parsed?.batchId,
        searchLocation: parsed?.searchLocation,
        radiusKm: parsed?.radiusKm,
        textBlockTitles: parsed?.textBlockTitles,
        shortMode: parsed?.shortMode,
        testMode: parsed?.testMode,
      });
    } catch {
      // ignore
    }
  }

  const bulkHtmlCommentMatch = text.match(/BULK_META:?\s*(\{[\s\S]*?\})/);
  if (bulkHtmlCommentMatch?.[1]) {
    try {
      const parsed = JSON.parse(bulkHtmlCommentMatch[1]);
      return normalizeCrmMeta({
        kind: "bulk",
        company: parsed?.company,
        contactPerson: parsed?.contactPerson,
        phone: parsed?.phone,
        batchId: parsed?.batchId,
        searchLocation: parsed?.searchLocation,
        radiusKm: parsed?.radiusKm,
        textBlockTitles: parsed?.textBlockTitles,
        shortMode: parsed?.shortMode,
        testMode: parsed?.testMode,
      });
    } catch {
      // ignore
    }
  }

  return {};
}
