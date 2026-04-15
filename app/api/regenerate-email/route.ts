import { NextResponse } from "next/server";
import { buildFormalPreviewGreeting } from "@/lib/contactPerson";

type HookBaseId =
  | "hybrid"
  | "punch"
  | "soft-personal"
  | "problem-focus"
  | "regional"
  | "reach"
  | "competition"
  | "social-proof"
  | "minimal"
  | "consultative";

type HookVariant = {
  id: string;
  text: (jobTitle: string) => string;
};

type HookBase = {
  id: HookBaseId;
  label: string;
  variants: HookVariant[];
};

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

const HOOK_BASES: HookBase[] = [
  {
    id: "hybrid",
    label: "Hybrid",
    variants: [
      {
        id: "hybrid_1",
        text: () =>
          `Für Positionen wie Ihre nutzen viele Unternehmen zusätzlich unsere Plattform, um mehr passende Bewerber zu erreichen. Über 30.000 Jobsuchende sind monatlich auf unseren regionalen Stellenbörsen aktiv.`,
      },
      {
        id: "hybrid_2",
        text: () =>
          `Viele Unternehmen nutzen für Positionen wie Ihre zusätzlich unsere Plattform, um ihre Reichweite zu erhöhen. Monatlich suchen über 30.000 Jobsuchende auf unseren regionalen Stellenbörsen nach neuen Chancen.`,
      },
      {
        id: "hybrid_3",
        text: (jobTitle) =>
          `Gerade für Stellen wie ${jobTitle} kann zusätzliche regionale Reichweite entscheidend sein. Über 30.000 Jobsuchende sind monatlich auf unseren regionalen Stellenbörsen aktiv.`,
      },
    ],
  },
  {
    id: "punch",
    label: "Punch",
    variants: [
      {
        id: "punch_1",
        text: () =>
          `Über 30.000 Bewerber suchen monatlich auf unseren regionalen Stellenbörsen nach neuen Positionen – gerade in Berlin und Brandenburg sehen wir hier oft deutlich mehr Rücklauf.`,
      },
      {
        id: "punch_2",
        text: () =>
          `Monatlich nutzen über 30.000 Jobsuchende unsere regionalen Stellenbörsen. Gerade in Berlin und Brandenburg lässt sich so häufig zusätzlicher Rücklauf erzeugen.`,
      },
      {
        id: "punch_3",
        text: () =>
          `Über 30.000 Jobsuchende informieren sich monatlich auf unseren regionalen Stellenbörsen über neue Positionen. Das schafft zusätzliche Sichtbarkeit genau in Ihrer Region.`,
      },
    ],
  },
  {
    id: "soft-personal",
    label: "Soft Personal",
    variants: [
      {
        id: "soft_personal_1",
        text: (jobTitle) =>
          `Gerade bei Positionen wie ${jobTitle} sehen wir häufig, dass zusätzliche regionale Reichweite den Unterschied macht.`,
      },
      {
        id: "soft_personal_2",
        text: (jobTitle) =>
          `Bei Stellen wie ${jobTitle} kann eine ergänzende regionale Veröffentlichung sinnvoll sein, um mehr passende Bewerber zu erreichen.`,
      },
      {
        id: "soft_personal_3",
        text: (jobTitle) =>
          `Gerade für Positionen wie ${jobTitle} lohnt sich oft zusätzliche Sichtbarkeit in Berlin und Brandenburg.`,
      },
    ],
  },
  {
    id: "problem-focus",
    label: "Problem-Fokus",
    variants: [
      {
        id: "problem_focus_1",
        text: (jobTitle) =>
          `Viele Unternehmen berichten uns aktuell, dass es zunehmend schwieriger wird, passende Bewerber für Positionen wie ${jobTitle} zu erreichen.`,
      },
      {
        id: "problem_focus_2",
        text: (jobTitle) =>
          `Gerade bei Stellen wie ${jobTitle} bleibt der gewünschte Rücklauf oft hinter den Erwartungen zurück, wenn nur auf wenigen Kanälen veröffentlicht wird.`,
      },
      {
        id: "problem_focus_3",
        text: () =>
          `Viele Unternehmen stehen derzeit vor der Herausforderung, qualifizierte Bewerber zuverlässig und regional sichtbar zu erreichen.`,
      },
    ],
  },
  {
    id: "regional",
    label: "Regional",
    variants: [
      {
        id: "regional_1",
        text: () =>
          `Mit unserer regionalen Reichweite in Berlin und Brandenburg lassen sich Stellenanzeigen gezielt dort sichtbar machen, wo passende Bewerber tatsächlich suchen.`,
      },
      {
        id: "regional_2",
        text: () =>
          `Gerade in Berlin und Brandenburg kann zusätzliche regionale Sichtbarkeit helfen, Ihre Anzeige gezielt vor passende Bewerber zu bringen.`,
      },
      {
        id: "regional_3",
        text: () =>
          `Unsere regionalen Stellenbörsen werden gezielt von Jobsuchenden aus Berlin und Brandenburg genutzt – genau dort kann Ihre Anzeige zusätzliche Reichweite gewinnen.`,
      },
    ],
  },
  {
    id: "reach",
    label: "Reichweite",
    variants: [
      {
        id: "reach_1",
        text: () =>
          `Viele Unternehmen erweitern ihre Reichweite gezielt, um mehr passende Bewerber zu erreichen und offene Stellen schneller sichtbar zu machen.`,
      },
      {
        id: "reach_2",
        text: () =>
          `Zusätzliche Sichtbarkeit kann ein entscheidender Hebel sein, wenn Stellenanzeigen mehr passende Reichweite erhalten sollen.`,
      },
      {
        id: "reach_3",
        text: () =>
          `Ergänzende Reichweite über regionale Stellenbörsen hilft häufig dabei, zusätzliche qualifizierte Bewerber anzusprechen.`,
      },
    ],
  },
  {
    id: "competition",
    label: "Wettbewerb",
    variants: [
      {
        id: "competition_1",
        text: () =>
          `Viele Unternehmen in der Region erhöhen aktuell ihre Sichtbarkeit, um im Wettbewerb um passende Bewerber besser wahrgenommen zu werden.`,
      },
      {
        id: "competition_2",
        text: () =>
          `Im Wettbewerb um qualifizierte Bewerber kann zusätzliche regionale Präsenz ein klarer Vorteil sein.`,
      },
      {
        id: "competition_3",
        text: () =>
          `Gerade in angespannten Bewerbermärkten ist zusätzliche Sichtbarkeit oft entscheidend, um schneller passende Rückmeldungen zu erhalten.`,
      },
    ],
  },
  {
    id: "social-proof",
    label: "Kundenbeweis",
    variants: [
      {
        id: "social_proof_1",
        text: () =>
          `Viele unserer Kunden nutzen unsere Plattform ergänzend, um zusätzliche Bewerbungen aus der Region zu erhalten.`,
      },
      {
        id: "social_proof_2",
        text: () =>
          `Unternehmen aus Berlin und Brandenburg setzen unsere regionalen Stellenbörsen ein, um ihre Reichweite gezielt zu erweitern.`,
      },
      {
        id: "social_proof_3",
        text: () =>
          `Unsere Plattform wird von vielen Unternehmen ergänzend genutzt, wenn zusätzliche regionale Sichtbarkeit für offene Positionen gefragt ist.`,
      },
    ],
  },
  {
    id: "minimal",
    label: "Minimal",
    variants: [
      {
        id: "minimal_1",
        text: () =>
          `Wir unterstützen Unternehmen dabei, ihre Stellenanzeigen regional sichtbarer zu machen.`,
      },
      {
        id: "minimal_2",
        text: () =>
          `Über unsere regionalen Stellenbörsen lassen sich offene Positionen gezielt in Berlin und Brandenburg sichtbar machen.`,
      },
      {
        id: "minimal_3",
        text: () =>
          `Mit zusätzlicher regionaler Sichtbarkeit lassen sich passende Bewerber oft gezielter erreichen.`,
      },
    ],
  },
  {
    id: "consultative",
    label: "Beratend",
    variants: [
      {
        id: "consultative_1",
        text: () =>
          `Gern zeige ich Ihnen, wie Ihre Stellenanzeige zusätzlich regional sichtbar gemacht werden kann.`,
      },
      {
        id: "consultative_2",
        text: () =>
          `Ich möchte Ihnen kurz zeigen, wie sich die Reichweite Ihrer Anzeige in Berlin und Brandenburg sinnvoll ergänzen lässt.`,
      },
      {
        id: "consultative_3",
        text: () =>
          `Gern gebe ich Ihnen einen kurzen Überblick, wie zusätzliche regionale Sichtbarkeit für Ihre Anzeige aussehen kann.`,
      },
    ],
  },
];

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickHook(selectedHookBaseId?: string, jobTitle?: string) {
  const safeJobTitle =
    String(jobTitle || "").trim() || "die ausgeschriebene Position";

  const selectedBase =
    selectedHookBaseId && selectedHookBaseId !== "auto"
      ? HOOK_BASES.find((item) => item.id === selectedHookBaseId)
      : undefined;

  const hookBase = selectedBase || getRandomItem(HOOK_BASES);
  const hookVariant = getRandomItem(hookBase.variants);
  const hookText = hookVariant.text(safeJobTitle);

  return {
    hookBaseId: hookBase.id,
    hookBaseLabel: hookBase.label,
    hookVariantId: hookVariant.id,
    hookText,
  };
}

function removeLeadingGreeting(text: string) {
  return String(text || "")
    .replace(
      /^\s*(?:sehr\s+geehrte\s+damen\s+und\s+herren|sehr\s+geehrte(?:r|n)?(?:\s+(?:frau|herr))?(?:\s+[^\n,]+){0,4}|guten\s+tag(?:\s+[^\n,]+){0,4}|hallo(?:\s+[^\n,]+){0,4}),\s*/i,
      ""
    )
    .trim();
}

function ensurePreviewGreeting(text: string, contactPerson: string) {
  const greeting = buildFormalPreviewGreeting(contactPerson);
  const body = removeLeadingGreeting(text);

  return body ? `${greeting}\n\n${body}` : greeting;
}

export async function POST(req: Request) {
  try {
    const {
      jobTitle,
      company,
      contactPerson,
      hints,
      followUp,
      selectedHookBaseId,
    } = await req.json();

    const safeJobTitle =
      String(jobTitle || "").trim() || "die ausgeschriebene Position";
    const safeCompany = String(company || "").trim() || "Ihr Unternehmen";
    const safeContactPerson = String(contactPerson || "").trim();
    const previewGreeting = buildFormalPreviewGreeting(safeContactPerson);

    const openingInstruction = safeContactPerson
      ? `Beginne exakt mit "${previewGreeting}". Verwende in der Anrede nur Frau oder Herr plus Nachname, niemals den Vornamen. Verwende den Ansprechpartner "${safeContactPerson}" nur in der Anrede. Im eigentlichen Mailtext darf der Ansprechpartner nicht erwähnt oder direkt angesprochen werden. Nach der Anrede folgt immer eine Leerzeile.`
      : `Beginne exakt mit "${previewGreeting}". Nach der Anrede folgt immer eine Leerzeile.`;

    const hookMeta = pickHook(selectedHookBaseId, safeJobTitle);

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

    const hookInstruction = followUp
      ? ""
      : `
Verwende nach der Anrede als Einstieg genau diese Formulierung bzw. sinngleich sehr nah daran:
"${hookMeta.hookText}"

Der Einstieg soll klar erkennbar im ersten inhaltlichen Absatz vorkommen.
`;

    const prompt = `
Erstelle eine kurze, professionelle Vertriebs-E-Mail auf Deutsch.

Kontext:
- Stellentitel: ${safeJobTitle}
- Unternehmen: ${safeCompany}

${openingInstruction}
${followUpInstruction}
${hookInstruction}

Ziel:
Dem Unternehmen soll angeboten werden, die Stellenanzeige zusätzlich auf jobs-in-berlin-brandenburg.de zu veröffentlichen.

WICHTIG:
- Das ist KEINE Bewerbung
- Fokus auf Nutzen für das Unternehmen
- kurz, klar, professionell
- Der erste Satz nach der Anrede muss mit einem kleingeschriebenen Wort beginnen
- Verwende echte deutsche Umlaute: ä, ö, ü
- Wenn eine Grußformel erwähnt oder ausgegeben wird, dann immer "Mit freundlichen Grüßen" mit ß
- Der Ansprechpartner darf nur in der Anrede stehen, niemals im eigentlichen Mailtext
- Keine Formulierungen im Text wie "Herr X", "Frau X", "Herr Nachname", "Frau Nachname" oder direkte Ansprache im Fließtext
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
"Informationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenbörse finden Sie hier: www.jobs-berlin-brandenburg.de"
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

    const rawText = data?.choices?.[0]?.message?.content?.trim();
    const text = ensurePreviewGreeting(rawText, safeContactPerson);

    if (!rawText) {
      return NextResponse.json(
        { error: "Kein Text erzeugt" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      generatedEmail: text,
      hookBaseId: followUp ? "followup" : hookMeta.hookBaseId,
      hookBaseLabel: followUp ? "Follow-up" : hookMeta.hookBaseLabel,
      hookVariantId: followUp ? "followup_default" : hookMeta.hookVariantId,
      hookText: followUp ? text : hookMeta.hookText,
    });
  } catch (error) {
    console.error("REGENERATE EMAIL ERROR:", error);
    return NextResponse.json({ error: "Server Fehler" }, { status: 500 });
  }
}
