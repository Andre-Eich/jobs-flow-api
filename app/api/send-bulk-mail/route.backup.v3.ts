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

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY fehlt." }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const { to, subject, text, testMode, sendCopy, company, contactPerson, hookText, textBlockTitles = [], shortMode = false, batchId = crypto.randomUUID() } = await req.json();

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

    const bulkMeta = {
      type: "bulk_package",
      batchId,
      company: String(company || "").trim(),
      textBlockTitles: Array.isArray(textBlockTitles) ? textBlockTitles : [],
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
      contactPerson: String(contactPerson || "").trim(),
    };

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; font-size: 16px;">
        <div style="margin-bottom: 24px;">${textToHtml(text)}</div>
        <div style="margin-top: 28px;">
          <div>Mit freundlichen Grüßen</div>
          <div style="margin-top: 14px; font-weight: 700;">Andre Eichstädt</div>
          <div>Anzeigenberater</div>
          <div>Jobs in Berlin-Brandenburg</div>
          <div>Tel. 0335/629797-38</div>
          <div><a href="mailto:a.eichstaedt@jobs-in-berlin-brandenburg.de" style="color:#111111; text-decoration:none;">a.eichstaedt@jobs-in-berlin-brandenburg.de</a></div>
          <div style="margin-top: 12px;">Leipziger Str. 56</div>
          <div>15236 Frankfurt (Oder)</div>
          <div><a href="https://www.jobs-in-berlin-brandenburg.de" target="_blank" style="color:#111111; text-decoration:none;">www.jobs-in-berlin-brandenburg.de</a></div>
        </div>
        <!-- BULK_META:${escapeHtml(JSON.stringify(bulkMeta))} -->
      </div>
    `;

    const result = await resend.emails.send({
      from: "Andre Eichstädt <a.eichstaedt@jobs-in-berlin-brandenburg.de>",
      replyTo: "a.eichstaedt@jobs-in-berlin-brandenburg.de",
      to: actualRecipient,
      subject,
      html,
      text: `${text}\n\n[BULK_META:${JSON.stringify(bulkMeta)}]`,
      bcc: isTestMode ? testRecipient || undefined : sendCopy ? "a.eichstaedt@jobs-in-berlin-brandenburg.de" : undefined,
    });

    const emailId = (result as any)?.data?.id || (result as any)?.id || "";

    saveTextControllingEntry({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      emailId: String(emailId || ""),
      jobTitle: "",
      company: String(company || "").trim(),
      recipientEmail: actualRecipient,
      subject: String(subject || "").trim(),
      hookBaseId: "bulk",
      hookBaseLabel: "Streumail",
      hookVariantId: "bulk_v3",
      hookText: String(hookText || "").trim(),
      followUp: false,
      opened: false,
      lastEvent: "",
      reminderSent: false,
    });

    return NextResponse.json({ success: true, data: result, actualRecipient, emailId, testMode: isTestMode, batchId });
  } catch (error: any) {
    console.error("SEND BULK MAIL V2 ERROR:", error);
    return NextResponse.json({ error: error?.message || "Bulk-Mail konnte nicht gesendet werden." }, { status: 500 });
  }
}
