import { NextResponse } from "next/server";

function buildHintsText(hints: string[] = []) {
  if (!hints.length) return "";

  const map: Record<string, string> = {
    "multiple-jobs":
      "Erwähne die Möglichkeit, mehrere Anzeigen gleichzeitig günstig zu schalten.",
    "social-media":
      "Hebe hervor, dass Stellenanzeigen zusätzlich auf Facebook und Instagram ausgespielt werden und so auch passive Kandidaten erreicht werden.",
    "print":
      "Erwähne die enthaltene Print-Anzeige bei BB CROSS und nenne kurz Vorteile wie regionale Sichtbarkeit und zusätzliche Reichweite.",
    "multiposting":
      "Erwähne die Möglichkeit, Stellenanzeigen zusätzlich über Indeed, MeineStadt und Stepstone zu buchen.",
  };

  return `
Zusätzliche Hinweise für die Formulierung:
${hints.map((h) => "- " + map[h]).filter(Boolean).join("\n")}
`;
}

export async function POST(req: Request) {
  try {
    const { jobTitle, company, contactPerson, hints, followUp } =
      await req.json();

    const safeJobTitle =
      String(jobTitle || "").trim() || "die ausgeschriebene Position";
    const safeCompany = String(company || "").trim() || "Ihr Unternehmen";
    const safeContactPerson = String(contactPerson || "").trim();

    const openingInstruction = safeContactPerson
      ? `Nutze den Ansprechpartner "${safeContactPerson}" natürlich und professionell. Nach der Anrede folgt immer eine Leerzeile.`
      : `Beginne mit "Sehr geehrte Damen und Herren,". Nach der Anrede folgt immer eine Leerzeile.`;

    const followUpInstruction = followUp
      ? `
Dies ist eine Erinnerungs-Mail zu einer bereits versendeten ersten Nachricht.

WICHTIG:
- Der Text muss klar als freundliche Erinnerung formuliert sein.
- Stelle kurz Bezug zur vorherigen Nachricht her.
- Formuliere deutlich kürzer als die erste Mail.
- Freundlich, professionell und unaufdringlich.
- Kein Bewerbungston.
- Kein Druck.
- Kein aggressiver Verkaufston.
- Nicht dieselben Formulierungen wie in der ersten Mail wiederholen.
- Die Mail soll wirken wie ein kurzer, höflicher Reminder.
`
      : "";

    const prompt = `
Erstelle eine kurze, professionelle Vertriebs-E-Mail auf Deutsch.

Kontext:
- Stellentitel: ${safeJobTitle}
- Unternehmen: ${safeCompany}

${openingInstruction}
${followUpInstruction}

Ziel:
Dem Unternehmen soll angeboten werden, die Stellenanzeige zusätzlich auf jobs-in-berlin-brandenburg.de zu veröffentlichen.

WICHTIG:
- Das ist KEINE Bewerbung
- Fokus auf Nutzen für das Unternehmen
- kurz, klar, professionell
- keine Signatur
- keine Grußformel
- kein "Betreff:"
- keine Kontaktdaten
- Nach der Anrede folgt immer ein neuer Absatz

Verboten sind Formulierungen wie:
- "ich interessiere mich für die Stelle"
- "ich habe großes Interesse"
- "ich möchte mich bewerben"
- "Gesprächstermin"
- "Bewerbung"

${buildHintsText(Array.isArray(hints) ? hints : [])}

${
  followUp
    ? `
Die Mail soll sinngemäß als kurze Erinnerung aufgebaut sein.
Sie darf zum Beispiel mit einer höflichen Erinnerung an die letzte Nachricht beginnen.
`
    : ""
}

Die Mail soll mit diesem Satz enden:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."

Danach folgt IMMER ein neuer Absatz mit exakt diesem Text:
"Informationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenbörse finden Sie hier: www.jobs-in-berlin-brandenburg.de"
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
        max_tokens: 700,
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
    console.error("REGENERATE EMAIL ERROR:", error);
    return NextResponse.json({ error: "Server Fehler" }, { status: 500 });
  }
}