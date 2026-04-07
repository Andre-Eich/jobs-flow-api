import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

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

    await transporter.sendMail({
      from: `"Andre Eichstädt" <${process.env.SMTP_USER}>`,
      to,
      bcc: process.env.SMTP_USER,
      subject: subject || "Ihre Stellenanzeige auf jobs-in-berlin-brandenburg.de",
      text,
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