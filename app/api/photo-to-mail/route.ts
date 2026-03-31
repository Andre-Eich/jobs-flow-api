import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildMail(jobTitle: string, company: string) {
  const cleanTitle = jobTitle?.trim() || "dieser Position";
  const cleanCompany = company?.trim();

  const subject = `Ihre Suche nach ${cleanTitle} – regional sichtbar in Berlin und Brandenburg`;

  const intro = cleanCompany
    ? `Guten Tag,\n\nwie ich sehe, suchen Sie aktuell nach ${cleanTitle} bei ${cleanCompany}.`
    : `Guten Tag,\n\nwie ich sehe, suchen Sie aktuell nach ${cleanTitle}.`;

  const body = `${intro}

Mein Tipp: Nutzen Sie die regionale Stellenbörse jobs-in-berlin-brandenburg.de, um gezielt Bewerber aus Berlin und Brandenburg zu erreichen.

Mehr Informationen und Preise finden Sie hier:
www.jobs-in-berlin-brandenburg.de

Ich freue mich auf Ihre Anfrage und erstelle Ihnen gern ein konkretes Preisangebot.

Freundlicher Gruß,
Andre Eichstädt
Anzeigenberatung
Jobs in Berlin-Brandenburg
Leipziger Str. 56
15236 Frankfurt (Oder)
Tel. 0335 629797-38
a.eichstaedt@jobs-in-berlin-brandenburg.de`;

  return { subject, body };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return Response.json({ error: "Kein Bild empfangen." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const dataUrl = `data:${mimeType};base64,${base64}`;

    // 👇 WICHTIG: ANY FIX für TypeScript
    const input: any = [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Extrahiere aus einer Stellenanzeige die Felder jobTitle, company und email. Antworte nur als JSON.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Lies dieses Bild und extrahiere jobTitle, company und email als JSON.",
          },
          {
            type: "input_image",
            image_url: dataUrl,
            detail: "low",
          },
        ],
      },
    ];

    const response = await client.responses.create({
      model: "gpt-5",
      input,
    });

    const raw = response.output_text || "{}";

    let parsed: any = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const jobTitle = parsed.jobTitle || "";
    const company = parsed.company || "";
    const email = parsed.email || "";

    const { subject, body } = buildMail(jobTitle, company);

    return Response.json({
      jobTitle,
      company,
      email,
      subject,
      body,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Fehler bei Bildanalyse" },
      { status: 500 }
    );
  }
}