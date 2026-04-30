import { NextResponse } from "next/server";
import { getLeads, upsertLead } from "@/lib/leadStore";

type CrmLeadUpsertPayload = {
  company?: string;
  postalCode?: string;
  city?: string;
  recipientEmail?: string;
  phone?: string;
  website?: string;
  contactPerson?: string;
  industry?: string;
  analysisStars?: 0 | 1 | 2 | 3;
  analysisSummary?: string;
  foundJobTitles?: string[];
  foundCareerUrls?: string[];
  qualityStars?: 0 | 1 | 2 | 3;
  qualitySummary?: string;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const leads = getLeads().sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );

    return NextResponse.json({
      leads: leads.filter((lead) => !lead.archived),
      archivedLeads: leads.filter((lead) => lead.archived),
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
          analysisStars:
            typeof lead?.analysisStars === "number"
              ? (lead.analysisStars as 0 | 1 | 2 | 3)
              : undefined,
          analysisSummary: safeString(lead?.analysisSummary),
          foundJobTitles: Array.isArray(lead?.foundJobTitles)
            ? lead.foundJobTitles.map((item) => safeString(item)).filter(Boolean)
            : undefined,
          foundCareerUrls: Array.isArray(lead?.foundCareerUrls)
            ? lead.foundCareerUrls.map((item) => safeString(item)).filter(Boolean)
            : undefined,
          qualityStars:
            typeof lead?.qualityStars === "number"
              ? (lead.qualityStars as 0 | 1 | 2 | 3)
              : undefined,
          qualitySummary: safeString(lead?.qualitySummary),
          channel: "streumail",
        })
      )
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      count: stored.length,
      leads: getLeads().sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
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
