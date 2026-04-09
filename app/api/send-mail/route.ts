import { NextResponse } from "next/server";
import { Resend } from "resend";

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

function buildFinalText(text: string, hiddenMarker?: string) {
  let cleanedText = normalizeGreeting(text);

  cleanedText = cleanedText.replace(
    /(mit freundlichen grüßen[,!]?|freundliche grüße[,!]?)\s*$/i,
    ""
  ).trim();

  const infoBlock =
    "Informationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenbörse finden Sie hier: www.jobs-berlin-brandenburg.de";

  if (!cleanedText.includes("Informationen zu unseren Anzeigenpreisen")) {
    cleanedText += `\n\n${infoBlock}`;
  }

  let final = `${cleanedText}\n\nMit freundlichen Grüßen`;

  // 👇 UNSICHTBARER MARKER
  if (hiddenMarker) {
    final += `\n\n<!-- ${hiddenMarker} -->`;
  }

  return final;
}

function buildSubject(jobTitle?: string, followUp?: boolean) {
  const safe = (jobTitle || "").trim();

  if (followUp) {
    return safe
      ? `Erinnerung zu Ihrer ${safe}-Anzeige`
      : "Kurze Erinnerung zu meiner letzten E-Mail";
  }

  if (safe) {
    return `Zur Position ${safe}: mehr passende Bewerber`;
  }

  return "Mehr Bewerber für Ihre Stellenanzeige";
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
      sendCopy,
      followUp,
      originalEmailId,
    } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Fehlende Daten." },
        { status: 400 }
      );
    }

    // 🚨 HARD SAFETY
    let actualRecipient = to;

    if (testMode) {
      if (!process.env.TEST_RECIPIENT_EMAIL) {
        return NextResponse.json(
          { error: "TEST_RECIPIENT_EMAIL fehlt." },
          { status: 500 }
        );
      }

      actualRecipient = process.env.TEST_RECIPIENT_EMAIL;
    }

    if (!actualRecipient) {
      return NextResponse.json(
        { error: "Kein Empfänger vorhanden." },
        { status: 400 }
      );
    }

    const hiddenMarker =
      followUp && originalEmailId
        ? `REMINDER:${originalEmailId}`
        : undefined;

    const finalText = buildFinalText(text, hiddenMarker);
    const finalSubject = buildSubject(jobTitle, followUp);

    const html = `
      <div style="font-family: Arial, sans-serif;">
        ${textToHtml(finalText)}
      </div>
    `;

    const data = await resend.emails.send({
      from: "Jobs in Berlin-Brandenburg <a.eichstaedt@jobs-in-berlin-brandenburg.de>",
      replyTo: "a.eichstaedt@jobs-in-berlin-brandenburg.de",
      to: actualRecipient,
      subject: finalSubject,
      html,
      text: finalText,
      bcc: testMode
        ? process.env.TEST_RECIPIENT_EMAIL
        : sendCopy
        ? "a.eichstaedt@jobs-in-berlin-brandenburg.de"
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { error: error?.message || "Fehler beim Mailversand." },
      { status: 500 }
    );
  }
}