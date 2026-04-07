import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(text: string) {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

export async function POST(req: Request) {
  try {
    const { to, subject, text } = await req.json();

    if (!to || !text) {
      return NextResponse.json(
        { error: "Fehlende Daten" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const profileImageUrl = "https://api.jobs-flow.com/andre-eichstaedt.png";
    const footerLogosUrl = "https://api.jobs-flow.com/footer-logos.png";

    const signatureText = `

Andre Eichstädt
Anzeigenberater
Jobs in Berlin-Brandenburg
Tel. 0335/629797-38
a.eichstaedt@jobs-in-berlin-brandenburg.de

Leipziger Str. 56
15236 Frankfurt (Oder)
www.jobs-in-berlin-brandenburg.de

Falls Sie keine weiteren Informationen zu Stellenanzeigen-Schaltungen wünschen, genügt eine kurze Antwort mit "Nein danke".`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111111; font-size: 16px;">
        <div style="margin-bottom: 24px;">
          ${textToHtml(text)}
        </div>

        <div style="margin: 20px 0 18px 0;">
          <img
            src="${profileImageUrl}"
            alt="Andre Eichstädt"
            style="display:block; width:160px; max-width:100%; height:auto; border-radius: 80px;"
          />
        </div>

        <div style="margin-bottom: 22px;">
          <div style="font-weight: 700;">Andre Eichstädt</div>
          <div>Anzeigenberater</div>
          <div>Jobs in Berlin-Brandenburg</div>
          <div>Tel. 0335/629797-38</div>
          <div>
            <a
              href="mailto:a.eichstaedt@jobs-in-berlin-brandenburg.de"
              style="color:#111111; text-decoration:none;"
            >
              a.eichstaedt@jobs-in-berlin-brandenburg.de
            </a>
          </div>

          <div style="height:12px;"></div>

          <div>Leipziger Str. 56</div>
          <div>15236 Frankfurt (Oder)</div>
          <div>
            <a
              href="https://www.jobs-in-berlin-brandenburg.de"
              target="_blank"
              style="color:#111111; text-decoration:none;"
            >
              www.jobs-in-berlin-brandenburg.de
            </a>
          </div>
        </div>

        <div style="margin: 20px 0 22px 0; font-size: 13px; color: #555555;">
          Falls Sie keine weiteren Informationen zu Stellenanzeigen-Schaltungen wünschen,
          genügt eine kurze Antwort mit „Nein danke“.
        </div>

        <div style="margin-top: 8px;">
          <img
            src="${footerLogosUrl}"
            alt="Kooperationen, Partnerschaften und Mitgliedschaften"
            style="display:block; width:600px; max-width:100%; height:auto;"
          />
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Andre Eichstädt" <${process.env.SMTP_USER}>`,
      to,
      bcc: process.env.SMTP_USER,
      subject:
        subject || "Ihre Stellenanzeige auf jobs-in-berlin-brandenburg.de",
      text: `${text}${signatureText}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SEND MAIL ERROR:", error);

    return NextResponse.json(
      { error: "Fehler beim Mailversand" },
      { status: 500 }
    );
  }
}