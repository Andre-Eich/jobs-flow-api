import { NextResponse } from "next/server";
import { Resend } from "resend";
import { extractCrmMeta, type CrmMeta } from "@/lib/crmMeta";
import { getTextControllingEntries } from "@/lib/textControllingStore";
import { filterJobsFlowEmails, getKnownJobsFlowResendIds } from "@/lib/jobsFlowMailScope";

type RawEmailListItem = {
  id?: string;
  to?: string | string[];
  subject?: string;
  created_at?: string;
  last_event?: string;
};

function getDomain(email: string) {
  return email.split("@")[1]?.toLowerCase().trim() || "";
}

function normalizeCompany(company: string) {
  return company
    .toLowerCase()
    .replace(/\b(gmbh|mbh|ag|ug|kg|e\.v\.|ev)\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function inferStatus(lastEvent: string): "sent" | "test" | "failed" | "draft" {
  const normalized = lastEvent.toLowerCase();

  if (normalized === "bounced" || normalized === "complained") {
    return "failed";
  }

  if (
    normalized === "delivered" ||
    normalized === "opened" ||
    normalized === "clicked"
  ) {
    return "sent";
  }

  if (normalized) {
    return "test";
  }

  return "draft";
}

export async function GET(req: Request) {
  try {
    const apiKey = process.env.RESEND_CRM_API_KEY || process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_CRM_API_KEY oder RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const { searchParams } = new URL(req.url);
    const mode = safeString(searchParams.get("mode")) || "all";
    const domain = safeString(searchParams.get("domain")).toLowerCase();
    const company = safeString(searchParams.get("company"));
    const normalizedCompanyFilter = normalizeCompany(company);

    const result = await resend.emails.list({ limit: 100 });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Resend list error" },
        { status: 500 }
      );
    }

    const rawEmails: RawEmailListItem[] = Array.isArray(result.data?.data)
      ? (result.data.data as RawEmailListItem[])
      : [];
    const knownJobsFlowIds = getKnownJobsFlowResendIds();
    const scopedRawEmails = filterJobsFlowEmails(rawEmails);
    const entries = getTextControllingEntries();
    const entryByEmailId = new Map(
      entries
        .filter((entry) => entry.emailId && knownJobsFlowIds.has(String(entry.emailId)))
        .map((entry) => [String(entry.emailId), entry] as const)
    );

    const scopedRawById = new Map(
      scopedRawEmails
        .map((email) => [safeString(email.id), email] as const)
        .filter(([id]) => Boolean(id))
    );
    const localRawEmails: RawEmailListItem[] = entries
      .filter((entry) => entry.emailId && knownJobsFlowIds.has(String(entry.emailId)))
      .map((entry) => ({
        id: String(entry.emailId),
        to: entry.recipientEmail,
        subject: entry.subject,
        created_at: entry.createdAt,
        last_event: entry.lastEvent || "",
      }))
      .filter((email) => !scopedRawById.has(safeString(email.id)));

    const sortedRawEmails = [...scopedRawEmails, ...localRawEmails].sort(
      (a, b) =>
        new Date(safeString(b?.created_at)).getTime() -
        new Date(safeString(a?.created_at)).getTime()
    );

    const limitedRawEmails = sortedRawEmails.slice(0, 25);

    const detailedEmails = await Promise.all(
      limitedRawEmails.map(async (item) => {
        const id = safeString(item?.id);
        const toValue = Array.isArray(item?.to) ? item.to[0] || "" : item?.to || "";
        const recipientEmail = safeString(toValue);
        const subject = safeString(item?.subject) || "Ohne Betreff";
        const createdAt = safeString(item?.created_at) || new Date().toISOString();
        const lastEvent = safeString(item?.last_event);
        const entry = entryByEmailId.get(id);

        let meta: CrmMeta = {};

        try {
          const detail = await resend.emails.get(id);

          if (!detail.error && detail.data) {
            const fullText = [
              safeString(detail.data.text),
              safeString(detail.data.html),
            ]
              .filter(Boolean)
              .join("\n");

            meta = extractCrmMeta(fullText);
          }
        } catch (err) {
          console.error("CRM DETAIL ERROR", { id, err });
        }

        const effectiveJobTitle = safeString(meta.jobTitle) || safeString(entry?.jobTitle);
        const effectiveCompany = safeString(meta.company) || safeString(entry?.company);
        const effectiveContactPerson =
          safeString(meta.contactPerson) || safeString(entry?.contactPerson);
        const effectiveFollowUp =
          typeof meta.followUp === "boolean" ? meta.followUp : Boolean(entry?.followUp);
        const effectiveOriginalEmailId =
          safeString(meta.originalEmailId) || safeString(entry?.originalEmailId);
        const effectiveKind =
          meta.kind === "bulk" || entry?.kind === "bulk" ? "bulk" : "single";
        const effectivePhone = safeString(meta.phone) || safeString(entry?.phone);
        const effectiveBatchId = safeString(meta.batchId) || safeString(entry?.batchId);
        const effectiveSearchLocation =
          safeString(meta.searchLocation) || safeString(entry?.searchLocation);
        const effectiveRadiusKm = safeString(meta.radiusKm) || safeString(entry?.radiusKm);
        const effectiveTextBlockTitles = Array.isArray(meta.textBlockTitles) && meta.textBlockTitles.length > 0
          ? meta.textBlockTitles
          : Array.isArray(entry?.textBlockTitles)
          ? entry.textBlockTitles
          : [];
        const effectiveShortMode =
          typeof meta.shortMode === "boolean" ? meta.shortMode : Boolean(entry?.shortMode);
        const effectiveTestMode =
          typeof meta.testMode === "boolean" ? meta.testMode : Boolean(entry?.testMode);

        return {
          id,
          subject,
          jobTitle: effectiveJobTitle,
          company: effectiveCompany,
          normalizedCompany: normalizeCompany(effectiveCompany),
          contactPerson: effectiveContactPerson,
          recipientEmail,
          recipientLabel: recipientEmail,
          domain: getDomain(recipientEmail),
          text: "",
          status: inferStatus(lastEvent),
          createdAt,
          lastEvent: lastEvent.toLowerCase(),
          followUp: effectiveFollowUp,
          originalEmailId: effectiveOriginalEmailId,
          kind: effectiveKind,
          phone: effectivePhone,
          batchId: effectiveBatchId,
          searchLocation: effectiveSearchLocation,
          radiusKm: effectiveRadiusKm,
          textBlockTitles: effectiveTextBlockTitles,
          shortMode: effectiveShortMode,
          testMode: effectiveTestMode,
        };
      })
    );

    const reminderInfoByOriginalId = new Map<
      string,
      { reminderSentAt: string; reminderSubject: string }
    >();

    for (const mail of detailedEmails) {
      if (mail.followUp && mail.originalEmailId) {
        const existing = reminderInfoByOriginalId.get(mail.originalEmailId);

        if (
          !existing ||
          new Date(mail.createdAt).getTime() > new Date(existing.reminderSentAt).getTime()
        ) {
          reminderInfoByOriginalId.set(mail.originalEmailId, {
            reminderSentAt: mail.createdAt,
            reminderSubject: mail.subject,
          });
        }
      }
    }

    const baseEmails = detailedEmails
      .filter((mail) => !mail.followUp)
      .map((mail) => {
        const reminderInfo = reminderInfoByOriginalId.get(mail.id);

        return {
          ...mail,
          reminded: Boolean(reminderInfo),
          reminderSentAt: reminderInfo?.reminderSentAt || "",
          reminderSubject: reminderInfo?.reminderSubject || "",
        };
      });

    const filtered =
      mode === "all"
        ? baseEmails
        : baseEmails.filter((mail) => {
            const sameDomain = domain && mail.domain === domain;
            const sameCompany =
              normalizedCompanyFilter &&
              mail.normalizedCompany &&
              mail.normalizedCompany === normalizedCompanyFilter;

            return sameDomain || sameCompany;
          });

    const sorted = filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const limited = sorted.slice(0, 25);

    const reminderThreshold = Date.now() - 3 * 60 * 60 * 1000;

    const reminders = limited
      .filter((mail) => {
        const mailTime = new Date(mail.createdAt).getTime();

        return (
          mail.status === "sent" &&
          mailTime <= reminderThreshold &&
          !mail.reminded
        );
      })
      .slice(0, 8)
      .map((mail) => ({
        ...mail,
        reminderLabel: "3 Std. nach 1. Mail",
      }));

    return NextResponse.json({
      emails: limited,
      reminders,
    });
  } catch (error: unknown) {
    console.error("CRM EMAILS ERROR:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server Fehler" },
      { status: 500 }
    );
  }
}
