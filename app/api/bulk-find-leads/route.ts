import OpenAI from "openai";
import { NextResponse } from "next/server";

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
};

function normalizeWebsite(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function hostLooksUseful(url: string) {
  const lowered = url.toLowerCase();
  return ![
    "stepstone",
    "indeed",
    "linkedin",
    "facebook",
    "instagram",
    "xing",
    "kununu",
    "meinestadt",
    "stellenanzeigen",
    "jobrapido",
    "glassdoor",
  ].some((blocked) => lowered.includes(blocked));
}

function buildQueries(location: string, focus: string, desiredCount: number) {
  const base = [
    `${location} unternehmen jobs karriere`,
    `${location} arbeitgeber stellenangebote`,
    `${location} firma karriere jobs`,
    `${location} stellenausschreibungen arbeitgeber`,
    `${location} beruf jobs unternehmen`,
    `${location} jobs karriere impressum firma`,
  ];

  if (!focus.trim()) return base;

  return [
    `${location} ${focus} jobs karriere`,
    `${location} ${focus} arbeitgeber stellenangebote`,
    `${location} ${focus} firma karriere`,
    ...base,
  ].slice(0, desiredCount >= 20 ? 6 : 4);
}

export async function POST(req: Request) {
  try {
    const { location, focus = "", count = 20, radius = "30" } = await req.json();

    const safeLocation = String(location || "").trim();
    const safeFocus = String(focus || "").trim();
    const safeCount = Math.max(1, Math.min(30, Number(count) || 20));
    const safeRadius = String(radius || "30").trim();

    if (!safeLocation) {
      return NextResponse.json({ error: "Bitte Ort oder PLZ angeben." }, { status: 400 });
    }

    const braveKey = process.env.BRAVE_SEARCH_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!braveKey) {
      return NextResponse.json({ error: "BRAVE_SEARCH_API_KEY fehlt." }, { status: 500 });
    }

    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });
    }

    const queries = buildQueries(safeLocation, safeFocus, safeCount);
    const resultMap = new Map<string, BraveWebResult>();

    for (const query of queries) {
      const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
        q: query,
        count: safeCount >= 20 ? "20" : "15",
        country: "de",
        search_lang: "de",
      })}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": braveKey,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        return NextResponse.json({ error: data?.error?.message || "Brave Search Fehler" }, { status: 500 });
      }

      const results = Array.isArray(data?.web?.results) ? data.web.results : [];
      for (const item of results) {
        const candidate: BraveWebResult = {
          title: typeof item?.title === "string" ? item.title : "",
          url: typeof item?.url === "string" ? item.url : "",
          description: typeof item?.description === "string" ? item.description : "",
        };
        if (!candidate.url || !hostLooksUseful(candidate.url)) continue;
        const normalized = normalizeWebsite(candidate.url);
        if (!resultMap.has(normalized)) {
          resultMap.set(normalized, { ...candidate, url: normalized });
        }
      }

      if (resultMap.size >= safeCount * 3) break;
    }

    const searchResults = Array.from(resultMap.values()).slice(0, Math.max(safeCount * 3, 18));

    const client = new OpenAI({ apiKey: openaiKey });
    const ai = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "Du extrahierst aus Suchergebnissen echte potenzielle Arbeitgeber mit eigener Website. Keine Jobbörsen, keine Verzeichnisse, keine Social-Media-Seiten. Gib möglichst genau die gewünschte Anzahl zurück. Antworte nur als JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            location: safeLocation,
            focus: safeFocus,
            radiusKm: safeRadius,
            desiredCount: safeCount,
            results: searchResults,
            outputFormat: {
              leads: [{ company: "", city: safeLocation, website: "" }],
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "bulk_leads_v2",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              leads: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    company: { type: "string" },
                    city: { type: "string" },
                    website: { type: "string" },
                  },
                  required: ["company", "city", "website"],
                },
              },
            },
            required: ["leads"],
          },
        },
      },
    });

    const parsed = JSON.parse(ai.output_text || "{}");
    const leads = Array.isArray(parsed?.leads) ? parsed.leads : [];

    const finalLeads = Array.from(
      new Map(
        leads
          .map((lead: any) => ({
            company: String(lead.company || "").trim(),
            city: String(lead.city || safeLocation).trim() || safeLocation,
            website: normalizeWebsite(String(lead.website || "").trim()),
          }))
          .filter((lead: any) => lead.company && lead.website)
          .map((lead: any) => [lead.website.toLowerCase(), lead])
      ).values()
    ).slice(0, safeCount);

    return NextResponse.json({
      leads: finalLeads.map((lead: any) => ({
        id: crypto.randomUUID(),
        selected: true,
        company: lead.company,
        city: lead.city,
        website: lead.website,
        analysisStatus: "idle",
        analysisStars: 0,
        analysisSummary: "",
        foundJobTitles: [],
        foundCareerUrls: [],
        contactStatus: "idle",
        email: "",
        emailOptions: [],
        emailNeedsReview: false,
        contactPerson: "",
        contactPersonOptions: [],
        industry: "",
        qualityStatus: "idle",
        qualityStars: 0,
        qualitySummary: "",
        alreadyContacted: false,
        lastContactAt: "",
        sendStatus: "idle",
      })),
      requestedCount: safeCount,
      foundCount: finalLeads.length,
      complete: finalLeads.length >= safeCount,
    });
  } catch (error: any) {
    console.error("BULK FIND LEADS V2 ERROR:", error);
    return NextResponse.json({ error: error?.message || "Unternehmenssuche fehlgeschlagen." }, { status: 500 });
  }
}
