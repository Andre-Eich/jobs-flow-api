import OpenAI from "openai";
import { NextResponse } from "next/server";

type TextBlock = {
  id?: string;
  title?: string;
  text?: string;
};

const SUBJECT_VARIANTS_STANDARD = [
  "Mehr regionale Sichtbarkeit für Ihre Stellenanzeigen",
  "Kurze Idee für zusätzliche Bewerber-Reichweite",
  "Ihre Stellenanzeigen regional gezielt sichtbarer machen",
  "Mehr Reichweite für offene Positionen in Berlin und Brandenburg",
];

const SUBJECT_VARIANTS_SHORT = [
  "Kurze Idee zu Ihrer Reichweite als Arbeitgeber",
  "Zusätzliche regionale Sichtbarkeit für offene Positionen",
  "Kurzer Hinweis zu Ihrer Stellenanzeigen-Reichweite",
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
    const textBlocks: TextBlock[] = Array.isArray(body.textBlocks) ? body.textBlocks : [];

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: openaiKey });
    const subject = shortMode
      ? pickRandom(SUBJECT_VARIANTS_SHORT)
      : pickRandom(SUBJECT_VARIANTS_STANDARD);

    const blockTexts = textBlocks
      .map((block) => String(block?.text || "").trim())
      .filter(Boolean);

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
- Keine Grußformel am Ende
- Keine Signatur
- Kein Betreff
- Kein Linkblock
- Kein Preisblock
- Kein Hinweis auf Testmodus
- Professionell, kurz, vertrieblich
- Allgemeiner formulieren als bei einer einzelnen konkret analysierten Stellenanzeige
- Die später eingefügten Zusatzbausteine dürfen NICHT vorweggenommen oder fast wortgleich wiederholt werden

${shortMode ? `
Kurze Mail:
- Der Haupttext soll nur aus 1 bis 2 kurzen Sätzen bestehen
- Er soll bewusst kompakt bleiben, damit spätere Zusatzbausteine prominenter wirken
` : `
Standard:
- Der Haupttext darf aus 3 bis 5 kurzen Sätzen bestehen
- Er soll die Vorteile einer gezielten regionalen Stellenbörse klar machen
`}

Wenn Zusatzbausteine ausgewählt sind, dann soll der Haupttext bewusst Platz für diese Bausteine lassen.
Anschließend werden diese Zusatzbausteine 1:1 ergänzt:
${blockTexts.length ? blockTexts.map((text) => `- ${text}`).join("\n") : "- keine"}

Die Antwort soll nur den eigentlichen Mailtext enthalten.
`;

    const response = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "Du schreibst kurze, professionelle deutsche Vertriebs-Mails für B2B-Outreach. Gib nur den Mailtext aus.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const baseText = (response.output_text || "").trim();
    if (!baseText) {
      return NextResponse.json({ error: "Kein Bulk-Text erzeugt." }, { status: 500 });
    }

    const finalText = [
      baseText,
      ...blockTexts,
      "Gerne sende ich Ihnen ein unverbindliches Angebot zu.",
      "Informationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenbörse finden Sie hier: www.jobs-berlin-brandenburg.de",
    ]
      .filter(Boolean)
      .join("\n\n");

    return NextResponse.json({
      subject,
      text: finalText,
      shortMode,
      usedTextBlocks: blockTexts.length,
    });
  } catch (error: any) {
    console.error("GENERATE BULK EMAIL ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Bulk-Text konnte nicht erzeugt werden." },
      { status: 500 }
    );
  }
}
