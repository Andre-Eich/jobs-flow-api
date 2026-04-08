import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const { id } = await context.params;

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
  } catch (error: any) {
    console.error("CRM EMAIL DETAIL ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Server Fehler" },
      { status: 500 }
    );
  }
}