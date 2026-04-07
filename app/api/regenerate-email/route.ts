import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { jobTitle, company, contactPerson } = await req.json();

    const safeJobTitle =
      String(jobTitle || "").trim() || "die ausgeschriebene Position";
    const safeCompany =
      String(company || "").trim() || "Ihr Unternehmen";
    const safeContactPerson = String(contactPerson || "").trim();

    const opening = safeContactPerson
      ? `Nutze als Einstieg natürlich den Ansprechpartner "${safeContactPerson}".`
      : `Falls kein Ansprechpartner vorhanden ist, beginne mit "Sehr geehrte Damen und Herren,".`;

    const prompt = `
Erstelle eine kurze, professionelle Akquise-E-Mail auf Deutsch.

Kontext:
- Stellentitel: ${safeJobTitle}
- Unternehmen: ${safeCompany}

${opening}

Ziel:
Dem Unternehmen soll angeboten werden, die Stellenanzeige zusätzlich auf jobs-in-berlin-brandenburg.de zu veröffentlichen.

SEHR WICHTIG:
Diese Mail ist KEINE Bewerbung.
Sie darf nicht so klingen, als wolle sich der Absender auf die Stelle bewerben.

Verboten:
- "ich interessiere mich für die Stelle"
- "ich habe großes Interesse"
- "ich möchte mich bewerben"
- "Bewerbung"
- "Gesprächstermin"
- "ich freue mich über Ihre Rückmeldung zu meiner Bewerbung"

Stattdessen:
- Nutzen für das Unternehmen
- zusätzliche Reichweite
- Sichtbarkeit in Berlin und Brandenburg
- ggf. weitere Ausspielung über Indeed, meinestadt und Stepstone
- lösungsorientierter, vertrieblicher Ton

Regeln:
- kurz
- klar
- professionell
- kein "Betreff:"
- keine Grußformel am Ende
- keine Signatur
- keine Kontaktdaten

Die Mail soll mit diesem Satz enden:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."
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