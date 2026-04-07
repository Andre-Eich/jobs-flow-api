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

Extrahiere, wenn vorhanden:
1. jobTitle = Stellentitel
2. company = Unternehmen
3. contactPerson = Ansprechpartner / Ansprechpartnerin
4. email = E-Mail-Adresse

Regeln:
- Antworte ausschließlich als JSON.
- Nutze genau diese Keys:
  jobTitle, company, contactPerson, email
- Wenn ein Feld nicht sicher gefunden wird, gib dafür einen leeren String zurück.
- Keine zusätzlichen Keys.
`;

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    const result = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return NextResponse.json(
        {
          error:
            result?.error?.message || "Fehler bei der Bildanalyse durch die KI.",
        },
        { status: 500 }
      );
    }

    const content = result?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Keine verwertbare Antwort von der KI erhalten." },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Die KI-Antwort konnte nicht als JSON gelesen werden." },
        { status: 500 }
      );
    }

    const jobTitle = (parsed.jobTitle || "").trim() || DEFAULT_VALUES.jobTitle;
    const company = (parsed.company || "").trim() || DEFAULT_VALUES.company;
    const contactPerson =
      (parsed.contactPerson || "").trim() || DEFAULT_VALUES.contactPerson;
    const email = (parsed.email || "").trim() || DEFAULT_VALUES.email;

    const generatedEmail = `Betreff: Bewerbung als ${jobTitle}

${contactPerson},

mit großem Interesse habe ich Ihre Stellenanzeige für die Position "${jobTitle}" bei ${company} gesehen.

Hiermit möchte ich mein Interesse an der ausgeschriebenen Stelle ausdrücken und freue mich über die Möglichkeit, mich bei Ihnen vorzustellen.

Gerne sende ich Ihnen auf Wunsch weitere Unterlagen zu.

Mit freundlichen Grüßen`;

    return NextResponse.json({
      jobTitle,
      company,
      contactPerson,
      email,
      generatedEmail,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Interner Fehler in /api/photo-to-mail." },
      { status: 500 }
    );
  }
}