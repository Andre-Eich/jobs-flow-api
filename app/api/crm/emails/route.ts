import { NextResponse } from "next/server";
import { Resend } from "resend";

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

function extractJobTitle(subject: string) {
  const match = subject.match(/\[JOB:(.*?)\]/i);
  return match?.[1]?.trim() || "";
}

function extractOriginalEmailId(subject: string) {
  const match = subject.match(/\[REMINDER:(.*?)\]/i);
  return match?.[1]?.trim() || "";
}

function isReminderMail(subject: string) {
  return /\[REMINDER:.*?\]/i.test(subject);
}

function cleanSubject(subject: string) {
  return subject
    .replace(/\[REMINDER:.*?\]\s*/gi, "")
    .replace(/\[JOB:.*?\]\s*/gi, "")
    .trim();
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

    const reminderTargets = new Set<string>();

    for (const item of rawEmails) {
      const subject = safeString(item?.subject);
      const originalEmailId = extractOriginalEmailId(subject);

      if (originalEmailId) {
        reminderTargets.add(originalEmailId);
      }
    }

    const emails = rawEmails
      .map((item: any) => {
        const toValue = Array.isArray(item?.to) ? item.to[0] || "" : item?.to || "";
        const recipientEmail = safeString(toValue);
        const rawSubject = safeString(item?.subject) || "Ohne Betreff";
        const subject = cleanSubject(rawSubject) || "Ohne Betreff";
        const createdAt = safeString(item?.created_at) || new Date().toISOString();
        const lastEvent = safeString(item?.last_event);
        const jobTitle = extractJobTitle(rawSubject);
        const followUp = isReminderMail(rawSubject);
        const reminded = reminderTargets.has(safeString(item?.id));

        return {
          id: safeString(item?.id),
          subject,
          jobTitle,
          company: "",
          normalizedCompany: "",
          contactPerson: "",
          recipientEmail,
          recipientLabel: recipientEmail,
          domain: getDomain(recipientEmail),
          text: "",
          status: inferStatus(lastEvent),
          createdAt,
          lastEvent: lastEvent.toLowerCase(),
          reminded,
          followUp,
        };
      })
      .filter((mail) => !mail.followUp);

    const filtered =
      mode === "all"
        ? emails
        : emails.filter((mail) => {
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