import { NextResponse } from "next/server";

type Confidence = "high" | "medium" | "low";

type EmailOption = {
  email: string;
  source?: string;
  confidence: Confidence;
  needsReview: boolean;
  reason: string;
};

const STANDARD_PATHS = [
  "/",
  "/kontakt",
  "/kontakt/",
  "/impressum",
  "/impressum/",
  "/karriere",
  "/jobs",
  "/offene-stellen",
  "/stellenangebote",
  "/bewerbung",
  "/personal",
];

const RELEVANT_LINK_PATTERN = /(kontakt|impressum|karriere|jobs|stellen|offene-stellen|stellenangebote|bewerbung|career|hr|personal)/i;
const ATS_SUBDOMAIN_PREFIXES = ["bewerbung", "bewerben", "karriere", "jobs", "apply", "career", "recruiting"];
const BAD_PREFIXES = ["noreply", "no-reply", "datenschutz", "privacy", "impressum", "webmaster", "widerruf"];
const HIGH_PREFIXES = ["bewerbung", "jobs", "karriere", "personal", "hr"];
const MEDIUM_PREFIXES = ["kontakt"];
const LOW_PREFIXES = ["info", "office", "mail"];

function safeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).toString();
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      return "";
    }
  }
}

function getBaseUrl(...values: string[]) {
  for (const value of values) {
    const normalized = normalizeUrl(value);
    if (!normalized) continue;

    try {
      const url = new URL(normalized);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return `${url.protocol}//${url.host}`;
      }
    } catch {
      // try next
    }
  }

  return "";
}

function getOrganizationBaseUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const labels = host.split(".").filter(Boolean);
    const subdomain = labels[0] || "";

    if (labels.length <= 2 || !ATS_SUBDOMAIN_PREFIXES.includes(subdomain)) {
      return "";
    }

    return `${url.protocol}//${labels.slice(1).join(".")}`;
  } catch {
    return "";
  }
}

function normalizeObfuscatedEmails(text: string) {
  return text
    .replace(/\s*(?:\[|\()?at(?:\]|\))?\s*/gi, "@")
    .replace(/\s*(?:\[|\()?dot(?:\]|\))?\s*/gi, ".")
    .replace(/\s+@\s+/g, "@")
    .replace(/\s+\.\s+/g, ".");
}

function stripHtml(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&commat;/gi, "@")
    .replace(/&#64;/g, "@")
    .replace(/&period;/gi, ".")
    .replace(/&#46;/g, ".")
    .replace(/\s+/g, " ");
}

function extractEmails(html: string) {
  const mailtoEmails = Array.from(html.matchAll(/mailto:([^"'?&\s>]+)/gi)).map((match) =>
    decodeURIComponent(match[1] || "")
  );
  const normalized = normalizeObfuscatedEmails(stripHtml(html));
  const textEmails = Array.from(
    normalized.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)
  ).map((match) => match[0]);

  return [...mailtoEmails, ...textEmails]
    .map((email) => email.toLowerCase().replace(/[),.;:]+$/g, ""))
    .filter((email) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email));
}

function extractRelevantLinks(html: string, baseUrl: string) {
  const links: string[] = [];

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1] || "";
    const label = stripHtml(match[2] || "");
    if (!RELEVANT_LINK_PATTERN.test(`${href} ${label}`)) continue;

    try {
      const url = new URL(href, baseUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        links.push(url.toString());
      }
    } catch {
      // ignore invalid link
    }
  }

  return Array.from(new Set(links)).slice(0, 5);
}

function classifyEmail(email: string, source: string, companyDomains: string[]): EmailOption | null {
  const [localPart, domain = ""] = email.toLowerCase().split("@");
  const prefix = localPart.split(/[._+-]/)[0] || localPart;

  if (!localPart || !domain || BAD_PREFIXES.includes(prefix)) return null;

  const sameDomain = companyDomains.some(
    (companyDomain) => domain === companyDomain || domain.endsWith(`.${companyDomain}`)
  );
  const sourceLower = source.toLowerCase();

  if (HIGH_PREFIXES.includes(prefix)) {
    return {
      email,
      source,
      confidence: sameDomain ? "high" : "medium",
      needsReview: !sameDomain,
      reason: sameDomain
        ? "Karriere-/Bewerbungsadresse auf Unternehmensdomain"
        : "Karriere-/Bewerbungsadresse, bitte Domain pruefen",
    };
  }

  if (MEDIUM_PREFIXES.includes(prefix)) {
    return {
      email,
      source,
      confidence: sameDomain ? "medium" : "low",
      needsReview: !sameDomain,
      reason: sameDomain ? "Kontaktadresse auf Unternehmensdomain" : "Kontaktadresse, bitte Domain pruefen",
    };
  }

  if (LOW_PREFIXES.includes(prefix)) {
    return {
      email,
      source,
      confidence: sameDomain && prefix === "info" ? "medium" : "low",
      needsReview: true,
      reason: "Allgemeine Kontaktadresse",
    };
  }

  return {
    email,
    source,
    confidence: sameDomain && RELEVANT_LINK_PATTERN.test(sourceLower) ? "medium" : "low",
    needsReview: !sameDomain,
    reason: sameDomain ? "Adresse auf Unternehmensdomain gefunden" : "Adresse gefunden, bitte Domain pruefen",
  };
}

function optionRank(option: EmailOption) {
  const confidenceRank = option.confidence === "high" ? 0 : option.confidence === "medium" ? 1 : 2;
  const reviewRank = option.needsReview ? 1 : 0;
  return confidenceRank * 10 + reviewRank;
}

async function fetchText(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JobsFlowContactSearch/1.0)",
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) return "";
  const contentType = response.headers.get("content-type") || "";
  if (contentType && !/(html|text|xhtml)/i.test(contentType)) return "";

  return response.text();
}

export async function POST(req: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const body = await req.json();
    const jobUrl = safeString(body?.jobUrl);
    const sourceUrl = safeString(body?.sourceUrl);
    const websiteUrl = safeString(body?.websiteUrl);
    const baseUrl = getBaseUrl(websiteUrl, sourceUrl, jobUrl);

    if (!baseUrl) {
      return NextResponse.json({
        email: "",
        options: [],
        warning: "Keine Website-Domain gefunden.",
      });
    }

    const organizationBaseUrl = getOrganizationBaseUrl(baseUrl);
    const baseUrls = Array.from(new Set([baseUrl, organizationBaseUrl].filter(Boolean)));
    const companyDomains = baseUrls.map((url) => new URL(url).hostname.replace(/^www\./i, "").toLowerCase());
    const initialUrls = [websiteUrl, sourceUrl, jobUrl]
      .map(normalizeUrl)
      .filter(Boolean);
    const standardUrls = baseUrls.flatMap((url) => STANDARD_PATHS.map((path) => new URL(path, url).toString()));
    const urls = Array.from(new Set([...initialUrls, ...standardUrls]));
    const found = new Map<string, EmailOption>();
    const discoveredLinks: string[] = [];

    for (const url of urls) {
      const html = await fetchText(url, controller.signal).catch(() => "");
      if (!html) continue;

      for (const currentBaseUrl of baseUrls) {
        if (url === currentBaseUrl || url === `${currentBaseUrl}/`) {
          discoveredLinks.push(...extractRelevantLinks(html, currentBaseUrl));
        }
      }

      for (const email of extractEmails(html)) {
        const option = classifyEmail(email, url, companyDomains);
        if (!option) continue;

        const existing = found.get(email);
        if (!existing || optionRank(option) < optionRank(existing)) {
          found.set(email, option);
        }
      }
    }

    for (const url of Array.from(new Set(discoveredLinks)).slice(0, 5)) {
      const html = await fetchText(url, controller.signal).catch(() => "");
      if (!html) continue;

      for (const email of extractEmails(html)) {
        const option = classifyEmail(email, url, companyDomains);
        if (!option) continue;

        const existing = found.get(email);
        if (!existing || optionRank(option) < optionRank(existing)) {
          found.set(email, option);
        }
      }
    }

    const options = Array.from(found.values()).sort((a, b) => optionRank(a) - optionRank(b)).slice(0, 3);

    return NextResponse.json({
      email: options[0]?.email || "",
      options,
      warning: options.some((option) => option.needsReview) ? "Bitte pruefen" : options.length ? "" : "Keine sichere E-Mail gefunden.",
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json({
      email: "",
      options: [],
      warning: aborted ? "Suche wegen Timeout abgebrochen." : "Keine sichere E-Mail gefunden.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
