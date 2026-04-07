import { NextResponse } from "next/server";

function buildHintsText(hints: string[] = []) {
  if (!hints.length) return "";

  const map: Record<string, string> = {
    "multiple-jobs":
      "Erwähne die Möglichkeit, mehrere Anzeigen gleichzeitig günstig zu schalten.",
    "social-media":
      "Erwähne zusätzliche Reichweite über Facebook und Instagram sowie passive Kandidaten.",
    "print":
      "Erwähne die enthaltene Print-Anzeige bei BB CROSS und deren regionale Vorteile.",
    "multiposting":
      "Erwähne die Möglichkeit, Anzeigen über Indeed, MeineStadt und Stepstone zu buchen.",
  };

  return `
Zusätzliche Hinweise:
${hints.map((h) => "- " + map[h]).join("\n")}
`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;
    const hintsRaw = formData.get("hints") as string;
    const hints = hintsRaw ? JSON.parse(hintsRaw) : [];

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei vorhanden." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const prompt = `
Du analysierst eine deutsche Stellenanzeige (Bild/Screenshot).

Extrahiere:
- jobTitle
- company
- contactPerson
- email

Erstelle zusätzlich eine kurze, professionelle VERTRIEBSMAIL.

WICHTIG:
- KEINE Bewerbung
- NICHT "ich interessiere mich für die Stelle"
- Fokus: Nutzen für Unternehmen
- kurz, klar, professionell

${buildHintsText(hints)}

Ende IMMER mit:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."

Antwort als JSON:
{
  "jobTitle": "...",
  "company": "...",
  "contactPerson": "...",
  "email": "...",
  "generatedEmail": "..."
}
`;

    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 900,
      }),
    });

    const data = await ai.json();

    if (!ai.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "KI Fehler" },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      return NextResponse.json(
        { error: "JSON Parsing Fehler" },
        { status: 500 }
      );
    }

    const fallbackEmail = `Sehr geehrte Damen und Herren,

ich bin auf Ihre Stellenanzeige aufmerksam geworden.

Über jobs-in-berlin-brandenburg.de erreichen Sie gezielt Bewerber aus der Region.

Gerne sende ich Ihnen ein unverbindliches Angebot zu.`;

    return NextResponse.json({
      jobTitle: parsed.jobTitle || "",
      company: parsed.company || "",
      contactPerson: parsed.contactPerson || "",
      email: parsed.email || "",
      generatedEmail: parsed.generatedEmail?.trim() || fallbackEmail,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Server Fehler" },
      { status: 500 }
    );
  }
}