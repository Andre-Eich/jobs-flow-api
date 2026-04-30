import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isKnownJobsFlowEmailId } from "@/lib/jobsFlowMailScope";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = process.env.RESEND_CRM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const { id } = await context.params;

    if (!isKnownJobsFlowEmailId(id)) {
      return NextResponse.json(
        { error: "E-Mail gehoert nicht zur Jobs-Flow-Historie." },
        { status: 404 }
      );
    }

    const { data, error } = await resend.emails.get(id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Resend get error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data?.id || id,
      to: data?.to || [],
      from: data?.from || "",
      subject: data?.subject || "",
      createdAt: data?.created_at || "",
      html: data?.html || "",
      text: data?.text || "",
      lastEvent: data?.last_event || "",
      cc: data?.cc || [],
      bcc: data?.bcc || [],
      replyTo: data?.reply_to || [],
    });
  } catch (error: unknown) {
    console.error("CRM EMAIL DETAIL ERROR:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server Fehler" },
      { status: 500 }
    );
  }
}
