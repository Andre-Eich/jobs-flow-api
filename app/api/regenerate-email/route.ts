import { NextResponse } from "next/server";

function buildHintsText(hints: string[] = []) {
  if (!hints.length) return "";

  const map: Record<string, string> = {
    "multiple-jobs": "Mehrere Anzeigen gleichzeitig schalten erwähnen.",
    "social-media": "Facebook & Instagram Reichweite erwähnen.",
    "print": "Print-Anzeige bei BB CROSS erwähnen.",
    "multiposting": "Indeed, MeineStadt und Stepstone erwähnen.",
  };

  return `
Zusätzliche Hinweise:
${hints.map((h) => "- " + map[h]).join("\n")}
`;
}

export async function POST(req: Request) {
  try {
    const { jobTitle, company, contactPerson, hints } = await req.json();

    const prompt = `
Erstelle eine kurze, professionelle VERTRIEBSMAIL.

Kontext:
- Job: ${jobTitle || "Position"}
- Firma: ${company || "Unternehmen"}

${buildHintsText(hints)}

WICHTIG:
- KEINE Bewerbung
- Fokus Nutzen
- kurz und klar

Ende:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."
`;

    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
    });

    const data = await ai.json();

    if (!ai.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "KI Fehler" },
        { status: 500 }
      );
    }

    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Kein Text erzeugt" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      generatedEmail: text,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Server Fehler" },
      { status: 500 }
    );
  }
}