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
  return stripHtml(await response.text()).slice(0, 6000);
}

function findEmails(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return Array.from(new Set(matches)).slice(0, 5);
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
    ];

    const pages = [] as { url: string; text: string }[];
    for (const url of candidates) {
      try {
        const text = await fetchText(url);
        if (text) pages.push({ url, text });
      } catch {
        // ignore
      }
    }

    const combined = pages.map((page) => `URL: ${page.url}\nTEXT: ${page.text}`).join("\n\n---\n\n").slice(0, 15000);
    const fallbackEmails = findEmails(combined);

    const client = new OpenAI({ apiKey: openaiKey });
    const ai = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "Extrahiere aus Unternehmenswebsites brauchbare Vertriebs-Kontaktdaten. Antworte nur als JSON. Nutze nur Informationen, die plausibel in den Texten stehen.",
        },
        {
          role: "user",
          content: JSON.stringify({
            company: safeCompany,
            website: safeWebsite,
            fallbackEmails,
            pages,
            outputFormat: {
              email: "",
              contactPerson: "",
              industry: "",
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "bulk_contact",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              email: { type: "string" },
              contactPerson: { type: "string" },
              industry: { type: "string" },
            },
            required: ["email", "contactPerson", "industry"],
          },
        },
      },
    });

    const parsed = JSON.parse(ai.output_text || "{}");
    const email = String(parsed.email || fallbackEmails[0] || "").trim();

    return NextResponse.json({
      contactStatus: email ? "done" : "error",
      email,
      contactPerson: String(parsed.contactPerson || "").trim(),
      industry: String(parsed.industry || "").trim(),
    });
  } catch (error: any) {
    console.error("BULK CONTACT ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Kontaktdatensuche fehlgeschlagen." },
      { status: 500 }
    );
  }
}
