import OpenAI from "openai";
import { NextResponse } from "next/server";

type TextBlock = {
  id?: string;
  title?: string;
  text?: string;
};

const SUBJECT_VARIANTS_STANDARD = [
  "Zusätzliche regionale Sichtbarkeit für offene Positionen",
  "Kurze Idee für mehr Reichweite Ihrer Stellenanzeigen",
  "Mehr regionale Sichtbarkeit für Ihre Vakanzen",
  "Ergänzende Reichweite für offene Positionen in Berlin-Brandenburg",
];

const SUBJECT_VARIANTS_SHORT = [
  "Kurze Idee zu zusätzlicher Reichweite",
  "Ergänzende Sichtbarkeit für offene Positionen",
  "Kurzer Hinweis zu regionaler Reichweite",
];

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const company = String(body.company || "").trim();
    const industry = String(body.industry || "").trim();
    const analysisSummary = String(body.analysisSummary || "").trim();
    const shortMode = Boolean(body.shortMode);
    const contactPerson = String(body.contactPerson || "").trim();
    const textBlocks: TextBlock[] = Array.isArray(body.textBlocks) ? body.textBlocks : [];

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: openaiKey });
    const subject = shortMode ? pickRandom(SUBJECT_VARIANTS_SHORT) : pickRandom(SUBJECT_VARIANTS_STANDARD);

    const greeting = contactPerson
      ? `Guten Tag ${contactPerson},`
      : "Guten Tag,";

    const blockTexts = textBlocks.map((block) => String(block?.text || "").trim()).filter(Boolean);

    const prompt = `
Erstelle eine professionelle deutsche Vertriebs-E-Mail für ein regionales Stellenportal.

Kontext:
- Unternehmen: ${company || "das Unternehmen"}
- Branche: ${industry || "unbekannt"}
- Analysehinweis: ${analysisSummary || "keine Zusatzanalyse"}
- Modus: ${shortMode ? "Kurze Mail" : "Standard"}

Ziel:
Dem Unternehmen soll angeboten werden, offene Positionen zusätzlich auf jobs-in-berlin-brandenburg.de regional sichtbar zu machen.

WICHTIG:
- Keine Bewerbung
- Kein Betreff
- Keine Signatur
- Keine Grußformel am Ende, die kommt später separat
- Nach der Begrüßung beginnt ein neuer Absatz
- Formuliere weich und unaufdringlich
- Vermeide harte Formulierungen wie "wir platzieren" oder "wir erhöhen"
- Besser: "kann helfen", "lässt sich ergänzen", "zusätzliche Sichtbarkeit", "regional sichtbar machen"
- Allgemeiner formulieren als bei einer einzelnen konkret analysierten Stellenanzeige
- Die später eingefügten Zusatzbausteine dürfen nicht vorweggenommen oder fast wortgleich wiederholt werden

${shortMode ? `
Kurze Mail:
- Der Haupttext soll nur aus 1 bis 2 kurzen Sätzen bestehen
- Er soll bewusst kompakt bleiben, damit spätere Zusatzbausteine prominenter wirken
` : `
Standard:
- Der Haupttext darf aus 3 bis 5 kurzen Sätzen bestehen
- Er soll die Vorteile einer gezielten regionalen Stellenbörse klar machen
`}

Zusatzbausteine, die später 1:1 eingefügt werden:
${blockTexts.length ? blockTexts.map((text) => `- ${text}`).join("\n") : "- keine"}

Antworte nur als JSON mit diesem Format:
{
  "body": "...",
  "cta": "..."
}
`;

    const response = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content: "Du schreibst kurze, professionelle deutsche B2B-Outreach-Mails. Gib nur gültiges JSON aus.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "bulk_mail_v2",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              body: { type: "string" },
              cta: { type: "string" },
            },
            required: ["body", "cta"],
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text || "{}");
    const bodyText = String(parsed.body || "").trim();
    const ctaText = String(parsed.cta || "").trim() || "Gerne sende ich Ihnen bei Interesse ein unverbindliches Angebot zu.";

    if (!bodyText) {
      return NextResponse.json({ error: "Kein Bulk-Text erzeugt." }, { status: 500 });
    }

    const finalText = [
      greeting,
      "",
      bodyText,
      ...(blockTexts.length ? ["", ...blockTexts] : []),
      "",
      ctaText,
    ].join("\n");

    return NextResponse.json({
      subject,
      text: finalText,
      shortMode,
      usedTextBlocks: blockTexts.length,
    });
  } catch (error: any) {
    console.error("GENERATE BULK EMAIL V2 ERROR:", error);
    return NextResponse.json({ error: error?.message || "Bulk-Text konnte nicht erzeugt werden." }, { status: 500 });
  }
}
