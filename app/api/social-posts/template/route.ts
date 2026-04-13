import { NextResponse } from "next/server";
import {
  getSocialPostTemplate,
  saveSocialPostTemplate,
  type SocialPostFormatId,
} from "@/lib/socialPostTemplateStore";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const formatId = searchParams.get("format") === "format-a" ? "format-a" : "format-a";
    return NextResponse.json({ template: getSocialPostTemplate(formatId) });
  } catch (error: unknown) {
    console.error("SOCIAL POST TEMPLATE GET ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Template konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const formatId: SocialPostFormatId = body?.formatId === "format-a" ? "format-a" : "format-a";

    const saved = saveSocialPostTemplate({
      formatId,
      name: safeString(body?.name) || "Format A",
      width: body?.width,
      height: body?.height,
      backgroundImage: safeString(body?.backgroundImage),
      elements: body?.elements,
    });

    return NextResponse.json({ template: saved });
  } catch (error: unknown) {
    console.error("SOCIAL POST TEMPLATE PUT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Template konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
