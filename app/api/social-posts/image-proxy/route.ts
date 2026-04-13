import { NextResponse } from "next/server";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = safeString(searchParams.get("url"));

    if (!rawUrl) {
      return NextResponse.json({ error: "url fehlt." }, { status: 400 });
    }

    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Nur http/https URLs sind erlaubt." }, { status: 400 });
    }

    const upstream = await fetch(parsed.toString(), {
      headers: { "User-Agent": "jobs-flow-api social-post-image-proxy" },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Bild konnte nicht geladen werden (${upstream.status}).` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("SOCIAL POST IMAGE PROXY ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bild konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}
