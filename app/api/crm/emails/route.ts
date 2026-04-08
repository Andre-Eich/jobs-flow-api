import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(req: Request) {
  try {
    const apiKey = process.env.RESEND_CRM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.list({
      limit: 25,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const emails =
      data?.data?.map((item: any) => ({
        id: item.id,
        subject: item.subject || "Ohne Betreff",
        to: Array.isArray(item.to) ? item.to[0] : item.to,
        createdAt: item.created_at,
        status: item.last_event || "unknown",
      })) || [];

    return NextResponse.json({ emails });
  } catch (err: any) {
    console.error("CRM ERROR:", err);

    return NextResponse.json(
      { error: err.message || "Serverfehler" },
      { status: 500 }
    );
  }
}