import { NextResponse } from "next/server";

type ParsedResult = {
  jobTitle?: string;
  jobTitleOptions?: string[];
  company?: string;
  companyOptions?: string[];
  contactPerson?: string;
  contactPersonOptions?: string[];
  email?: string;
  emailOptions?: string[];
  generatedEmail?: string;
};

function buildOptions(primary?: string, options?: string[]) {
  const values = [primary || "", ...(options || [])]
    .map((v) => String(v).trim())
    .filter(Boolean);

  return Array.from(new Set(values)).slice(0, 4);
}

function buildHintsText(hints: string[] = []) {
  if (!hints.length) return "";

  const map: Record<string, string> = {
    "multiple-jobs":
      "Wenn mehrere ähnliche Stellen offen sind, erwähne die Möglichkeit, mehrere Anzeigen gleichzeitig günstig zu schalten.",
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
    const { url, hints } = await req.json();

    if (!url || typeof url !== "string") {
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
      .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000);

    const prompt = `
Du analysierst den Text einer deutschen Stellenanzeige.

Aufgabe 1:
Extrahiere möglichst zuverlässig:
- jobTitle
- company
- contactPerson
- email

Falls du mehrere plausible Treffer findest, gib zusätzlich Alternativen aus:
- jobTitleOptions
- companyOptions
- contactPersonOptions
- emailOptions

Regeln für die Optionen:
- maximal 3 Alternativen je Feld
- nur echte plausible Varianten
- keine Fantasieeinträge
- wenn nichts da ist, leeres Array

Aufgabe 2:
Erstelle eine kurze, professionelle Vertriebs-E-Mail für ein Stellenportal.

WICHTIG:
- Das ist KEINE Bewerbung.
- Verboten sind Formulierungen wie:
  - "ich interessiere mich für die Stelle"
  - "ich habe großes Interesse"
  - "ich möchte mich bewerben"
  - "Gesprächstermin"
  - "Bewerbung"
- Fokus auf Nutzen für das Unternehmen
- kurz, vertrieblich, professionell
- Der erste Satz nach der Anrede muss mit einem kleingeschriebenen Wort beginnen
- kein "Betreff:"
- keine Grußformel am Ende
- keine Signatur
- keine Kontaktdaten

Ziel:
Dem Unternehmen soll angeboten werden, die Stellenanzeige zusätzlich auf jobs-in-berlin-brandenburg.de zu veröffentlichen.

${buildHintsText(Array.isArray(hints) ? hints : [])}

Die Mail soll mit diesem Satz enden:
"Gerne sende ich Ihnen ein unverbindliches Angebot zu."

Falls kein Ansprechpartner erkennbar ist, beginne neutral mit:
"Sehr geehrte Damen und Herren,"

Antworte ausschließlich als JSON in diesem Format:
{
  "jobTitle": "...",
  "jobTitleOptions": ["...", "..."],
  "company": "...",
  "companyOptions": ["...", "..."],
  "contactPerson": "...",
  "contactPersonOptions": ["...", "..."],
  "email": "...",
  "emailOptions": ["...", "..."],
  "generatedEmail": "..."
}

Stellenanzeigentext:
${text}
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
        max_tokens: 1000,
      }),
    });

    const data = await ai.json();

    if (!ai.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "KI Fehler" },
        { status: 500 }
      );
    }

    let parsed: ParsedResult;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      return NextResponse.json(
        { error: "JSON Parsing Fehler" },
        { status: 500 }
      );
    }

    const jobTitle = String(parsed.jobTitle || "").trim();
    const company = String(parsed.company || "").trim();
    const contactPerson = String(parsed.contactPerson || "").trim();
    const email = String(parsed.email || "").trim();

    const fallbackEmail = `Sehr geehrte Damen und Herren,

ich bin auf Ihre Stellenanzeige aufmerksam geworden.

Über jobs-in-berlin-brandenburg.de erreichen Sie gezielt Bewerber aus der Region Berlin und Brandenburg und erhöhen die Sichtbarkeit Ihrer Anzeige zusätzlich.

Gerne sende ich Ihnen ein unverbindliches Angebot zu.`;

    return NextResponse.json({
      jobTitle,
      jobTitleOptions: buildOptions(jobTitle, parsed.jobTitleOptions),
      company,
      companyOptions: buildOptions(company, parsed.companyOptions),
      contactPerson,
      contactPersonOptions: buildOptions(
        contactPerson,
        parsed.contactPersonOptions
      ),
      email,
      emailOptions: buildOptions(email, parsed.emailOptions),
      generatedEmail: String(parsed.generatedEmail || "").trim() || fallbackEmail,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Server Fehler" },
      { status: 500 }
    );
  }
}
