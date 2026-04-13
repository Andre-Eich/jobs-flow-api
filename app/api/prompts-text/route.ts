import { NextResponse } from "next/server";
import { getPromptTextEntries, updatePromptTextEntry } from "@/lib/promptTextStore";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    return NextResponse.json({ entries: getPromptTextEntries() });
  } catch (error: unknown) {
    console.error("PROMPTS TEXT GET ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prompts & Texte konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const entryId = safeString(body?.id);

    if (!entryId) {
      return NextResponse.json({ error: "id ist erforderlich." }, { status: 400 });
    }

    const updated = updatePromptTextEntry(entryId, {
      area: body?.area,
      title: safeString(body?.title),
      description: safeString(body?.description),
      preview: safeString(body?.preview),
      content: safeString(body?.content),
      usage: safeString(body?.usage),
      placeholders: Array.isArray(body?.placeholders) ? body.placeholders : [],
      status: body?.status === "entwurf" ? "entwurf" : "aktiv",
    });

    if (!updated) {
      return NextResponse.json({ error: "Eintrag wurde nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ entry: updated });
  } catch (error: unknown) {
    console.error("PROMPTS TEXT PATCH ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Eintrag konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
