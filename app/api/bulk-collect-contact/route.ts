import OpenAI from "openai";
import { NextResponse } from "next/server";

type ContactOption = {
  value: string;
  source: string;
  needsReview?: boolean;
};

const HARD_TIMEOUT_MS = 30000;

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeObfuscatedEmails(text: string) {
  return text
    .replace(/\[\s*at\s*\]|\(\s*at\s*\)|\s+at\s+/gi, "@")
    .replace(/\[\s*ät\s*\]|\(\s*ät\s*\)/gi, "@")
    .replace(/\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+/gi, ".")
    .replace(/\s*@\s*/g, "@")
    .replace(/\s*\.\s*/g, ".");
}

async function fetchHtml(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal });
  if (!response.ok) return "";
  return await response.text();
}

function dedupeOptions(values: ContactOption[]) {
  const map = new Map<string, ContactOption>();
  for (const item of values) {
    const key = item.value.toLowerCase().trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values()).slice(0, 3);
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = item.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

function findEmails(rawText: string) {
  const text = normalizeObfuscatedEmails(rawText);
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return dedupeStrings(matches.map((item) => item.trim())).slice(0, 5);
}

async function searchFallbackEmails(company: string) {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!braveKey || !company) return [] as string[];

  const queries = [`"${company}" email`, `"${company}" kontakt email`];
  const snippets: string[] = [];

  for (const query of queries) {
    const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q: query, count: "5", country: "de", search_lang: "de" })}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": braveKey },
    });
    if (!response.ok) continue;
    const data = await response.json();
    const results = Array.isArray(data?.web?.results) ? data.web.results : [];
    for (const item of results) {
      const title = typeof item?.title === "string" ? item.title : "";
      const description = typeof item?.description === "string" ? item.description : "";
      snippets.push(`${title} ${description}`);
    }
  }

  return findEmails(snippets.join(" ")).slice(0, 2);
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

  try {
    const { company, website } = await req.json();
    const safeCompany = String(company || "").trim();
    const safeWebsite = String(website || "").trim();

    if (!safeWebsite) {
      return NextResponse.json({ error: "Keine Website vorhanden." }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });
    }

    const candidates = [
      safeWebsite,
      `${safeWebsite.replace(/\/$/, "")}/kontakt`,
      `${safeWebsite.replace(/\/$/, "")}/impressum`,
      `${safeWebsite.replace(/\/$/, "")}/ueber-uns`,
      `${safeWebsite.replace(/\/$/, "")}/karriere`,
      `${safeWebsite.replace(/\/$/, "")}/jobs`,
      `${safeWebsite.replace(/\/$/, "")}/stellenausschreibungen`,
    ];

    const pages: { url: string; text: string }[] = [];
    const emailOptions: ContactOption[] = [];

    for (const url of candidates) {
      if (Date.now() - startedAt > 12000 && emailOptions.length > 0) break;
      try {
        const html = await fetchHtml(url, controller.signal);
        if (!html) continue;
        const text = normalizeObfuscatedEmails(stripHtml(html)).slice(0, 6000);
        pages.push({ url, text });
        for (const email of findEmails(text)) {
          emailOptions.push({ value: email, source: url });
        }
      } catch {
        // ignore single page errors
      }
    }

    let fallbackUsed = false;
    if (emailOptions.length === 0 && Date.now() - startedAt < 22000) {
      const fallbackEmails = await searchFallbackEmails(safeCompany);
      for (const email of fallbackEmails) {
        emailOptions.push({ value: email, source: "search_fallback", needsReview: true });
      }
      fallbackUsed = fallbackEmails.length > 0;
    }

    const mergedEmailOptions = dedupeOptions(emailOptions);
    const bestEmail = mergedEmailOptions[0]?.value || "";

    let bestContactPerson = "";
    let contactPersonOptions: string[] = [];
    let industry = "";

    if (Date.now() - startedAt < 26000 && pages.length > 0) {
      const client = new OpenAI({ apiKey: openaiKey });
      const ai = await client.responses.create({
        model: "gpt-5",
        input: [
          {
            role: "system",
            content: "Extrahiere aus Unternehmenswebsites brauchbare Vertriebs-Kontaktdaten. Sei pragmatisch und schnell. Gib maximal 3 E-Mail-Optionen und maximal 3 Ansprechpartner zurück. Antworte nur als JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              company: safeCompany,
              website: safeWebsite,
              pages: pages.slice(0, 4),
              emailCandidates: mergedEmailOptions,
              outputFormat: {
                bestContactPerson: "",
                contactPersonOptions: [""],
                industry: "",
              },
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "bulk_contact_v3",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                bestContactPerson: { type: "string" },
                contactPersonOptions: { type: "array", items: { type: "string" } },
                industry: { type: "string" },
              },
              required: ["bestContactPerson", "contactPersonOptions", "industry"],
            },
          },
        },
      });

      const parsed = JSON.parse(ai.output_text || "{}");
      bestContactPerson = String(parsed?.bestContactPerson || "").trim();
      contactPersonOptions = dedupeStrings(
        Array.isArray(parsed?.contactPersonOptions)
          ? parsed.contactPersonOptions.map((item: unknown) => String(item || "").trim())
          : []
      );
      if (!bestContactPerson) bestContactPerson = contactPersonOptions[0] || "";
      industry = String(parsed?.industry || "").trim();
    }

    return NextResponse.json({
      contactStatus: bestEmail ? "done" : "error",
      email: bestEmail,
      emailOptions: mergedEmailOptions,
      emailNeedsReview: mergedEmailOptions.find((item) => item.value === bestEmail)?.needsReview || false,
      contactPerson: bestContactPerson,
      contactPersonOptions,
      industry,
      fallbackUsed,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error: any) {
    console.error("BULK CONTACT V3 ERROR:", error);
    return NextResponse.json({ error: error?.name === "AbortError" ? "Kontaktdatensuche wegen Timeout abgebrochen." : error?.message || "Kontaktdatensuche fehlgeschlagen." }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
