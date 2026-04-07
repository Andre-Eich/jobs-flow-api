import { NextResponse } from "next/server";

const DEFAULT_VALUES = {
  jobTitle: "die ausgeschriebene Position",
  company: "Ihr Unternehmen",
  contactPerson: "Guten Tag",
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

1. Extrahiere:
- jobTitle (Stellentitel)
- company (Unternehmen)
- contactPerson (Ansprechpartner)
- email (E-Mail)

2. Bestimme zusätzlich:
- category (z. B. Handwerk, Pflege, IT, Management, Büro, Sonstiges)

3. Erstelle eine kurze, überzeugende Akquise-E-Mail für ein Stellenportal.

Ziel:
https://jobs-in-berlin-brandenburg.de/

Passe Tonalität und Argumente an:

- Handwerk / Pflege:
  → Fachkräftemangel
  → Schwierigkeit passende Bewerber
  → passive Kandidaten + Social Media

- IT / Management / Büro:
  → digitale Reichweite in Berlin & Brandenburg
  → zusätzlich buchbar über Indeed, meinestadt und Stepstone

Regeln:
- Deutsch
- kurz
- professionell
- kein "Betreff:" im generierten Text
- keine Signatur
- kein Name
- keine Kontaktdaten
- keine Platzhalter wie [Ihr Name], [Ihr Unternehmen], [Ihr Kontakt]
- nutze erkannte Daten
- ende mit einem kurzen Abschlusssatz, z. B.:
  "Gerne sende ich Ihnen ein unverbindliches Angebot zu."
- KEINE Grußformel
- KEINE Signatur

Antwort als JSON:
{
  "jobTitle": "...",
  "company": "...",
  "contactPerson": "...",
  "email": "...",
  "category": "...",
  "generatedEmail": "nur der eigentliche Mailtext ohne Grußformel und ohne Signatur"
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
          max_tokens: 800,
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
    const contactPerson =
      parsed.contactPerson?.trim() || DEFAULT_VALUES.contactPerson;
    const email = parsed.email?.trim() || DEFAULT_VALUES.email;

    const fallbackEmail = `${contactPerson},

ich bin auf Ihre Stellenanzeige als "${jobTitle}" bei ${company} aufmerksam geworden.

Gerne würde ich Ihnen anbieten, diese Position zusätzlich auf meinem Stellenportal zu veröffentlichen:

https://jobs-in-berlin-brandenburg.de/

Damit erreichen Sie gezielt Bewerber aus Berlin & Brandenburg.

Gerne sende ich Ihnen ein unverbindliches Angebot zu.`;

    const generatedEmail =
      parsed.generatedEmail && parsed.generatedEmail.trim().length > 20
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