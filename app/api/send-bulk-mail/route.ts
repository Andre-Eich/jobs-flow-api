import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildCrmMetaHtmlComment, buildCrmMetaText } from "@/lib/crmMeta";
import { saveTextControllingEntry } from "@/lib/textControllingStore";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

function ensureGreetingAndClosing(text: string) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return trimmed;

  const hasGreeting = /^(guten tag|sehr geehrte|sehr geehrter)/i.test(trimmed);
  const hasClosing = /mit freundlichen gruessen/i.test(trimmed);

  let result = trimmed;
  if (!hasGreeting) {
    result = `Guten Tag,\n\n${result}`;
  }
  if (!hasClosing) {
    result = `${result}\n\nMit freundlichen Gruessen`;
  }
  return result;
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
      return NextResponse.json({ error: "RESEND_API_KEY fehlt." }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const {
      to,
      subject,
      text,
      testMode,
      sendCopy,
      company,
      contactPerson,
      hookText,
      textBlockTitles = [],
      shortMode = false,
      batchId = crypto.randomUUID(),
    } = await req.json();

    const testRecipient = String(process.env.TEST_RECIPIENT_EMAIL || "").trim();
    const isTestMode = Boolean(testMode);
    let actualRecipient = String(to || "").trim();

    if (isTestMode) {
      if (!testRecipient) {
        return NextResponse.json({ error: "TEST_RECIPIENT_EMAIL fehlt." }, { status: 500 });
      }
      actualRecipient = testRecipient;
    }

    if (!actualRecipient || !text || !subject) {
      return NextResponse.json({ error: "Fehlende Daten." }, { status: 400 });
    }

    const preparedText = ensureGreetingAndClosing(String(text || ""));
    const normalizedTextBlockTitles = Array.isArray(textBlockTitles) ? textBlockTitles : [];

    const bulkMeta = {
      type: "bulk_package",
      batchId,
      company: String(company || "").trim(),
      textBlockTitles: normalizedTextBlockTitles,
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
      contactPerson: String(contactPerson || "").trim(),
    };

    const crmMeta = {
      kind: "bulk" as const,
      company: String(company || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      batchId: String(batchId || "").trim(),
      textBlockTitles: normalizedTextBlockTitles,
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
    };

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; font-size: 16px;">
        <div style="margin-bottom: 24px;">${textToHtml(preparedText)}</div>
        <div style="margin-top: 18px; font-weight: 700;">Andre Eichstaedt</div>
        <div>Anzeigenberater</div>
        <div>Jobs in Berlin-Brandenburg</div>
        <div>Tel. 0335/629797-38</div>
        <div><a href="mailto:a.eichstaedt@jobs-in-berlin-brandenburg.de" style="color:#111111; text-decoration:none;">a.eichstaedt@jobs-in-berlin-brandenburg.de</a></div>
        <div style="margin-top: 12px;">Leipziger Str. 56</div>
        <div>15236 Frankfurt (Oder)</div>
        <div><a href="https://www.jobs-in-berlin-brandenburg.de" target="_blank" style="color:#111111; text-decoration:none;">www.jobs-in-berlin-brandenburg.de</a></div>
        ${buildCrmMetaHtmlComment(crmMeta)}
        <!-- BULK_META:${escapeHtml(JSON.stringify(bulkMeta))} -->
      </div>
    `;

    const result = await resend.emails.send({
      from: "Andre Eichstaedt <a.eichstaedt@jobs-in-berlin-brandenburg.de>",
      replyTo: "a.eichstaedt@jobs-in-berlin-brandenburg.de",
      to: actualRecipient,
      subject,
      html,
      text: `${preparedText}\nAndre Eichstaedt\n\n${buildCrmMetaText(crmMeta)}\n[BULK_META:${JSON.stringify(bulkMeta)}]`,
      bcc: isTestMode ? testRecipient || undefined : sendCopy ? "a.eichstaedt@jobs-in-berlin-brandenburg.de" : undefined,
    });

    const emailId = getEmailId(result);

    saveTextControllingEntry({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      emailId: String(emailId || ""),
      jobTitle: "",
      company: String(company || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      recipientEmail: actualRecipient,
      subject: String(subject || "").trim(),
      hookBaseId: "bulk",
      hookBaseLabel: "Streumail",
      hookVariantId: "bulk_v4",
      hookText: String(hookText || "").trim(),
      followUp: false,
      batchId: String(batchId || "").trim(),
      kind: "bulk",
      textBlockTitles: normalizedTextBlockTitles,
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
      opened: false,
      lastEvent: "",
      reminderSent: false,
    });

    return NextResponse.json({ success: true, data: result, actualRecipient, emailId, testMode: isTestMode, batchId });
  } catch (error: unknown) {
    console.error("SEND BULK MAIL V3 ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk-Mail konnte nicht gesendet werden." },
      { status: 500 }
    );
  }
}
