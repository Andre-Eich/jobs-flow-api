import OpenAI from "openai";
import { NextResponse } from "next/server";

const CAREER_KEYWORDS = [
  "karriere",
  "jobs",
  "stellen",
  "stellenangebote",
  "stellenausschreibungen",
  "bewerbung",
  "offene stellen",
  "career",
  "join-us",
  "arbeiten-bei",
  "wir-suchen",
  "jobportal",
];

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) return "";
  return await response.text();
}

function findCandidateLinks(html: string, baseUrl: string) {
  const matches = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((match) => match[1]);
  const urls: string[] = [];

  for (const href of matches) {
    const lowered = href.toLowerCase();
    if (!CAREER_KEYWORDS.some((keyword) => lowered.includes(keyword))) continue;
    try {
      const absolute = new URL(href, baseUrl).toString();
      urls.push(absolute);
    } catch {
      // ignore invalid urls
    }
  }

  return Array.from(new Set(urls)).slice(0, 6);
}

function scoreCandidateUrl(url: string) {
  const lowered = url.toLowerCase();
  let score = 0;
  for (const keyword of CAREER_KEYWORDS) {
    if (lowered.includes(keyword)) score += 1;
  }
  return score;
}

export async function POST(req: Request) {
  try {
    const { company, website, city } = await req.json();
    const safeCompany = String(company || "").trim();
    const safeWebsite = String(website || "").trim();
    const safeCity = String(city || "").trim();

    if (!safeWebsite) {
      return NextResponse.json({ error: "Keine Website vorhanden." }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });
    }

    const startHtml = await fetchHtml(safeWebsite);
    const startText = stripHtml(startHtml).slice(0, 6000);
    const discoveredLinks = startHtml ? findCandidateLinks(startHtml, safeWebsite) : [];

    const staticCandidates = [
      safeWebsite,
      `${safeWebsite.replace(/\/$/, "")}/jobs`,
      `${safeWebsite.replace(/\/$/, "")}/karriere`,
      `${safeWebsite.replace(/\/$/, "")}/stellenangebote`,
      `${safeWebsite.replace(/\/$/, "")}/stellenausschreibungen`,
      `${safeWebsite.replace(/\/$/, "")}/career`,
      `${safeWebsite.replace(/\/$/, "")}/bewerbung`,
    ];

    const allCandidates = Array.from(new Set([...staticCandidates, ...discoveredLinks]))
      .sort((a, b) => scoreCandidateUrl(b) - scoreCandidateUrl(a))
      .slice(0, 7);

    const pages: { url: string; text: string }[] = [];

    for (const url of allCandidates) {
      try {
        const html = url === safeWebsite && startHtml ? startHtml : await fetchHtml(url);
        if (!html) continue;
        const text = stripHtml(html).slice(0, 8000);
        if (!text) continue;
        pages.push({ url, text });
      } catch {
        // ignore
      }
    }

    const combined = pages.map((page) => `URL: ${page.url}\nTEXT: ${page.text}`).join("\n\n---\n\n").slice(0, 20000);

    if (!combined) {
      return NextResponse.json({
        analysisStatus: "error",
        analysisStars: 0,
        analysisSummary: "Website konnte nicht gelesen werden.",
        foundJobTitles: [],
        foundCareerUrls: [],
      });
    }

    const client = new OpenAI({ apiKey: openaiKey });
    const ai = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "Bewerte Websites von Unternehmen im Hinblick auf Recruiting-Signale. Berücksichtige Karriere- und Job-Unterseiten ausdrücklich. Antworte nur als JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            company: safeCompany,
            city: safeCity,
            website: safeWebsite,
            startText,
            pages,
            discoveredLinks,
            scoring: {
              0: "keine verwertbaren Hinweise",
              1: "leichte Hinweise auf Karriere/Jobs",
              2: "konkrete Stellen oder Karrierebereich vorhanden",
              3: "starkes Recruiting-Signal, mehrere Jobs oder klarer Karrierebereich",
            },
            outputFormat: {
              analysisStars: 0,
              analysisSummary: "",
              foundJobTitles: [""],
              foundCareerUrls: [""],
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "bulk_analysis_v2",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              analysisStars: { type: "integer", minimum: 0, maximum: 3 },
              analysisSummary: { type: "string" },
              foundJobTitles: {
                type: "array",
                items: { type: "string" },
              },
              foundCareerUrls: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["analysisStars", "analysisSummary", "foundJobTitles", "foundCareerUrls"],
          },
        },
      },
    });

    const parsed = JSON.parse(ai.output_text || "{}");

    return NextResponse.json({
      analysisStatus: "done",
      analysisStars: Number(parsed.analysisStars || 0) as 0 | 1 | 2 | 3,
      analysisSummary: String(parsed.analysisSummary || "").trim(),
      foundJobTitles: Array.isArray(parsed.foundJobTitles)
        ? parsed.foundJobTitles.map((value: unknown) => String(value || "").trim()).filter(Boolean).slice(0, 5)
        : [],
      foundCareerUrls: Array.isArray(parsed.foundCareerUrls)
        ? parsed.foundCareerUrls.map((value: unknown) => String(value || "").trim()).filter(Boolean).slice(0, 3)
        : discoveredLinks.slice(0, 3),
    });
  } catch (error: any) {
    console.error("BULK ANALYZE V2 ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Analyse fehlgeschlagen." },
      { status: 500 }
    );
  }
}
