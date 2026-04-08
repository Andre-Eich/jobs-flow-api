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
    const mode = searchParams.get("mode") || "company";
    const domain = safeString(searchParams.get("domain")).toLowerCase();
    const company = safeString(searchParams.get("company"));
    const normalizedCompany = normalizeCompany(company);

    const result = await resend.emails.list({ limit: 100 });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Resend list error" },
        { status: 500 }
      );
    }

    const rawEmails = Array.isArray(result.data?.data) ? result.data.data : [];

    const emails = rawEmails.map((item: any) => {
      const toField = Array.isArray(item?.to) ? item.to[0] || "" : item?.to || "";
      const recipientEmail = safeString(toField);
      const subject = safeString(item?.subject) || "Ohne Betreff";
      const createdAt = safeString(item?.created_at) || new Date().toISOString();
      const lastEvent = safeString(item?.last_event).toLowerCase();

      let status: "sent" | "test" | "failed" | "draft" = "draft";

      if (lastEvent === "bounced" || lastEvent === "complained") {
        status = "failed";
      } else if (
        lastEvent === "delivered" ||
        lastEvent === "opened" ||
        lastEvent === "clicked"
      ) {
        status = "sent";
      } else if (lastEvent) {
        status = "test";
      }

      return {
        id: safeString(item?.id),
        subject,
        recipientEmail,
        recipientLabel: recipientEmail,
        company: "",
        normalizedCompany: "",
        domain: getDomain(recipientEmail),
        contactPerson: "",
        text: "",
        status,
        createdAt,
        lastEvent,
      };
    });

    const filtered =
      mode === "all"
        ? emails
        : emails.filter((mail) => {
            const sameDomain = domain && mail.domain === domain;
            const sameCompany =
              normalizedCompany &&
              mail.normalizedCompany &&
              mail.normalizedCompany === normalizedCompany;

            return sameDomain || sameCompany;
          });

    const sorted = filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const limited = sorted.slice(0, 25);

    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

    const reminders = limited
      .filter((mail) => {
        const mailTime = new Date(mail.createdAt).getTime();
        return mail.status === "sent" && mailTime <= threeDaysAgo;
      })
      .slice(0, 5)
      .map((mail) => ({
        ...mail,
        reminderLabel: "3 Tage nach 1. Mail",
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