import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildCrmMetaHtmlComment, buildCrmMetaText } from "@/lib/crmMeta";
import { saveTextControllingEntry } from "@/lib/textControllingStore";
import { upsertLeadMail } from "@/lib/leadStore";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeGreeting(text: string) {
  let normalized = text.trim();

  normalized = normalized.replace(
    /^(Sehr geehrte Damen und Herren,)\s*/i,
    "Sehr geehrte Damen und Herren,\n\n"
  );

  normalized = normalized.replace(/^(Guten Tag [^\n,]+,)\s*/i, "$1\n\n");

  return normalized.trim();
}

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

function lowercaseFirstContentSentence(text: string) {
  return String(text || "").replace(
    /^((?:Sehr geehrte Damen und Herren,|Guten Tag [^\n,]+,)\n\n)?(\s*)([A-ZÄÖÜ])/,
    (_match, greeting = "", whitespace: string, firstChar: string) =>
      `${greeting}${whitespace}${firstChar.toLocaleLowerCase("de-DE")}`
  );
}

function buildFinalText(text: string, hiddenMarker?: string) {
  let cleanedText = normalizeGreeting(text);
  cleanedText = lowercaseFirstContentSentence(cleanedText);

  cleanedText = cleanedText.replace(
    /(mit freundlichen gruessen[,!]?|freundliche gruesse[,!]?)\s*$/i,
    ""
  ).trim();

  const infoBlock =
    "Informationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenboerse finden Sie hier: www.jobs-berlin-brandenburg.de";

  if (!cleanedText.includes("Informationen zu unseren Anzeigenpreisen")) {
    cleanedText += `\n\n${infoBlock}`;
  }

  let final = `${cleanedText}\n\nMit freundlichen Gruessen`;

  if (hiddenMarker) {
    final += `\n\n<!-- ${hiddenMarker} -->`;
  }

  return final;
}

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildSubject(jobTitle?: string, followUp?: boolean) {
  const safe = (jobTitle || "").trim();

  if (followUp) {
    const followUpSubjects = safe
      ? [
          `Erinnerung zu Ihrer ${safe}-Anzeige`,
          `Noch einmal zu Ihrer ${safe}-Anzeige`,
          `Kurzes Follow-up zur ${safe}-Anzeige`,
        ]
      : [
          "Kurze Erinnerung zu meiner letzten E-Mail",
          "Noch einmal zu meiner letzten Nachricht",
          "Kurzes Follow-up zu meiner letzten E-Mail",
        ];

    return getRandomItem(followUpSubjects);
  }

  const subjectVariants = safe
    ? [
        `Zur Position ${safe}: mehr passende Bewerber`,
        `${safe}: zusaetzliche Bewerber erreichen`,
        `Ihre ${safe}-Anzeige: mehr Reichweite moeglich`,
        `Kurze Idee zu Ihrer ${safe}-Anzeige`,
        `Mehr passende Bewerbungen fuer ${safe}`,
      ]
    : [
        "Mehr Bewerber fuer Ihre Stellenanzeige",
        "Zusaetzliche Bewerber fuer Ihre Anzeige",
        "Ihre Stellenanzeige: mehr Reichweite moeglich",
        "Kurze Idee zu Ihrer Stellenanzeige",
        "Mehr passende Bewerbungen fuer Ihre Anzeige",
      ];

  return getRandomItem(subjectVariants);
}

function getEmailId(result: unknown) {
  if (!result || typeof result !== "object") return "";

  const topLevelId =
    "id" in result && typeof result.id === "string" ? result.id : "";

  const data =
    "data" in result && result.data && typeof result.data === "object"
      ? result.data
      : null;

  const nestedId =
    data && "id" in data && typeof data.id === "string" ? data.id : "";

  return nestedId || topLevelId;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const {
      to,
      text,
      testMode,
      jobTitle,
      company,
      contactPerson,
      phone,
      website,
      postalCode,
      city,
      industry,
      sendCopy,
      followUp,
      originalEmailId,
      hookBaseId,
      hookBaseLabel,
      hookVariantId,
      hookText,
      textBlockTitles = [],
      shortMode = false,
    } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Fehlende Daten." },
        { status: 400 }
      );
    }

    let actualRecipient = String(to || "").trim();
    const isTestMode = Boolean(testMode);
    const testRecipient = String(process.env.TEST_RECIPIENT_EMAIL || "").trim();

    if (isTestMode) {
      if (!testRecipient) {
        return NextResponse.json(
          { error: "TEST_RECIPIENT_EMAIL fehlt." },
          { status: 500 }
        );
      }

      actualRecipient = testRecipient;
    }

    if (!actualRecipient) {
      return NextResponse.json(
        { error: "Kein Empfaenger vorhanden." },
        { status: 400 }
      );
    }

    const hiddenMarker =
      followUp && originalEmailId ? `REMINDER:${originalEmailId}` : undefined;

    const finalText = buildFinalText(text, hiddenMarker);
    const finalSubject = buildSubject(jobTitle, followUp);
    const crmMeta = {
      kind: "single" as const,
      jobTitle: String(jobTitle || "").trim(),
      company: String(company || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      phone: String(phone || "").trim(),
      followUp: Boolean(followUp),
      originalEmailId: String(originalEmailId || "").trim(),
      textBlockTitles: Array.isArray(textBlockTitles) ? textBlockTitles : [],
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
    };

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; font-size: 16px;">
        <div style="margin-bottom: 24px;">
          ${textToHtml(finalText)}
        </div>

        <div style="margin-top: 28px;">
          <div style="font-weight: 700;">Andre Eichstaedt</div>
          <div>Anzeigenberater</div>
          <div>Jobs in Berlin-Brandenburg</div>
          <div>Tel. 0335/629797-38</div>
          <div>
            <a href="mailto:a.eichstaedt@jobs-in-berlin-brandenburg.de" style="color:#111111; text-decoration:none;">
              a.eichstaedt@jobs-in-berlin-brandenburg.de
            </a>
          </div>
          <div style="margin-top: 12px;">Leipziger Str. 56</div>
          <div>15236 Frankfurt (Oder)</div>
          <div>
            <a href="https://www.jobs-in-berlin-brandenburg.de" target="_blank" style="color:#111111; text-decoration:none;">
              www.jobs-in-berlin-brandenburg.de
            </a>
          </div>
          ${buildCrmMetaHtmlComment(crmMeta)}
        </div>
      </div>
    `;

    const result = await resend.emails.send({
      from: "Andre Eichstaedt <a.eichstaedt@jobs-in-berlin-brandenburg.de>",
      replyTo: "a.eichstaedt@jobs-in-berlin-brandenburg.de",
      to: actualRecipient,
      subject: finalSubject,
      html,
      text: `${finalText}\n\n${buildCrmMetaText(crmMeta)}`,
      bcc: isTestMode
        ? testRecipient || undefined
        : sendCopy
        ? "a.eichstaedt@jobs-in-berlin-brandenburg.de"
        : undefined,
    });

    const emailId = getEmailId(result);

    saveTextControllingEntry({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      emailId: String(emailId || ""),
      jobTitle: String(jobTitle || "").trim(),
      company: String(company || "").trim(),
      postalCode: String(postalCode || "").trim(),
      city: String(city || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      phone: String(phone || "").trim(),
      website: String(website || "").trim(),
      industry: String(industry || "").trim(),
      recipientEmail: actualRecipient,
      subject: finalSubject,
      bodyText: finalText,
      hookBaseId: String(hookBaseId || "unknown"),
      hookBaseLabel: String(hookBaseLabel || "Unbekannt"),
      hookVariantId: String(hookVariantId || "unknown"),
      hookText: String(hookText || "").trim(),
      followUp: Boolean(followUp),
      originalEmailId: String(originalEmailId || "").trim(),
      kind: "single",
      textBlockTitles: Array.isArray(textBlockTitles) ? textBlockTitles : [],
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
      opened: false,
      lastEvent: "",
      reminderSent: false,
    });

    upsertLeadMail({
      company: String(company || "").trim(),
      postalCode: String(postalCode || "").trim(),
      city: String(city || "").trim(),
      recipientEmail: String(to || "").trim() || actualRecipient,
      phone: String(phone || "").trim(),
      website: String(website || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      industry: String(industry || "").trim(),
      channel: "kaltakquise",
      mail: {
        id: crypto.randomUUID(),
        emailId: String(emailId || ""),
        createdAt: new Date().toISOString(),
        subject: finalSubject,
        bodyText: finalText,
        textBlockTitles: Array.isArray(textBlockTitles) ? textBlockTitles : [],
        shortMode: Boolean(shortMode),
        testMode: Boolean(testMode),
        channel: "kaltakquise",
        followUp: Boolean(followUp),
        originalEmailId: String(originalEmailId || "").trim(),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      actualRecipient,
      subject: finalSubject,
      emailId,
    });
  } catch (error: unknown) {
    console.error("RESEND ERROR:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler beim Mailversand." },
      { status: 500 }
    );
  }
}
