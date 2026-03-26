import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

import { getAdminServerSession } from "@/auth";
import { jsonError } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export async function POST() {
  try {
    const session = await getAdminServerSession();
    if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

    const s = await getSettings();
    const bucketName = s.gcs_bucket_name || process.env.GCS_BUCKET_NAME;
    const projectId = s.gcs_project_id || process.env.GCS_PROJECT_ID;
    const clientEmail = s.gcs_client_email || process.env.GCS_CLIENT_EMAIL;
    const privateKey = s.gcs_private_key || process.env.GCS_PRIVATE_KEY;

    if (!bucketName || !projectId || !clientEmail || !privateKey) {
      return NextResponse.json({
        success: false,
        error: "GCS configuration is incomplete. Please fill in all fields.",
      });
    }

    const storage = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, "\n"),
      },
    });

    const [exists] = await storage.bucket(bucketName).exists();
    if (!exists) {
      return NextResponse.json({
        success: false,
        error: `Bucket "${bucketName}" does not exist or is not accessible.`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message });
  }
}
