import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  buildHookStats,
  getTextControllingEntries,
  updateTextControllingEntry,
} from "@/lib/textControllingStore";
import { getReminders } from "@/lib/reminderStore";

function normalizeLastEvent(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function GET() {
  try {
    const apiKey = process.env.RESEND_CRM_API_KEY || process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_CRM_API_KEY oder RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const entries = getTextControllingEntries();
    const reminders = getReminders();

    const reminderMap = new Map(
      reminders.map((item) => [item.emailId, item.reminderSentAt])
    );

    const result = await resend.emails.list({ limit: 100 });

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Resend list error" },
        { status: 500 }
      );
    }

    const rawEmails = Array.isArray(result.data?.data) ? result.data.data : [];
    const resendMap = new Map<string, any>();

    for (const item of rawEmails) {
      const id = typeof item?.id === "string" ? item.id : "";
      if (id) {
        resendMap.set(id, item);
      }
    }

    for (const entry of entries) {
      if (!entry.emailId) continue;

      const resendItem = resendMap.get(entry.emailId);
      const lastEvent = normalizeLastEvent(resendItem?.last_event);
      const opened =
        lastEvent === "opened" || lastEvent === "clicked" || entry.opened;

      const reminderSent = Boolean(entry.emailId && reminderMap.has(entry.emailId));

      updateTextControllingEntry(entry.id, {
        opened,
        lastEvent,
        reminderSent,
      });
    }

    const refreshedEntries = getTextControllingEntries();
    const stats = buildHookStats(refreshedEntries);

    return NextResponse.json({
      hooks: stats,
      totalEntries: refreshedEntries.length,
    });
  } catch (error: any) {
    console.error("TEXT STATS ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Server Fehler" },
      { status: 500 }
    );
  }
}