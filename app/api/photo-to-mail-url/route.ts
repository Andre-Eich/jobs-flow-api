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
    const { url, hints } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "Keine URL angegeben." },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Seite konnte nicht geladen werden." },
        { status: 500 }
      );
    }

    const html = await res.text();

    const text = html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 10000);

    const prompt = `
Du analysierst eine Stellenanzeige (Text).

Extrahiere:
- jobTitle
- company
- contactPerson
- email

Erstelle eine kurze VERTRIEBSMAIL (keine Bewerbung!).

WICHTIG:
- Kein Bewerbungston
- Fokus: Nutzen

${buildHintsText(hints)}

Ende:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."

Antwort als JSON.
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
        messages: [{ role: "user", content: prompt }],
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