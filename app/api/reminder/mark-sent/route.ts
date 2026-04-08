import { NextResponse } from "next/server";
import { saveReminder } from "@/lib/reminderStore";

export async function POST(req: Request) {
  try {
    const { emailId } = await req.json();

    if (!emailId) {
      return NextResponse.json(
        { error: "emailId fehlt" },
        { status: 400 }
      );
    }

    saveReminder(emailId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Fehler beim Speichern" },
      { status: 500 }
    );
  }
}