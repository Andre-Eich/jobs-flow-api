import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildCrmMetaHtmlComment, buildCrmMetaText } from "@/lib/crmMeta";
import { saveTextControllingEntry } from "@/lib/textControllingStore";
import { upsertLeadMail } from "@/lib/leadStore";
import { updateBulkPackageMailStatus } from "@/lib/bulkPackageStore";
import { buildFormalContactGreeting, sanitizeContactPerson } from "@/lib/contactPerson";
import { compactInlineMailAttachments, loadJobsInlineMailAssets } from "@/lib/mailInlineAssets";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textWithLinksToHtml(text: string) {
  return escapeHtml(text)
    .replace(
      /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_match, label: string, url: string) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0f172a; text-decoration:underline;">${label}</a>`
    )
    .replace(/\n/g, "<br/>");
}

function markdownLinksToPlainText(text: string) {
  return String(text || "").replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, label: string, url: string) => `${label}: ${url}`
  );
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
  return buildFormalContactGreeting(contactPerson);
}

function lowercaseFirstContentSentence(text: string) {
  return String(text || "").replace(
    /^(\s*)([A-ZÄÖÜ])/,
    (_match, whitespace: string, firstChar: string) =>
      `${whitespace}${firstChar.toLocaleLowerCase("de-DE")}`
  );
}

function ensureGreetingAndClosing(text: string, contactPerson: string) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return trimmed;

  const cleanBody = lowercaseFirstContentSentence(
    stripTrailingClosing(stripLeadingGreeting(trimmed))
  );
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
  let packageId = "";
  let packageMailId = "";

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
      packageMailId: rawPackageMailId = "",
      searchLocation = "",
      radiusKm = "",
    } = await req.json();
    packageId = String(batchId || "").trim();
    packageMailId = String(rawPackageMailId || "").trim();

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

    const safeContactPerson = sanitizeContactPerson(String(contactPerson || ""));
    const preparedText = ensureGreetingAndClosing(String(text || ""), String(contactPerson || ""));
    const preparedTextPlain = markdownLinksToPlainText(preparedText);
    const normalizedTextBlockTitles = Array.isArray(textBlockTitles) ? textBlockTitles : [];
    const { portrait, footer } = await loadJobsInlineMailAssets();
    const portraitImageUrl = portrait ? `cid:${portrait.contentId}` : buildAssetUrl(req, "/andre-eichstaedt.png");
    const footerLogosUrl = footer ? `cid:${footer.contentId}` : buildAssetUrl(req, "/footer-logos.png");

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
      contactPerson: safeContactPerson,
    };

    const crmMeta = {
      kind: "bulk" as const,
      company: String(company || "").trim(),
      contactPerson: safeContactPerson,
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
        <div style="margin-bottom: 24px;">${textWithLinksToHtml(preparedText)}</div>
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
      text: `${preparedTextPlain}\nAndre Eichstaedt\n\n${buildCrmMetaText(crmMeta)}\n[BULK_META:${JSON.stringify(bulkMeta)}]`,
      attachments: compactInlineMailAttachments([portrait, footer]),
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
      contactPerson: safeContactPerson,
      phone: String(phone || "").trim(),
      website: String(website || "").trim(),
      industry: String(industry || "").trim(),
      recipientEmail: actualRecipient,
      subject: String(subject || "").trim(),
      bodyText: preparedTextPlain,
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
      contactPerson: safeContactPerson,
      industry: String(industry || "").trim(),
      channel: "streumail",
      mail: {
        id: crypto.randomUUID(),
        emailId: String(emailId || ""),
        createdAt: new Date().toISOString(),
        subject: String(subject || "").trim(),
        bodyText: preparedTextPlain,
        textBlockTitles: normalizedTextBlockTitles,
        shortMode: Boolean(shortMode),
        testMode: Boolean(testMode),
        channel: "streumail",
        followUp: false,
        originalEmailId: "",
      },
    });

    if (packageId && packageMailId) {
      updateBulkPackageMailStatus({
        packageId,
        mailId: packageMailId,
        status: "sent",
        subject: String(subject || "").trim(),
      });
    }

    return NextResponse.json({ success: true, data: result, actualRecipient, emailId, testMode: isTestMode, batchId });
  } catch (error: unknown) {
    console.error("SEND BULK MAIL V3 ERROR:", error);

    if (packageId && packageMailId) {
      updateBulkPackageMailStatus({
        packageId,
        mailId: packageMailId,
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Bulk-Mail konnte nicht gesendet werden.",
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk-Mail konnte nicht gesendet werden." },
      { status: 500 }
    );
  }
}
