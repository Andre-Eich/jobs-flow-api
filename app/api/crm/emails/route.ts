import { NextResponse } from "next/server";
import { Resend } from "resend";

type CrmMeta = {
  jobTitle?: string;
  company?: string;
  contactPerson?: string;
  followUp?: boolean;
  originalEmailId?: string;
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

function extractCrmMeta(text: string): CrmMeta {
  if (!text) return {};

  const plainTextMatch = text.match(/\[CRM_META\]\s*(\{[\s\S]*\})/);
  if (plainTextMatch?.[1]) {
    try {
      return JSON.parse(plainTextMatch[1]);
    } catch {
      // ignore
    }
  }

  const htmlCommentMatch = text.match(/CRM_META\s+(\{[\s\S]*?\})/);
  if (htmlCommentMatch?.[1]) {
    try {
      return JSON.parse(htmlCommentMatch[1]);
    } catch {
      // ignore
    }
  }

  return {};
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

    const rawEmails = Array.isArray(result.data?.data) ? result.data.data : [];

    const sortedRawEmails = rawEmails.sort(
      (a: any, b: any) =>
        new Date(safeString(b?.created_at)).getTime() -
        new Date(safeString(a?.created_at)).getTime()
    );

    const limitedRawEmails = sortedRawEmails.slice(0, 25);

    const detailedEmails = await Promise.all(
      limitedRawEmails.map(async (item: any) => {
        const id = safeString(item?.id);
        const toValue = Array.isArray(item?.to) ? item.to[0] || "" : item?.to || "";
        const recipientEmail = safeString(toValue);
        const subject = safeString(item?.subject) || "Ohne Betreff";
        const createdAt = safeString(item?.created_at) || new Date().toISOString();
        const lastEvent = safeString(item?.last_event);

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

        return {
          id,
          subject,
          jobTitle: safeString(meta.jobTitle),
          company: safeString(meta.company),
          normalizedCompany: normalizeCompany(safeString(meta.company)),
          contactPerson: safeString(meta.contactPerson),
          recipientEmail,
          recipientLabel: recipientEmail,
          domain: getDomain(recipientEmail),
          text: "",
          status: inferStatus(lastEvent),
          createdAt,
          lastEvent: lastEvent.toLowerCase(),
          followUp: !!meta.followUp,
          originalEmailId: safeString(meta.originalEmailId),
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
  } catch (error: any) {
    console.error("CRM EMAILS ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Server Fehler" },
      { status: 500 }
    );
  }
}