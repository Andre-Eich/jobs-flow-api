import { NextResponse } from "next/server";
import { Resend } from "resend";
import { extractCrmMeta } from "@/lib/crmMeta";
import { getTextControllingEntries } from "@/lib/textControllingStore";
import { syncLeadsFromTextControlling, upsertLead, upsertLeadMail } from "@/lib/leadStore";

type RawEmailListItem = {
  id?: string;
  to?: string | string[];
  subject?: string;
  created_at?: string;
  last_event?: string;
};

type CrmLeadUpsertPayload = {
  company?: string;
  postalCode?: string;
  city?: string;
  recipientEmail?: string;
  phone?: string;
  website?: string;
  contactPerson?: string;
  industry?: string;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stripStoredMarkers(text: string) {
  return String(text || "")
    .replace(/\n?\[CRM_META\]\s*\{[\s\S]*?\}\s*/g, "")
    .replace(/\n?\[BULK_META:\{[\s\S]*?\}\]\s*/g, "")
    .trim();
}

function normalizeLastEvent(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function backfillRecentLeadsFromResend() {
  const apiKey = process.env.RESEND_CRM_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  let result;
  try {
    result = await resend.emails.list({ limit: 100 });
  } catch {
    return;
  }
  if (result.error) return;

  const rawEmails: RawEmailListItem[] = Array.isArray(result.data?.data)
    ? (result.data.data as RawEmailListItem[])
    : [];
  const entryByEmailId = new Map(
    getTextControllingEntries()
      .filter((entry) => entry.emailId)
      .map((entry) => [String(entry.emailId), entry] as const)
  );

  for (const item of rawEmails) {
    const id = safeString(item?.id);
    if (!id) continue;

    try {
      const detail = await resend.emails.get(id);
      if (detail.error || !detail.data) continue;

      const fullText = [safeString(detail.data.text), safeString(detail.data.html)]
        .filter(Boolean)
        .join("\n");
      const meta = extractCrmMeta(fullText);
      const entry = entryByEmailId.get(id);
      const followUp =
        typeof meta.followUp === "boolean" ? meta.followUp : Boolean(entry?.followUp);

      if (followUp) continue;

      const toValue = Array.isArray(item?.to) ? item.to[0] || "" : item?.to || "";
      const recipientEmail = safeString(toValue);
      const company = safeString(meta.company) || safeString(entry?.company);

      if (!company && !recipientEmail) continue;

      upsertLeadMail({
        company,
        postalCode: safeString(entry?.postalCode),
        city: safeString(entry?.city) || safeString(entry?.searchLocation) || safeString(meta.searchLocation),
        recipientEmail,
        phone: safeString(meta.phone) || safeString(entry?.phone),
        website: safeString(entry?.website),
        contactPerson: safeString(meta.contactPerson) || safeString(entry?.contactPerson),
        industry: safeString(entry?.industry),
        channel: meta.kind === "bulk" || entry?.kind === "bulk" ? "streumail" : "kaltakquise",
        mail: {
          id: safeString(entry?.id) || crypto.randomUUID(),
          emailId: id,
          createdAt: safeString(item?.created_at) || new Date().toISOString(),
          subject: safeString(item?.subject),
          bodyText: stripStoredMarkers(safeString(detail.data.text) || safeString(entry?.bodyText)),
          textBlockTitles: Array.isArray(meta.textBlockTitles) && meta.textBlockTitles.length > 0
            ? meta.textBlockTitles
            : Array.isArray(entry?.textBlockTitles)
            ? entry.textBlockTitles
            : [],
          shortMode:
            typeof meta.shortMode === "boolean" ? meta.shortMode : Boolean(entry?.shortMode),
          testMode:
            typeof meta.testMode === "boolean" ? meta.testMode : Boolean(entry?.testMode),
          channel: meta.kind === "bulk" || entry?.kind === "bulk" ? "streumail" : "kaltakquise",
          followUp: false,
          originalEmailId: "",
        },
      });
    } catch (error) {
      console.error("CRM LEADS BACKFILL DETAIL ERROR:", { id, error });
    }
  }
}

export async function GET() {
  try {
    try {
      await backfillRecentLeadsFromResend();
    } catch (backfillError) {
      console.error("CRM LEADS BACKFILL ERROR:", backfillError);
    }

    const apiKey = process.env.RESEND_CRM_API_KEY || process.env.RESEND_API_KEY;
    const leads = syncLeadsFromTextControlling().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    if (!apiKey) {
      return NextResponse.json({
        leads: leads.map((lead) => ({
          ...lead,
          openedCount: 0,
          sentCount: lead.mails.length,
          openRate: 0,
        })),
      });
    }

    const resend = new Resend(apiKey);
    let result;
    try {
      result = await resend.emails.list({ limit: 100 });
    } catch {
      result = { data: null, error: null };
    }
    const rawEmails: RawEmailListItem[] = Array.isArray(result.data?.data)
      ? (result.data.data as RawEmailListItem[])
      : [];
    const lastEventByEmailId = new Map(
      rawEmails.map((item) => [safeString(item.id), normalizeLastEvent(item.last_event)])
    );
    const entryByEmailId = new Map(
      getTextControllingEntries()
        .filter((entry) => entry.emailId)
        .map((entry) => [safeString(entry.emailId), entry] as const)
    );

    return NextResponse.json({
      leads: leads.map((lead) => {
        const sentCount = lead.mails.length;
        const openedCount = lead.mails.filter((mail) => {
          const lastEvent = lastEventByEmailId.get(safeString(mail.emailId));
          const entry = entryByEmailId.get(safeString(mail.emailId));
          return lastEvent === "opened" || lastEvent === "clicked" || Boolean(entry?.opened);
        }).length;

        return {
          ...lead,
          openedCount,
          sentCount,
          openRate: sentCount ? openedCount / sentCount : 0,
        };
      }),
    });
  } catch (error: unknown) {
    console.error("CRM LEADS ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CRM-Leads konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leads: CrmLeadUpsertPayload[] = Array.isArray(body?.leads) ? body.leads : [];

    if (leads.length === 0) {
      return NextResponse.json({ error: "Mindestens ein Lead ist erforderlich." }, { status: 400 });
    }

    const stored = leads
      .map((lead) =>
        upsertLead({
          company: safeString(lead?.company),
          postalCode: safeString(lead?.postalCode),
          city: safeString(lead?.city),
          recipientEmail: safeString(lead?.recipientEmail),
          phone: safeString(lead?.phone),
          website: safeString(lead?.website),
          contactPerson: safeString(lead?.contactPerson),
          industry: safeString(lead?.industry),
          channel: "streumail",
        })
      )
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      count: stored.length,
      leads: syncLeadsFromTextControlling().sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    });
  } catch (error: unknown) {
    console.error("CRM LEADS POST ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CRM-Leads konnten nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
