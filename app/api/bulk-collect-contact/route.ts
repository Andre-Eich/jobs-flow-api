import OpenAI from "openai";
import { NextResponse } from "next/server";

type ContactOption = {
  value: string;
  source: string;
  needsReview?: boolean;
};

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

async function fetchHtml(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) return "";
  return await response.text();
}

function uniqOptions(values: ContactOption[]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = `${item.value.toLowerCase()}|${item.source}`;
    if (!item.value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findEmails(rawText: string) {
  const text = normalizeObfuscatedEmails(rawText);
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return Array.from(new Set(matches.map((item) => item.trim()))).slice(0, 8);
}

async function searchFallbackEmails(company: string) {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!braveKey || !company) return [] as string[];

  const queries = [
    `"${company}" email`,
    `"${company}" kontakt email`,
    `"${company}" impressum email`,
  ];

  const textSnippets: string[] = [];
  for (const query of queries.slice(0, 2)) {
    const url = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
      q: query,
      count: "5",
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

    if (!response.ok) continue;
    const data = await response.json();
    const results = Array.isArray(data?.web?.results) ? data.web.results : [];
    for (const item of results) {
      const title = typeof item?.title === "string" ? item.title : "";
      const description = typeof item?.description === "string" ? item.description : "";
      textSnippets.push(`${title} ${description}`);
    }
  }

  return findEmails(textSnippets.join(" ")).slice(0, 3);
}

export async function POST(req: Request) {
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
      `${safeWebsite.replace(/\/$/, "")}/about`,
      `${safeWebsite.replace(/\/$/, "")}/ueber-uns`,
      `${safeWebsite.replace(/\/$/, "")}/karriere`,
      `${safeWebsite.replace(/\/$/, "")}/jobs`,
      `${safeWebsite.replace(/\/$/, "")}/stellen`,
      `${safeWebsite.replace(/\/$/, "")}/stellenausschreibungen`,
    ];

    const pages = [] as { url: string; text: string }[];
    const emailOptions: ContactOption[] = [];

    for (const url of candidates) {
      try {
        const html = await fetchHtml(url);
        if (!html) continue;
        const text = normalizeObfuscatedEmails(stripHtml(html)).slice(0, 8000);
        pages.push({ url, text });
        const foundEmails = findEmails(text);
        for (const email of foundEmails) {
          emailOptions.push({ value: email, source: url });
        }
      } catch {
        // ignore
      }
    }

    if (emailOptions.length === 0) {
      const fallbackEmails = await searchFallbackEmails(safeCompany);
      for (const email of fallbackEmails) {
        emailOptions.push({ value: email, source: "search_fallback", needsReview: true });
      }
    }

    const combined = pages.map((page) => `URL: ${page.url}\nTEXT: ${page.text}`).join("\n\n---\n\n").slice(0, 18000);

    const client = new OpenAI({ apiKey: openaiKey });
    const ai = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "Extrahiere aus Unternehmenswebsites brauchbare Vertriebs-Kontaktdaten. Antworte nur als JSON. Nutze nur plausible Informationen aus dem Material.",
        },
        {
          role: "user",
          content: JSON.stringify({
            company: safeCompany,
            website: safeWebsite,
            emailCandidates: uniqOptions(emailOptions),
            pages,
            outputFormat: {
              bestEmail: "",
              emailOptions: [{ value: "", source: "", needsReview: false }],
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
          name: "bulk_contact_v2",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              bestEmail: { type: "string" },
              emailOptions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    value: { type: "string" },
                    source: { type: "string" },
                    needsReview: { type: "boolean" },
                  },
                  required: ["value", "source", "needsReview"],
                },
              },
              bestContactPerson: { type: "string" },
              contactPersonOptions: {
                type: "array",
                items: { type: "string" },
              },
              industry: { type: "string" },
            },
            required: ["bestEmail", "emailOptions", "bestContactPerson", "contactPersonOptions", "industry"],
          },
        },
      },
    });

    const parsed = JSON.parse(ai.output_text || "{}");
    const aiEmailOptions = Array.isArray(parsed?.emailOptions)
      ? parsed.emailOptions.map((item: any) => ({
          value: String(item?.value || "").trim(),
          source: String(item?.source || "").trim(),
          needsReview: Boolean(item?.needsReview),
        }))
      : [];

    const mergedEmailOptions = uniqOptions([
      ...aiEmailOptions,
      ...uniqOptions(emailOptions),
    ]).slice(0, 3);

    const bestEmail =
      String(parsed?.bestEmail || "").trim() || mergedEmailOptions[0]?.value || "";

    const contactPersonOptions = Array.isArray(parsed?.contactPersonOptions)
      ? parsed.contactPersonOptions.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 3)
      : [];

    const bestContactPerson = String(parsed?.bestContactPerson || "").trim() || contactPersonOptions[0] || "";

    return NextResponse.json({
      contactStatus: bestEmail ? "done" : "error",
      email: bestEmail,
      emailOptions: mergedEmailOptions,
      emailNeedsReview: mergedEmailOptions.find((item) => item.value === bestEmail)?.needsReview || false,
      contactPerson: bestContactPerson,
      contactPersonOptions,
      industry: String(parsed?.industry || "").trim(),
    });
  } catch (error: any) {
    console.error("BULK CONTACT V2 ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Kontaktdatensuche fehlgeschlagen." },
      { status: 500 }
    );
  }
}
