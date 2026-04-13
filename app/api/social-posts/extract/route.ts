import { NextResponse } from "next/server";
import OpenAI from "openai";

type ExtractedSocialPostData = {
  company: string;
  jobTitle: string;
  location: string;
  employment: string;
  highlight: string;
  logoUrl: string;
  teaserImageUrl: string;
  link: string;
  shortText: string;
  captionText: string;
  benefits: string[];
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function absoluteUrl(baseUrl: string, candidate: string) {
  if (!candidate) return "";
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return safeString(candidate);
  }
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&uuml;", "ü")
    .replaceAll("&ouml;", "ö")
    .replaceAll("&auml;", "ä")
    .replaceAll("&Uuml;", "Ü")
    .replaceAll("&Ouml;", "Ö")
    .replaceAll("&Auml;", "Ä")
    .replaceAll("&szlig;", "ß");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractMeta(html: string, property: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]).trim();
  }
  return "";
}

function extractJsonLdBlocks(html: string) {
  return Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  )
    .map((match) => safeString(match[1]))
    .filter(Boolean);
}

function findStringInJson(value: unknown, keys: string[]): string {
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringInJson(item, keys);
      if (found) return found;
    }
    return "";
  }
  for (const key of keys) {
    const direct = (value as Record<string, unknown>)[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    const found = findStringInJson(child, keys);
    if (found) return found;
  }
  return "";
}

function extractListText(html: string, label: string) {
  const pattern = new RegExp(`${label}[\\s\\S]{0,180}?<[^>]+>([^<]+)`, "i");
  const match = html.match(pattern);
  return match?.[1] ? stripTags(match[1]) : "";
}

function extractParagraphAround(html: string, needle: string) {
  const index = html.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return "";
  return stripTags(html.slice(index, index + 500));
}

function normalizeWhitespace(value: string) {
  return stripTags(value).replace(/\s+/g, " ").trim();
}

function cleanCompanyName(raw: string): string {
  return safeString(raw)
    .replace(/\s*[|â€“-]\s*Jobs?\s+in\s+Berlin[\s\S]*$/i, "")
    .replace(/\s*[|â€“-]\s*Jobs-in-Berlin-Brandenburg\.de\s*$/i, "")
    .replace(/\bJobs in Berlin-Brandenburg(?:\.de)?\b/gi, "")
    .trim();
}

function looksLikePortalBranding(value: string) {
  const text = safeString(value).toLowerCase();
  if (!text) return true;
  return (
    text.includes("jobs in berlin-brandenburg") ||
    text.includes("jobs-in-berlin-brandenburg") ||
    text === "jobs" ||
    text === "stellenangebote"
  );
}

function extractStableHeaderData(html: string) {
  const headerChunk = html.slice(0, 120000);
  const h1Candidates = Array.from(headerChunk.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi))
    .map((match) => cleanJobTitle(normalizeWhitespace(match[1])))
    .filter(Boolean)
    .filter((text) => !looksLikePortalBranding(text));

  const jobTitle = h1Candidates[0] || "";
  if (!jobTitle) {
    return { jobTitle: "", company: "" };
  }

  const titleIndex = headerChunk.indexOf(jobTitle);
  const nearbyChunk =
    titleIndex >= 0
      ? headerChunk.slice(titleIndex, Math.min(headerChunk.length, titleIndex + 5000))
      : headerChunk.slice(0, 5000);

  const companyCandidates = Array.from(
    nearbyChunk.matchAll(/<(h2|h3|p|div|span|a)[^>]*>([\s\S]*?)<\/\1>/gi)
  )
    .map((match) => cleanCompanyName(normalizeWhitespace(match[2])))
    .filter(Boolean)
    .filter((text) => text !== jobTitle)
    .filter((text) => !looksLikePortalBranding(text))
    .filter((text) => text.length <= 120)
    .filter((text) => !/^(merken|bewerben|teilen|zurück|zurueck|meine notiz|my notes)$/i.test(text))
    .filter((text) => !/^(einsatzort|arbeitszeit|branche|kontaktdaten|anzeigen-id)/i.test(text));

  return {
    jobTitle,
    company: companyCandidates[0] || "",
  };
}

function trimSentence(value: string, maxLength = 130) {
  const text = safeString(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

// Jobtitel von Portal-Suffixen bereinigen
function cleanJobTitle(raw: string): string {
  return raw
    .replace(/\s*[|–\-]\s*Jobs?\s+in\s+Berlin[^|–\-]*/i, "")
    .replace(/\s*[|–\-]\s*jobs-in-berlin[^\s|–]*/i, "")
    .replace(/\s*[|–\-]\s*Stellen?(?:anzeige|börse|portal|markt)?[^|–\-]*/i, "")
    .replace(/\s*[|–\-]\s*Karriere[^|–\-]*/i, "")
    .trim();
}

// Hauptbild: plattformspezifisch → og:image → hero/figure-Fallback
function extractMainImage(html: string, baseUrl: string): string {
  const platformPatterns = [
    /["'](https?:\/\/[^"']*order_images[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)/i,
    /["'](https?:\/\/[^"']*crop_hr[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)/i,
    /["'](https?:\/\/[^"']*_em_daten[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)/i,
  ];
  for (const pattern of platformPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }

  const ogImage = extractMeta(html, "og:image");
  if (ogImage) return absoluteUrl(baseUrl, ogImage);

  const heroPatterns = [
    /<figure[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    /<div[^>]+(?:class|id)=["'][^"']*(?:hero|header|teaser|stage|banner|main-image)[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    /<img[^>]+(?:class|id)=["'][^"']*(?:hero|header|teaser|main)[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*(?:hero|header|teaser|main)[^"']*["']/i,
  ];
  for (const pattern of heroPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) return absoluteUrl(baseUrl, decodeHtml(match[1]));
  }

  return "";
}

// Arbeitgeberseiten-Link aus der Stellenanzeige
function extractEmployerPageUrl(html: string, baseUrl: string): string {
  const patterns = [
    /href=["']([^"']*\/arbeitgeber\/[^"']+)["']/i,
    /href=["']([^"']*\/unternehmen\/[^"']+)["']/i,
    /href=["']([^"']*\/firma\/[^"']+)["']/i,
    /href=["']([^"']*\/company\/[^"']+)["']/i,
    /href=["']([^"']+)["'][^>]*>[\s\S]{0,60}?(?:Arbeitgeberprofil|Zum Arbeitgeber|Unternehmensprofil|Firmenprofil)/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const url = absoluteUrl(baseUrl, decodeHtml(match[1]));
      if (url.startsWith("http")) return url;
    }
  }
  return "";
}

// Logo aus der Arbeitgeberseite
function extractLogoFromEmployerPage(html: string, baseUrl: string): string {
  const ogImage = extractMeta(html, "og:image");
  if (ogImage) return absoluteUrl(baseUrl, ogImage);

  const logoPatterns = [
    /<img[^>]+src=["']([^"']+)["'][^>]*(?:class|alt|id|title)=["'][^"']*(?:logo|brand|marke|signet)[^"']*["']/i,
    /<img[^>]*(?:class|alt|id|title)=["'][^"']*(?:logo|brand|marke|signet)[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']*(?:logo|brand)[^"']*)["']/i,
  ];
  for (const pattern of logoPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const url = absoluteUrl(baseUrl, decodeHtml(match[1]));
      if (url.startsWith("http")) return url;
    }
  }
  return "";
}

// Unternehmensdomäne aus HTML extrahieren (für Clearbit-Fallback)
function extractCompanyDomain(html: string, siteHostname: string): string {
  // 1. JSON-LD: url / website / sameAs
  for (const block of extractJsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block);
      const raw = findStringInJson(parsed, ["url", "website", "sameAs"]);
      if (raw?.startsWith("http")) {
        const domain = new URL(raw).hostname.replace(/^www\./, "");
        if (domain && !domain.includes(siteHostname)) return domain;
      }
    } catch {
      // ignore
    }
  }

  // 2. Externe Links die nicht zur Jobplattform gehören
  const externalLinkPattern = new RegExp(
    `href=["'](https?:\\/\\/(?!(?:www\\.)?${siteHostname.replace(/\./g, "\\.")})[^"']+)["']`,
    "gi"
  );
  const skipDomains = ["google.", "facebook.", "linkedin.", "xing.", "twitter.", "instagram."];
  for (const match of html.matchAll(externalLinkPattern)) {
    try {
      const domain = new URL(match[1]).hostname.replace(/^www\./, "");
      if (domain && domain.includes(".") && !skipDomains.some((s) => domain.includes(s))) {
        return domain;
      }
    } catch {
      // ignore
    }
  }

  return "";
}

// Benefits 3–5 Stück via OpenAI extrahieren
async function extractBenefits(html: string, apiKey: string): Promise<string[]> {
  try {
    const openai = new OpenAI({ apiKey });

    // Relevante Textabschnitte aus dem HTML destillieren
    const bodyText = stripTags(html)
      .replace(/\s{2,}/g, " ")
      .slice(0, 3500);

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "Du extrahierst Benefits und Arbeitsbedingungen aus Stellenanzeigen als kompaktes JSON-Array.",
        },
        {
          role: "user",
          content: `Extrahiere aus dem folgenden Stellenanzeigentext genau 3 bis 5 kurze, prägnante Benefits oder Arbeitsbedingungen.

Regeln:
- max. 5 Wörter pro Benefit
- konkrete Angaben bevorzugen (z.B. "TVöD-Vergütung", "30 Tage Urlaub", "Homeoffice möglich")
- keine generischen Floskeln ("interessante Tätigkeit", "gutes Team")
- Ausgabe: nur das JSON-Array, kein Kommentar

Text:
${bodyText}`,
        },
      ],
    });

    const text = response.output_text?.trim() || "[]";
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .slice(0, 5)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0 && s.length < 60);
  } catch (error) {
    console.error("BENEFIT EXTRACTION ERROR:", error);
    return [];
  }
}

// Caption per OpenAI generieren (2 Sätze)
async function generateCaption(
  jobTitle: string,
  company: string,
  location: string,
  employment: string,
  highlight: string,
  fallback: string,
  apiKey: string
): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey });

    const parts = [
      jobTitle && `Jobtitel: ${jobTitle}`,
      company && `Unternehmen: ${company}`,
      location && `Ort: ${location}`,
      employment && `Beschäftigung: ${employment}`,
      highlight && `Besonderheit: ${highlight}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content:
            "Du schreibst prägnante, authentische Social-Media-Texte auf Deutsch. Keine Floskeln, kein Spam.",
        },
        {
          role: "user",
          content: `Schreibe genau 2 Sätze für einen Social-Media-Post zu dieser Stellenanzeige:

${parts}

Anforderungen:
- Satz 1: Stelle, Unternehmen und Ort natürlich formulieren
- Satz 2: Echter, persönlicher CTA
- Kein Spam, keine Aufzählung, keine Floskel
- Nur die 2 Sätze ausgeben`,
        },
      ],
    });

    return response.output_text?.trim() || fallback;
  } catch (error) {
    console.error("CAPTION GENERATION ERROR:", error);
    return fallback;
  }
}

function extractSocialPostData(url: string, html: string): Omit<ExtractedSocialPostData, "captionText" | "benefits"> {
  const stableHeader = extractStableHeaderData(html);
  let company = cleanCompanyName(stableHeader.company);
  let jobTitle = cleanJobTitle(stableHeader.jobTitle || extractMeta(html, "og:title"));
  let teaserImageUrl = extractMainImage(html, url);
  let logoUrl = "";
  let location = "";
  let employment = "";
  let highlight = "";

  for (const block of extractJsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block);
      company =
        company ||
        cleanCompanyName(findStringInJson(parsed, ["hiringOrganization", "name", "organization", "title"]));
      if (!jobTitle) {
        jobTitle = cleanJobTitle(findStringInJson(parsed, ["title", "name"]));
      }
      location = location || findStringInJson(parsed, ["addressLocality", "jobLocation", "location", "address"]);
      employment = employment || findStringInJson(parsed, ["employmentType", "workHours", "jobType"]);
      logoUrl = logoUrl || absoluteUrl(url, findStringInJson(parsed, ["logo", "image", "thumbnailUrl"]));
      if (!teaserImageUrl) {
        teaserImageUrl = absoluteUrl(url, findStringInJson(parsed, ["image", "thumbnailUrl", "photo"]));
      }
      highlight = highlight || trimSentence(findStringInJson(parsed, ["description", "summary", "qualifications"]), 150);
    } catch {
      // ignore
    }
  }

  const titleHeading =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    "";
  if (!jobTitle) {
    jobTitle = cleanJobTitle(stripTags(titleHeading));
  }

  company =
    company ||
    cleanCompanyName(extractListText(html, "Unternehmen")) ||
    cleanCompanyName(extractListText(html, "Arbeitgeber")) ||
    "";
  location = location || extractListText(html, "Ort") || extractListText(html, "Standort") || "";
  employment = employment || extractListText(html, "Arbeitszeit") || extractListText(html, "Vertragsart") || "";
  highlight = highlight || trimSentence(
    extractParagraphAround(html, "Benefit") ||
    extractParagraphAround(html, "Vorteile") ||
    extractParagraphAround(html, "Wir bieten"),
    150
  );

  logoUrl =
    logoUrl ||
    absoluteUrl(
      url,
      html.match(/<img[^>]+(?:class|alt|id)=["'][^"']*(?:arbeitgeber|firma|company)[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1] || ""
    ) ||
    absoluteUrl(
      url,
      html.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:class|alt)=["'][^"']*(?:arbeitgeber|firma|company)[^"']*["']/i)?.[1] || ""
    );

  if (looksLikePortalBranding(company)) {
    company = "";
  }

  const shortText = [
    jobTitle && company ? `${jobTitle} bei ${company}.` : "",
    location || employment || highlight
      ? `${[location, employment, highlight].filter(Boolean).join(" • ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    company: safeString(company),
    jobTitle: safeString(jobTitle),
    location: safeString(location),
    employment: safeString(employment),
    highlight: safeString(highlight),
    logoUrl: safeString(logoUrl),
    teaserImageUrl: safeString(teaserImageUrl),
    link: url,
    shortText: trimSentence(shortText, 220),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = safeString(body?.url);

    if (!url) {
      return NextResponse.json({ error: "Bitte eine URL angeben." }, { status: 400 });
    }

    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.includes("jobs-in-berlin-brandenburg.de")) {
      return NextResponse.json(
        { error: "Aktuell werden nur URLs von jobs-in-berlin-brandenburg.de unterstuetzt." },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "jobs-flow-api social-post extractor" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Stellenanzeige konnte nicht geladen werden (${response.status}).` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const baseData = extractSocialPostData(url, html);

    if (!baseData.company && !baseData.jobTitle && !baseData.location) {
      return NextResponse.json(
        { error: "Es konnten nicht genug Daten aus der Stellenanzeige gelesen werden." },
        { status: 422 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY || "";
    const employerPageUrl = extractEmployerPageUrl(html, url);
    const siteHostname = parsedUrl.hostname;

    // Employer-Seite, Caption und Benefits parallel laden
    const [employerLogoResult, captionResult, benefitsResult] = await Promise.allSettled([
      employerPageUrl
        ? fetch(employerPageUrl, {
            headers: { "User-Agent": "jobs-flow-api social-post extractor" },
            cache: "no-store",
          })
            .then(async (res) => {
              if (!res.ok) return "";
              const employerHtml = await res.text();
              return extractLogoFromEmployerPage(employerHtml, employerPageUrl);
            })
            .catch(() => "")
        : Promise.resolve(""),

      apiKey
        ? generateCaption(
            baseData.jobTitle,
            baseData.company,
            baseData.location,
            baseData.employment,
            baseData.highlight,
            baseData.shortText,
            apiKey
          )
        : Promise.resolve(baseData.shortText),

      apiKey
        ? extractBenefits(html, apiKey)
        : Promise.resolve([] as string[]),
    ]);

    // Bestes Logo bestimmen: Arbeitgeberseite → Clearbit → Stellenanzeige
    let bestLogo =
      (employerLogoResult.status === "fulfilled" && employerLogoResult.value) ||
      baseData.logoUrl;

    if (!bestLogo) {
      const domain = extractCompanyDomain(html, siteHostname);
      if (domain) {
        bestLogo = `https://logo.clearbit.com/${domain}`;
      }
    }

    const finalCaption =
      captionResult.status === "fulfilled" && captionResult.value
        ? captionResult.value
        : baseData.shortText;

    const finalBenefits =
      benefitsResult.status === "fulfilled" ? benefitsResult.value : ([] as string[]);

    const data: ExtractedSocialPostData = {
      ...baseData,
      logoUrl: safeString(bestLogo),
      captionText: safeString(finalCaption),
      benefits: finalBenefits,
    };

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error("SOCIAL POST EXTRACT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Daten konnten nicht extrahiert werden." },
      { status: 500 }
    );
  }
}
