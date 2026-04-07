import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { jobTitle, company, contactPerson } = await req.json();

    const safeJobTitle =
      String(jobTitle || "").trim() || "die ausgeschriebene Position";
    const safeCompany = String(company || "").trim() || "Ihrem Unternehmen";
    const safeContactPerson =
      String(contactPerson || "").trim() || "Sehr geehrte Damen und Herren";

    const prompt = `
Erstelle eine kurze, professionelle Akquise-E-Mail auf Deutsch.

Kontext:
- Stellentitel: ${safeJobTitle}
- Unternehmen: ${safeCompany}
- Ansprechpartner: ${safeContactPerson}

Ziel:
Dem Unternehmen soll angeboten werden, die Stellenanzeige zusätzlich auf jobs-in-berlin-brandenburg.de zu veröffentlichen.

Wichtige Regeln:
- Kein Bewerbungston
- Nicht "ich habe Interesse an der Stelle"
- Stattdessen Nutzen für das Unternehmen hervorheben
- Kurz, klar, lösungsorientiert
- Kein "Betreff:"
- Keine Signatur
- Keine Kontaktdaten
- Keine Grußformel
- Ende mit:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."

Wenn kein konkreter Ansprechpartner vorhanden ist, neutral formulieren.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Fehler bei der Textgenerierung." },
        { status: 500 }
      );
    }

    const generatedEmail =
      data?.choices?.[0]?.message?.content?.trim() || "";

    if (!generatedEmail) {
      return NextResponse.json(
        { error: "Kein Text von der KI erhalten." },
        { status: 500 }
      );
    }

    return NextResponse.json({ generatedEmail });
  } catch (error) {
    console.error("REGENERATE EMAIL ERROR:", error);

    return NextResponse.json(
      { error: "Serverfehler bei der Neugenerierung." },
      { status: 500 }
    );
  }
}