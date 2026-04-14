import { NextResponse } from "next/server";
import { archiveLeadById, restoreLeadById, updateLeadById } from "@/lib/leadStore";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Lead-ID fehlt." }, { status: 400 });
    }

    const body = await req.json();

    const lead = updateLeadById(id, {
      company: typeof body.company === "string" ? body.company : undefined,
      recipientEmail:
        typeof body.recipientEmail === "string" ? body.recipientEmail : undefined,
      contactPerson:
        typeof body.contactPerson === "string" ? body.contactPerson : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      analysisStars:
        typeof body.analysisStars === "number"
          ? (body.analysisStars as 0 | 1 | 2 | 3)
          : undefined,
      analysisSummary:
        typeof body.analysisSummary === "string" ? body.analysisSummary : undefined,
      foundJobTitles: Array.isArray(body.foundJobTitles)
        ? body.foundJobTitles.map((item: unknown) => String(item || ""))
        : undefined,
      foundCareerUrls: Array.isArray(body.foundCareerUrls)
        ? body.foundCareerUrls.map((item: unknown) => String(item || ""))
        : undefined,
      qualityStars:
        typeof body.qualityStars === "number"
          ? (body.qualityStars as 0 | 1 | 2 | 3)
          : undefined,
      qualitySummary:
        typeof body.qualitySummary === "string" ? body.qualitySummary : undefined,
      optOut:
        typeof body.optOut === "boolean" ? body.optOut : undefined,
      archived:
        typeof body.archived === "boolean" ? body.archived : undefined,
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ lead });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Speichern fehlgeschlagen.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Lead-ID fehlt." }, { status: 400 });
    }

    const lead = archiveLeadById(id);

    if (!lead) {
      return NextResponse.json({ error: "Lead nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ lead, archived: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Archivieren fehlgeschlagen." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json({ error: "Lead-ID fehlt." }, { status: 400 });
    }

    if (body?.action === "restore") {
      const lead = restoreLeadById(id);

      if (!lead) {
        return NextResponse.json({ error: "Lead nicht gefunden." }, { status: 404 });
      }

      return NextResponse.json({ lead, restored: true });
    }

    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Aktion fehlgeschlagen." },
      { status: 500 }
    );
  }
}
