import { NextResponse } from "next/server";
import { updateLeadById } from "@/lib/leadStore";

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
