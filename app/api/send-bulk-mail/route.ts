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

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

function stripLeadingGreeting(text: string) {
  return text
    .replace(
      /^(guten tag(?:\s+[^\n,]+)?|hallo(?:\s+[^\n,]+)?|sehr geehrte(?:r)?\s+[^\n,]+),\s*/i,
      ""
    )
    .trim();
}

function stripTrailingClosing(text: string) {
  return text.replace(/\n*\s*mit freundlichen gr(?:u|\u00fc)(?:ss|\u00df)en\s*$/i, "").trim();
}

function buildGreeting(contactPerson: string) {
  const safeContactPerson = String(contactPerson || "").trim();
  return safeContactPerson ? `Guten Tag ${safeContactPerson},` : "Guten Tag,";
}

function ensureGreetingAndClosing(text: string, contactPerson: string) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return trimmed;

  const cleanBody = stripTrailingClosing(stripLeadingGreeting(trimmed));
  return `${buildGreeting(contactPerson)}\n\n${cleanBody}\n\nMit freundlichen Grüßen`;
}

function buildAssetUrl(req: Request, assetPath: string) {
  return new URL(assetPath, req.url).toString();
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
      phone,
      website,
      city = "",
      industry = "",
      hookText,
      textBlockTitles = [],
      shortMode = false,
      batchId = crypto.randomUUID(),
      searchLocation = "",
      radiusKm = "",
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

    const preparedText = ensureGreetingAndClosing(String(text || ""), String(contactPerson || ""));
    const normalizedTextBlockTitles = Array.isArray(textBlockTitles) ? textBlockTitles : [];
    const portraitImageUrl = buildAssetUrl(req, "/andre-eichstaedt.png");
    const footerLogosUrl = buildAssetUrl(req, "/footer-logos.png");

    const bulkMeta = {
      type: "bulk_package",
      batchId,
      company: String(company || "").trim(),
      phone: String(phone || "").trim(),
      searchLocation: String(searchLocation || "").trim(),
      radiusKm: String(radiusKm || "").trim(),
      textBlockTitles: normalizedTextBlockTitles,
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
      contactPerson: String(contactPerson || "").trim(),
    };

    const crmMeta = {
      kind: "bulk" as const,
      company: String(company || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      phone: String(phone || "").trim(),
      batchId: String(batchId || "").trim(),
      searchLocation: String(searchLocation || "").trim(),
      radiusKm: String(radiusKm || "").trim(),
      textBlockTitles: normalizedTextBlockTitles,
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
    };

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; font-size: 16px;">
        <div style="margin-bottom: 24px;">${textToHtml(preparedText)}</div>
        <div style="margin: 20px 0 18px;">
          <img src="${portraitImageUrl}" alt="Andre Eichstaedt" style="display:block; max-width: 220px; width: 100%; height: auto; border: 0;" />
        </div>
        <div style="margin-top: 18px; font-weight: 700;">Andre Eichstaedt</div>
        <div>Anzeigenberater</div>
        <div>Jobs in Berlin-Brandenburg</div>
        <div>Tel. 0335/629797-38</div>
        <div><a href="mailto:a.eichstaedt@jobs-in-berlin-brandenburg.de" style="color:#111111; text-decoration:none;">a.eichstaedt@jobs-in-berlin-brandenburg.de</a></div>
        <div style="margin-top: 12px;">Leipziger Str. 56</div>
        <div>15236 Frankfurt (Oder)</div>
        <div><a href="https://www.jobs-in-berlin-brandenburg.de" target="_blank" style="color:#111111; text-decoration:none;">www.jobs-in-berlin-brandenburg.de</a></div>
        <div style="margin: 18px 0 0;">
          <img src="${footerLogosUrl}" alt="Jobs in Berlin-Brandenburg Logos" style="display:block; max-width: 320px; width: 100%; height: auto; border: 0;" />
        </div>
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
      city: String(city || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      phone: String(phone || "").trim(),
      website: String(website || "").trim(),
      industry: String(industry || "").trim(),
      recipientEmail: actualRecipient,
      subject: String(subject || "").trim(),
      bodyText: preparedText,
      hookBaseId: "bulk",
      hookBaseLabel: "Streumail",
      hookVariantId: "bulk_v4",
      hookText: String(hookText || "").trim(),
      followUp: false,
      batchId: String(batchId || "").trim(),
      kind: "bulk",
      searchLocation: String(searchLocation || "").trim(),
      radiusKm: String(radiusKm || "").trim(),
      textBlockTitles: normalizedTextBlockTitles,
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
      opened: false,
      lastEvent: "",
      reminderSent: false,
    });

    upsertLeadMail({
      company: String(company || "").trim(),
      postalCode: "",
      city: String(city || searchLocation || "").trim(),
      recipientEmail: String(to || "").trim() || actualRecipient,
      phone: String(phone || "").trim(),
      website: String(website || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      industry: String(industry || "").trim(),
      channel: "streumail",
      mail: {
        id: crypto.randomUUID(),
        emailId: String(emailId || ""),
        createdAt: new Date().toISOString(),
        subject: String(subject || "").trim(),
        bodyText: preparedText,
        textBlockTitles: normalizedTextBlockTitles,
        shortMode: Boolean(shortMode),
        testMode: Boolean(testMode),
        channel: "streumail",
        followUp: false,
        originalEmailId: "",
      },
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
