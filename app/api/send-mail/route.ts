import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveTextControllingEntry } from "@/lib/textControllingStore";

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
      company,
      sendCopy,
      followUp,
      originalEmailId,
      hookBaseId,
      hookBaseLabel,
      hookVariantId,
      hookText,
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
        { error: "Kein Empfänger vorhanden." },
        { status: 400 }
      );
    }

    const hiddenMarker =
      followUp && originalEmailId ? `REMINDER:${originalEmailId}` : undefined;

    const finalText = buildFinalText(text, hiddenMarker);
    const finalSubject = buildSubject(jobTitle, followUp);

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; font-size: 16px;">
        <div style="margin-bottom: 24px;">
          ${textToHtml(finalText)}
        </div>

        <div style="margin-top: 28px;">
          <div style="font-weight: 700;">Andre Eichstädt</div>
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
        </div>
      </div>
    `;

    const result = await resend.emails.send({
      from: "Andre Eichstädt <a.eichstaedt@jobs-in-berlin-brandenburg.de>",
      replyTo: "a.eichstaedt@jobs-in-berlin-brandenburg.de",
      to: actualRecipient,
      subject: finalSubject,
      html,
      text: finalText,
      bcc: isTestMode
        ? testRecipient || undefined
        : sendCopy
        ? "a.eichstaedt@jobs-in-berlin-brandenburg.de"
        : undefined,
    });

    const emailId =
      (result as any)?.data?.id ||
      (result as any)?.id ||
      "";

    saveTextControllingEntry({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      emailId: String(emailId || ""),
      jobTitle: String(jobTitle || "").trim(),
      company: String(company || "").trim(),
      recipientEmail: actualRecipient,
      subject: finalSubject,
      hookBaseId: String(hookBaseId || "unknown"),
      hookBaseLabel: String(hookBaseLabel || "Unbekannt"),
      hookVariantId: String(hookVariantId || "unknown"),
      hookText: String(hookText || "").trim(),
      followUp: Boolean(followUp),
      opened: false,
      lastEvent: "",
      reminderSent: false,
    });

    return NextResponse.json({
      success: true,
      data: result,
      actualRecipient,
      subject: finalSubject,
      emailId,
    });
  } catch (error: any) {
    console.error("RESEND ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Fehler beim Mailversand." },
      { status: 500 }
    );
  }
}