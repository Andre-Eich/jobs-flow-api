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

  normalized = normalized.replace(
    /^(Guten Tag [^\n,]+,)\s*/i,
    "$1\n\n"
  );

  return normalized.trim();
}

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

function buildFinalText(text: string) {
  let cleanedText = normalizeGreeting(text);

  // alte Grußformeln entfernen
  cleanedText = cleanedText.replace(
    /(mit freundlichen grüßen[,!]?|freundliche grüße[,!]?)\s*$/i,
    ""
  ).trim();

  // 🔥 STABILE ERGÄNZUNG (immer vorhanden)
  const infoBlock =
    "Informationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenbörse finden Sie hier: www.jobs-in-berlin-brandenburg.de";

  if (!cleanedText.includes("Informationen zu unseren Anzeigenpreisen")) {
    cleanedText += `\n\n${infoBlock}`;
  }

  return `${cleanedText}\n\nMit freundlichen Grüßen`;
}

function buildSubject(jobTitle?: string, hints: string[] = []) {
  const safeJobTitle = (jobTitle || "").trim();

  if (hints.includes("multiposting")) {
    return safeJobTitle
      ? `Ihre ${safeJobTitle}-Anzeige zusätzlich auf Indeed & Stepstone`
      : "Ihre Anzeige zusätzlich auf Indeed & Stepstone";
  }

  if (hints.includes("social-media")) {
    return safeJobTitle
      ? `Mehr Bewerber für ${safeJobTitle} über Facebook & Instagram`
      : "Mehr Bewerber über Facebook & Instagram";
  }

  if (hints.includes("print")) {
    return safeJobTitle
      ? `Online + Print: mehr Sichtbarkeit für ${safeJobTitle}`
      : "Online + Print: mehr Sichtbarkeit für Ihre Anzeige";
  }

  if (hints.includes("multiple-jobs")) {
    return "Mehrere Stellen gleichzeitig effizient besetzen";
  }

  if (safeJobTitle) {
    return `Zur Position ${safeJobTitle}: mehr passende Bewerber`;
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

    const { to, text, testMode, jobTitle, hints } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "Fehlende Daten." },
        { status: 400 }
      );
    }

    const safeHints = Array.isArray(hints) ? hints : [];

    const actualRecipient =
      testMode && process.env.TEST_RECIPIENT_EMAIL
        ? process.env.TEST_RECIPIENT_EMAIL
        : to;

    if (!actualRecipient) {
      return NextResponse.json(
        { error: "Kein Empfänger vorhanden." },
        { status: 400 }
      );
    }

    const finalText = buildFinalText(text);
    const finalSubject = buildSubject(jobTitle, safeHints);

    const profileImageUrl =
      "https://api.jobs-flow.com/andre-eichstaedt.png";
    const footerLogosUrl =
      "https://api.jobs-flow.com/footer-logos.png";

    const plainSignature = `

Andre Eichstädt
Anzeigenberater
Jobs in Berlin-Brandenburg
Tel. 0335/629797-38
a.eichstaedt@jobs-in-berlin-brandenburg.de

Leipziger Str. 56
15236 Frankfurt (Oder)
www.jobs-in-berlin-brandenburg.de

Falls Sie keine weiteren Informationen zu Stellenanzeigen-Schaltungen wünschen, genügt eine kurze Antwort mit "Nein danke".`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; font-size: 16px;">
        <div style="margin-bottom: 24px;">
          ${textToHtml(finalText)}
        </div>

        <div style="margin: 20px 0 18px 0;">
          <img src="${profileImageUrl}" style="width:160px; border-radius:80px;" />
        </div>

        <div>
          <div style="font-weight:700;">Andre Eichstädt</div>
          <div>Anzeigenberater</div>
          <div>Jobs in Berlin-Brandenburg</div>
          <div>Tel. 0335/629797-38</div>
          <div>a.eichstaedt@jobs-in-berlin-brandenburg.de</div>
        </div>

        <div style="margin-top:20px;">
          <img src="${footerLogosUrl}" style="width:600px; max-width:100%;" />
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: "Andre Eichstädt <mail@jobs-in-berlin-brandenburg.de>",
      to: actualRecipient,
      subject: finalSubject,
      html,
      text: `${finalText}${plainSignature}`,
      bcc: process.env.TEST_RECIPIENT_EMAIL || undefined,
    });

    return NextResponse.json({
      success: true,
      data,
      subject: finalSubject,
    });
  } catch (error: any) {
    console.error("RESEND ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.response ||
          "Fehler beim Mailversand.",
      },
      { status: 500 }
    );
  }
}