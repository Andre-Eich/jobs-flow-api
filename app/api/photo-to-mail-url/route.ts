import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "Keine URL angegeben." },
        { status: 400 }
      );
    }

    // 👉 Seite laden
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Seite konnte nicht geladen werden." },
        { status: 500 }
      );
    }

    const html = await response.text();

    // 👉 sehr simple Text-Extraktion
    const textContent = html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 8000); // begrenzen

    // 👉 Prompt
    const prompt = `
Du bekommst den Inhalt einer deutschen Stellenanzeige.

Extrahiere:
- jobTitle
- company
- contactPerson
- email

Erstelle zusätzlich eine kurze, professionelle Akquise-Mail.

Regeln:
- Deutsch
- kurz und klar
- kein "Betreff:"
- keine Signatur
- kein Name
- kein "Mit freundlichen Grüßen"
- kein Platzhalter

Ende mit:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."

Antwort als JSON:
{
  "jobTitle": "...",
  "company": "...",
  "contactPerson": "...",
  "email": "...",
  "generatedEmail": "..."
}

Text:
${textContent}
`;

    // 👉 OpenAI Call
    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 800,
        }),
      }
    );

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      return NextResponse.json(
        { error: aiData?.error?.message || "KI Fehler" },
        { status: 500 }
      );
    }

    const content = aiData?.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "JSON Parsing Fehler" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobTitle: parsed.jobTitle || "",
      company: parsed.company || "",
      contactPerson: parsed.contactPerson || "",
      email: parsed.email || "",
      generatedEmail: parsed.generatedEmail || "",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Fehler" },
      { status: 500 }
    );
  }
}