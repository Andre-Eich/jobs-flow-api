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

function trimSentence(value: string, maxLength = 130) {
  const text = safeString(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

// Hauptbild: zuerst platform-spezifisches order_images-Muster, dann og:image, dann Fallbacks
function extractMainImage(html: string, baseUrl: string): string {
  // 1. Plattform-spezifisch: order_images / crop_hr URL (jobs-in-berlin-brandenburg.de)
  const platformPatterns = [
    /["'](https?:\/\/[^"']*order_images[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)/i,
    /["'](https?:\/\/[^"']*crop_hr[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)/i,
    /["'](https?:\/\/[^"']*_em_daten[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)/i,
  ];
  for (const pattern of platformPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }

  // 2. og:image
  const ogImage = extractMeta(html, "og:image");
  if (ogImage) return absoluteUrl(baseUrl, ogImage);

  // 3. Großes Bild in figure / header / hero-Bereich
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

// Arbeitgeberseiten-Link aus der Stellenanzeige extrahieren
function extractEmployerPageUrl(html: string, baseUrl: string): string {
  // jobs-in-berlin-brandenburg.de verlinkt auf Arbeitgeberprofile
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

// Logo aus der Arbeitgeberseite extrahieren
function extractLogoFromEmployerPage(html: string, baseUrl: string): string {
  // 1. og:image (häufig das Firmenlogo auf Profilseiten)
  const ogImage = extractMeta(html, "og:image");
  if (ogImage) return absoluteUrl(baseUrl, ogImage);

  // 2. Img-Tag mit Logo-Signalen in class, alt, id oder src
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

// Caption per OpenAI generieren (2 Sätze, natürlicher Social-Post-Stil)
async function generateCaption(
  jobTitle: string,
  company: string,
  location: string,
  employment: string,
  highlight: string,
  fallback: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

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
            "Du schreibst prägnante, authentische Social-Media-Texte auf Deutsch. Keine Floskeln, kein Spam, kein Auflisten von Feldern.",
        },
        {
          role: "user",
          content: `Schreibe genau 2 Sätze für einen Social-Media-Post zu dieser Stellenanzeige:

${parts}

Anforderungen:
- Satz 1: Stelle, Unternehmen und Ort natürlich und ansprechend formulieren
- Satz 2: Echter, persönlicher CTA oder kurzer Hinweis auf die Bewerbung
- Natürlicher Stil, sachlich aber ansprechend
- Kein Spam, keine Aufzählung, keine Template-Sprache
- Nur die 2 Sätze ausgeben, keine Erklärung, kein Hashtag`,
        },
      ],
    });

    const text = response.output_text?.trim() || "";
    return text || fallback;
  } catch (error) {
    console.error("SOCIAL POST CAPTION ERROR:", error);
    return fallback;
  }
}

function extractSocialPostData(url: string, html: string): Omit<ExtractedSocialPostData, "captionText"> {
  let company = extractMeta(html, "og:site_name");
  let jobTitle = extractMeta(html, "og:title");
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
        findStringInJson(parsed, ["hiringOrganization", "name", "organization", "title"]);
      jobTitle = jobTitle || findStringInJson(parsed, ["title", "name"]);
      location =
        location ||
        findStringInJson(parsed, ["addressLocality", "jobLocation", "location", "address"]);
      employment =
        employment || findStringInJson(parsed, ["employmentType", "workHours", "jobType"]);
      logoUrl =
        logoUrl ||
        absoluteUrl(url, findStringInJson(parsed, ["logo", "image", "thumbnailUrl"]));
      // teaserImageUrl nur überschreiben, wenn noch nicht per Hauptbild-Logik gefunden
      if (!teaserImageUrl) {
        teaserImageUrl =
          absoluteUrl(url, findStringInJson(parsed, ["image", "thumbnailUrl", "photo"]));
      }
      highlight =
        highlight ||
        trimSentence(findStringInJson(parsed, ["description", "summary", "qualifications"]), 150);
    } catch {
      // ignore malformed blocks
    }
  }

  const titleHeading =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    "";
  if (!jobTitle) {
    jobTitle = stripTags(titleHeading).replace(/\s*\|\s*Jobs?.*$/i, "").trim();
  }

  company =
    company ||
    extractListText(html, "Unternehmen") ||
    extractListText(html, "Arbeitgeber") ||
    "";
  location =
    location || extractListText(html, "Ort") || extractListText(html, "Standort") || "";
  employment =
    employment ||
    extractListText(html, "Arbeitszeit") ||
    extractListText(html, "Vertragsart") ||
    "";
  highlight =
    highlight ||
    trimSentence(
      extractParagraphAround(html, "Benefit") ||
        extractParagraphAround(html, "Vorteile") ||
        extractParagraphAround(html, "Wir bieten"),
      150
    );

  // Logo aus JSON-LD oder Img-Tags (wird ggf. durch Arbeitgeberseite überschrieben)
  logoUrl =
    logoUrl ||
    absoluteUrl(
      url,
      html.match(/<img[^>]+(?:class|alt|id)=["'][^"']*(?:logo|arbeitgeber)[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1] || ""
    ) ||
    absoluteUrl(
      url,
      html.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:class|alt)=["'][^"']*(?:logo|arbeitgeber)[^"']*["']/i)?.[1] || ""
    );

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

    // Hauptseite laden
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

    // Arbeitgeberseite + Caption parallel laden
    const employerPageUrl = extractEmployerPageUrl(html, url);

    const [employerLogoResult, captionText] = await Promise.allSettled([
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

      generateCaption(
        baseData.jobTitle,
        baseData.company,
        baseData.location,
        baseData.employment,
        baseData.highlight,
        baseData.shortText
      ),
    ]);

    // Bestes Logo: bevorzugt von Arbeitgeberseite, sonst aus Stellenanzeige
    const betterLogoUrl =
      (employerLogoResult.status === "fulfilled" && employerLogoResult.value) ||
      baseData.logoUrl;

    const finalCaption =
      captionText.status === "fulfilled" && captionText.value
        ? captionText.value
        : baseData.shortText;

    const data: ExtractedSocialPostData = {
      ...baseData,
      logoUrl: safeString(betterLogoUrl),
      captionText: safeString(finalCaption),
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
