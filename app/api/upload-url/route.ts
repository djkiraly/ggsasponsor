import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { generateSignedUploadUrl } from "@/lib/gcs";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp",
  "application/pdf",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const BodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(ALLOWED_MIME_TYPES, {
    message: "File type not allowed. Accepted: PNG, JPEG, GIF, SVG, WebP, PDF.",
  }),
  uploadType: z.enum(["logo", "banner"]),
  // Optional to keep both uploads under the same submission prefix.
  submissionId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const submissionId = body.submissionId ?? randomUUID();
    // Discard user-provided filename to prevent path traversal / special chars.
    // Use UUID + extension derived from the validated MIME type.
    const ext = MIME_TO_EXT[body.contentType] ?? "";
    const objectFilename = `${submissionId}-${randomUUID()}${ext}`;

    const folder = body.uploadType === "logo" ? "logos" : "banners";
    const { signedUrl, publicUrl } = await generateSignedUploadUrl(
      objectFilename,
      body.contentType,
      folder
    );

    return NextResponse.json({ signedUrl, publicUrl }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("Upload URL generation failed:", err);
    return NextResponse.json({ error: "Failed to generate upload URL", code: "UPLOAD_URL_FAILED" }, { status: 400 });
  }
}

