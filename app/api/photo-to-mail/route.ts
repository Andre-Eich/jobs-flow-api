import { NextResponse } from "next/server";

const DEFAULT_VALUES = {
  jobTitle: "die ausgeschriebene Position",
  company: "Ihr Unternehmen",
  contactPerson: "",
  email: "",
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine Datei erhalten." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const prompt = `
Du analysierst ein Foto oder einen Screenshot einer deutschen Stellenanzeige.

Aufgabe 1: Extrahiere diese Felder:
- jobTitle = Stellentitel
- company = Unternehmen
- contactPerson = Ansprechpartner, falls vorhanden
- email = E-Mail-Adresse, falls vorhanden
- category = eine passende Kategorie, z. B. Handwerk, Pflege, Logistik, IT, Management, Büro, Verwaltung, Sonstiges

Aufgabe 2: Erstelle eine kurze, professionelle Akquise-Mail für den Vertrieb eines Stellenportals.

WICHTIG:
Diese Mail ist KEINE Bewerbung.
Die Mail darf auf keinen Fall so klingen, als wolle sich der Absender auf die Stelle bewerben.

VERBOTEN sind Formulierungen wie:
- "ich interessiere mich für die Stelle"
- "ich habe großes Interesse"
- "ich möchte mich bewerben"
- "ich freue mich auf ein Gespräch"
- "Bewerbung"
- "Gesprächstermin"

Ziel der Mail:
Dem Unternehmen soll angeboten werden, die Stellenanzeige zusätzlich auf jobs-in-berlin-brandenburg.de zu veröffentlichen.

Argumentationslogik:
- Handwerk / Pflege / Logistik:
  Fokus auf schwierige Besetzung, Fachkräftemangel, regionale Sichtbarkeit, passive Kandidaten
- IT / Management / Büro / Verwaltung:
  Fokus auf digitale Reichweite, gezielte Sichtbarkeit in Berlin und Brandenburg, zusätzliche Buchungsmöglichkeiten über Indeed, meinestadt und Stepstone
- Sonstiges:
  Fokus auf zusätzliche Reichweite und regionale Sichtbarkeit

Stil:
- kurz
- professionell
- lösungsorientiert
- vertrieblich
- kein Bewerbungston
- kein "Betreff:"
- keine Grußformel
- keine Signatur
- keine Kontaktdaten
- keine Platzhalter wie [Ihr Name]

Wenn kein Ansprechpartner vorhanden ist:
- beginne neutral mit "Sehr geehrte Damen und Herren,"

Wenn ein Ansprechpartner vorhanden ist:
- nutze ihn sinnvoll, aber natürlich

Die Mail soll ungefähr so aufgebaut sein:
1. Bezug auf die Anzeige
2. Nutzenargument
3. kurzer Abschluss

Die Mail soll mit diesem Satz enden:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."

Antworte ausschließlich als JSON in diesem Format:
{
  "jobTitle": "...",
  "company": "...",
  "contactPerson": "...",
  "email": "...",
  "category": "...",
  "generatedEmail": "..."
}
`;

    const openAiResponse = await fetch(
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
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 900,
        }),
      }
    );

    const result = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return NextResponse.json(
        { error: result?.error?.message || "KI Fehler" },
        { status: 500 }
      );
    }

    const content = result?.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "JSON Fehler" }, { status: 500 });
    }

    const jobTitle = parsed.jobTitle?.trim() || DEFAULT_VALUES.jobTitle;
    const company = parsed.company?.trim() || DEFAULT_VALUES.company;
    const contactPerson = parsed.contactPerson?.trim() || DEFAULT_VALUES.contactPerson;
    const email = parsed.email?.trim() || DEFAULT_VALUES.email;

    const fallbackIntro = contactPerson
      ? `Guten Tag ${contactPerson},`
      : `Sehr geehrte Damen und Herren,`;

    const fallbackEmail = `${fallbackIntro}

ich bin auf Ihre Stellenanzeige als "${jobTitle}" bei ${company} aufmerksam geworden.

Über jobs-in-berlin-brandenburg.de können Sie Ihre Anzeige zusätzlich regional sichtbar machen und gezielt Bewerber aus Berlin und Brandenburg erreichen.

Gerne sende ich Ihnen ein unverbindliches Angebot zu.`;

    const generatedEmail =
      parsed.generatedEmail && parsed.generatedEmail.trim().length > 30
        ? parsed.generatedEmail.trim()
        : fallbackEmail;

    return NextResponse.json({
      jobTitle,
      company,
      contactPerson,
      email,
      generatedEmail,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Server Fehler" }, { status: 500 });
  }
}