import fs from "node:fs/promises";
import path from "node:path";

type InlineAttachment = {
  filename: string;
  content: string;
  contentType: string;
  contentId: string;
};

export type JobsInlineMailAttachment = InlineAttachment;

async function loadInlineAttachment(args: {
  filename: string;
  contentType: string;
  contentId: string;
}) {
  try {
    const filePath = path.join(process.cwd(), "public", args.filename);
    const content = await fs.readFile(filePath);
    return {
      filename: args.filename,
      content: content.toString("base64"),
      contentType: args.contentType,
      contentId: args.contentId,
    } satisfies InlineAttachment;
  } catch (error) {
    console.warn(`Inline-Mailasset konnte nicht geladen werden: ${args.filename}`, error);
    return null;
  }
}

export async function loadJobsInlineMailAssets() {
  const [portrait, footer] = await Promise.all([
    loadInlineAttachment({
      filename: "andre-eichstaedt.png",
      contentType: "image/png",
      contentId: "andre-eichstaedt-portrait",
    }),
    loadInlineAttachment({
      filename: "footer-logos.png",
      contentType: "image/png",
      contentId: "jobs-footer-logos",
    }),
  ]);

  return { portrait, footer };
}

export function compactInlineMailAttachments(
  attachments: Array<JobsInlineMailAttachment | null>
): JobsInlineMailAttachment[] {
  return attachments.filter((attachment): attachment is JobsInlineMailAttachment => Boolean(attachment));
}
