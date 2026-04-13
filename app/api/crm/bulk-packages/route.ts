import { NextResponse } from "next/server";
import {
  createBulkPackage,
  getBulkPackages,
  updateBulkPackageMailStatus,
} from "@/lib/bulkPackageStore";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    return NextResponse.json({ packages: getBulkPackages() });
  } catch (error: unknown) {
    console.error("CRM BULK PACKAGES GET ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk-Pakete konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packageId = safeString(body?.id) || crypto.randomUUID();
    const mails = Array.isArray(body?.mails) ? body.mails : [];

    if (mails.length === 0) {
      return NextResponse.json({ error: "Mindestens ein Paket-Eintrag ist erforderlich." }, { status: 400 });
    }

    const created = createBulkPackage({
      id: packageId,
      createdAt: safeString(body?.createdAt) || new Date().toISOString(),
      searchLocation: safeString(body?.searchLocation),
      radiusKm: safeString(body?.radiusKm),
      textBlockTitles: Array.isArray(body?.textBlockTitles) ? body.textBlockTitles : [],
      shortMode: Boolean(body?.shortMode),
      testMode: Boolean(body?.testMode),
      mails,
    });

    return NextResponse.json({ package: created });
  } catch (error: unknown) {
    console.error("CRM BULK PACKAGES POST ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk-Paket konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const packageId = safeString(body?.packageId);
    const mailId = safeString(body?.mailId);

    if (!packageId || !mailId) {
      return NextResponse.json({ error: "packageId und mailId sind erforderlich." }, { status: 400 });
    }

    const updated = updateBulkPackageMailStatus({
      packageId,
      mailId,
      status:
        body?.status === "sending" || body?.status === "sent" || body?.status === "failed"
          ? body.status
          : "planned",
      errorMessage: safeString(body?.errorMessage),
      subject: safeString(body?.subject),
    });

    if (!updated) {
      return NextResponse.json({ error: "Bulk-Paket oder Paket-Eintrag nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ package: updated });
  } catch (error: unknown) {
    console.error("CRM BULK PACKAGES PATCH ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk-Paket konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }
}
