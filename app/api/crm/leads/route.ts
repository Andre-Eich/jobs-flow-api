import { NextResponse } from "next/server";
import { syncLeadsFromTextControlling } from "@/lib/leadStore";

export async function GET() {
  try {
    const leads = syncLeadsFromTextControlling().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ leads });
  } catch (error: unknown) {
    console.error("CRM LEADS ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CRM-Leads konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
