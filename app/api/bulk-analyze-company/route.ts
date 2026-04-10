import OpenAI from "openai";
import { NextResponse } from "next/server";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) return "";
  return stripHtml(await response.text()).slice(0, 5000);
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

    const candidates = [
      safeWebsite,
      `${safeWebsite.replace(/\/$/, "")}/jobs`,
      `${safeWebsite.replace(/\/$/, "")}/karriere`,
      `${safeWebsite.replace(/\/$/, "")}/stellenangebote`,
      `${safeWebsite.replace(/\/$/, "")}/career`,
    ];

    const pages = [] as { url: string; text: string }[];
    for (const url of candidates) {
      try {
        const text = await fetchText(url);
        if (text) pages.push({ url, text });
      } catch {
        // ignore single page failures
      }
    }

    const combined = pages.map((page) => `URL: ${page.url}\nTEXT: ${page.text}`).join("\n\n---\n\n").slice(0, 15000);

    if (!combined) {
      return NextResponse.json({
        analysisStatus: "error",
        analysisStars: 0,
        analysisSummary: "Website konnte nicht gelesen werden.",
        foundJobTitles: [],
      });
    }

    const client = new OpenAI({ apiKey: openaiKey });
    const ai = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "Bewerte Websites von Unternehmen im Hinblick auf Recruiting-Signale. Antworte nur als JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            company: safeCompany,
            city: safeCity,
            website: safeWebsite,
            pages,
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
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "bulk_analysis",
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
            },
            required: ["analysisStars", "analysisSummary", "foundJobTitles"],
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
    });
  } catch (error: any) {
    console.error("BULK ANALYZE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Analyse fehlgeschlagen." },
      { status: 500 }
    );
  }
}
