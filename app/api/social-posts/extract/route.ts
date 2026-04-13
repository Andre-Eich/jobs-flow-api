import { NextResponse } from "next/server";

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
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function absoluteUrl(baseUrl: string, candidate: string) {
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
    if (match?.[1]) {
      return decodeHtml(match[1]).trim();
    }
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
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }
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
  const windowText = stripTags(html.slice(index, index + 500));
  return windowText;
}

function trimSentence(value: string, maxLength = 130) {
  const text = safeString(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function extractSocialPostData(url: string, html: string): ExtractedSocialPostData {
  let company = extractMeta(html, "og:site_name");
  let jobTitle = extractMeta(html, "og:title");
  let teaserImageUrl = absoluteUrl(url, extractMeta(html, "og:image"));
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
      teaserImageUrl =
        teaserImageUrl ||
        absoluteUrl(url, findStringInJson(parsed, ["image", "thumbnailUrl", "photo"]));
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

  logoUrl =
    logoUrl ||
    absoluteUrl(
      url,
      html.match(/<img[^>]+(?:logo|arbeitgeber)[^>]+src=["']([^"']+)["']/i)?.[1] || ""
    );
  teaserImageUrl =
    teaserImageUrl ||
    absoluteUrl(
      url,
      html.match(/<img[^>]+(?:teaser|hero|header)[^>]+src=["']([^"']+)["']/i)?.[1] || ""
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

    const response = await fetch(url, {
      headers: {
        "User-Agent": "jobs-flow-api social-post extractor",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Stellenanzeige konnte nicht geladen werden (${response.status}).` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const data = extractSocialPostData(url, html);

    if (!data.company && !data.jobTitle && !data.location) {
      return NextResponse.json(
        { error: "Es konnten nicht genug Daten aus der Stellenanzeige gelesen werden." },
        { status: 422 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error("SOCIAL POST EXTRACT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Daten konnten nicht extrahiert werden." },
      { status: 500 }
    );
  }
}
