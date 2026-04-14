import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildCrmMetaHtmlComment, buildCrmMetaText } from "@/lib/crmMeta";
import { getLeadById, syncLeadsFromTextControlling, upsertLeadMail } from "@/lib/leadStore";
import { saveTextControllingEntry } from "@/lib/textControllingStore";
import { sanitizeContactPerson } from "@/lib/contactPerson";
import { compactInlineMailAttachments, loadJobsInlineMailAssets } from "@/lib/mailInlineAssets";

type TextBlock = {
  id?: string;
  title?: string;
  text?: string;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCompany(company: string) {
  return company
    .toLowerCase()
    .replace(/\b(gmbh|mbh|ag|ug|kg|e\.v\.|ev|stadt|gemeinde)\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findLeadForReminder(args: {
  leadId: string;
  recipientEmail?: string;
  company?: string;
  city?: string;
}) {
  const byId = getLeadById(safeString(args.leadId));
  if (byId) return byId;

  const recipientEmail = safeString(args.recipientEmail).toLowerCase();
  const normalizedCompany = normalizeCompany(safeString(args.company));
  const city = safeString(args.city).toLowerCase();

  return syncLeadsFromTextControlling().find((lead) => {
    const sameEmail =
      recipientEmail && safeString(lead.recipientEmail).toLowerCase() === recipientEmail;
    const sameCompany =
      normalizedCompany &&
      normalizeCompany(lead.company) === normalizedCompany &&
      (!city || safeString(lead.city).toLowerCase() === city);

    return sameEmail || sameCompany;
  }) || null;
}

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

function buildAssetUrl(req: Request, assetPath: string) {
  return new URL(assetPath, req.url).toString();
}

function getEmailId(result: unknown) {
  if (!result || typeof result !== "object") return "";
  const topLevelId = "id" in result && typeof result.id === "string" ? result.id : "";
  const data = "data" in result && result.data && typeof result.data === "object" ? result.data : null;
  return data && "id" in data && typeof data.id === "string" ? data.id : topLevelId;
}

function buildReminderSubject(channel: "kaltakquise" | "streumail") {
  if (channel === "streumail") {
    return "Kurzes Follow-up zu regionaler Sichtbarkeit";
  }

  return "Kurzes Follow-up zu meiner letzten Nachricht";
}

function buildReminderText(args: {
  company: string;
  contactPerson: string;
  channel: "kaltakquise" | "streumail";
  shortMode: boolean;
  textBlocks: TextBlock[];
}) {
  const safeContactPerson = sanitizeContactPerson(args.contactPerson);
  const greeting = safeContactPerson ? `Guten Tag ${safeContactPerson},` : "Guten Tag,";
  const blocks = args.textBlocks
    .map((block) => safeString(block?.text))
    .filter(Boolean);

  const mainBody =
    args.channel === "streumail"
      ? args.shortMode
        ? "ich wollte mich noch einmal kurz melden, falls zusätzliche regionale Sichtbarkeit für offene Positionen aktuell interessant sein sollte."
        : "ich wollte mich noch einmal kurz melden, falls zusätzliche regionale Sichtbarkeit für offene Positionen für Sie aktuell interessant sein sollte. Gerade in Berlin und Brandenburg lässt sich damit die bestehende Reichweite oft sinnvoll ergänzen."
      : args.shortMode
      ? "ich wollte mich noch einmal kurz melden, falls das Thema zusätzliche Reichweite für Ihre Anzeige aktuell noch offen ist."
      : "ich wollte mich noch einmal kurz nachfassen, falls das Thema zusätzliche Reichweite für Ihre Stellenanzeige aktuell noch offen ist. Unser regionales Umfeld kann dabei oft eine sinnvolle Ergänzung zu bestehenden Kanälen sein.";

  const cta =
    args.channel === "streumail"
      ? "Wenn das für Sie interessant ist, sende ich Ihnen gern kurz weitere Infos."
      : "Wenn das für Sie interessant ist, melde ich mich gern mit einem kurzen Vorschlag.";

  return [greeting, "", mainBody, ...(blocks.length ? ["", ...blocks] : []), "", cta, "", "Mit freundlichen Grüßen"].join("\n");
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY fehlt." }, { status: 500 });
    }

    const {
      leadId,
      recipientEmail: lookupRecipientEmail = "",
      company = "",
      city = "",
      shortMode = false,
      testMode = true,
      textBlocks = [],
    } = await req.json();

    const lead = findLeadForReminder({
      leadId: safeString(leadId),
      recipientEmail: safeString(lookupRecipientEmail),
      company: safeString(company),
      city: safeString(city),
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead wurde nicht gefunden." }, { status: 404 });
    }

    const recipientEmail = Boolean(testMode)
      ? safeString(process.env.TEST_RECIPIENT_EMAIL)
      : safeString(lead.recipientEmail);

    if (!recipientEmail) {
      return NextResponse.json({ error: "Kein Empfaenger verfuegbar." }, { status: 400 });
    }

    const resend = new Resend(apiKey);
    const baseChannel =
      lead.channel === "streumail" || lead.channel === "mixed" ? "streumail" : "kaltakquise";
    const latestMail = lead.mails[0];
    const safeContactPerson = sanitizeContactPerson(lead.contactPerson);
    const subject = buildReminderSubject(baseChannel);
    const reminderText = buildReminderText({
      company: lead.company,
      contactPerson: safeContactPerson,
      channel: baseChannel,
      shortMode: Boolean(shortMode),
      textBlocks: Array.isArray(textBlocks) ? textBlocks : [],
    });
    const reminderTextPlain = markdownLinksToPlainText(reminderText);
    const { portrait, footer } = await loadJobsInlineMailAssets();
    const portraitImageUrl = portrait ? `cid:${portrait.contentId}` : buildAssetUrl(req, "/andre-eichstaedt.png");
    const footerLogosUrl = footer ? `cid:${footer.contentId}` : buildAssetUrl(req, "/footer-logos.png");
    const textBlockTitles = Array.isArray(textBlocks)
      ? textBlocks.map((block: TextBlock) => safeString(block?.title)).filter(Boolean)
      : [];

    const crmMeta =
      baseChannel === "streumail"
        ? {
            kind: "bulk" as const,
            company: lead.company,
            contactPerson: safeContactPerson,
            phone: lead.phone,
            batchId: `crm-reminder-${lead.id}`,
            searchLocation: lead.city,
            textBlockTitles,
            shortMode: Boolean(shortMode),
            testMode: Boolean(testMode),
          }
        : {
            kind: "single" as const,
            jobTitle: "",
            company: lead.company,
            contactPerson: safeContactPerson,
            phone: lead.phone,
            followUp: true,
            originalEmailId: safeString(latestMail?.id || latestMail?.emailId),
            textBlockTitles,
            shortMode: Boolean(shortMode),
            testMode: Boolean(testMode),
          };

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; font-size: 16px;">
        <div style="margin-bottom: 24px;">${textWithLinksToHtml(reminderText)}</div>
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
      </div>
    `;

    const result = await resend.emails.send({
      from: "Andre Eichstaedt <a.eichstaedt@jobs-in-berlin-brandenburg.de>",
      replyTo: "a.eichstaedt@jobs-in-berlin-brandenburg.de",
      to: recipientEmail,
      subject,
      html,
      text: `${reminderTextPlain}\n\n${buildCrmMetaText(crmMeta)}`,
      attachments: compactInlineMailAttachments([portrait, footer]),
      bcc: Boolean(testMode) ? recipientEmail || undefined : "a.eichstaedt@jobs-in-berlin-brandenburg.de",
    });

    const emailId = getEmailId(result);
    const createdAt = new Date().toISOString();
    const channel = baseChannel === "streumail" ? "streumail" : "kaltakquise";

    saveTextControllingEntry({
      id: crypto.randomUUID(),
      createdAt,
      emailId,
      jobTitle: "",
      company: lead.company,
      postalCode: lead.postalCode,
      city: lead.city,
      contactPerson: safeContactPerson,
      phone: lead.phone,
      website: lead.website,
      industry: lead.industry,
      recipientEmail,
      subject,
      bodyText: reminderTextPlain,
      hookBaseId: "crm_reminder",
      hookBaseLabel: "CRM Erinnerung",
      hookVariantId: Boolean(shortMode) ? "crm_reminder_short" : "crm_reminder_default",
      hookText: reminderText,
      followUp: true,
      originalEmailId: safeString(latestMail?.id || latestMail?.emailId),
      batchId: channel === "streumail" ? `crm-reminder-${lead.id}` : "",
      kind: channel === "streumail" ? "bulk" : "single",
      searchLocation: lead.city,
      textBlockTitles,
      shortMode: Boolean(shortMode),
      testMode: Boolean(testMode),
      opened: false,
      lastEvent: "",
      reminderSent: true,
    });

    upsertLeadMail({
      company: lead.company,
      postalCode: lead.postalCode,
      city: lead.city,
      recipientEmail: lead.recipientEmail,
      phone: lead.phone,
      website: lead.website,
      contactPerson: safeContactPerson,
      industry: lead.industry,
      channel,
      mail: {
        id: crypto.randomUUID(),
        emailId,
        createdAt,
        subject,
        bodyText: reminderTextPlain,
        textBlockTitles,
        shortMode: Boolean(shortMode),
        testMode: Boolean(testMode),
        channel,
        followUp: true,
        originalEmailId: safeString(latestMail?.id || latestMail?.emailId),
      },
    });

    return NextResponse.json({ success: true, emailId, subject });
  } catch (error: unknown) {
    console.error("CRM SEND REMINDER ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erinnerung konnte nicht gesendet werden." },
      { status: 500 }
    );
  }
}
