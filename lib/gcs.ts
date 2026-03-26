import { Storage } from "@google-cloud/storage";
import { getSettings } from "@/lib/settings";

type GcsConfig = {
  bucketName: string;
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

/**
 * Resolve GCS config from DB settings (preferred) with env var fallback.
 */
async function getGcsConfig(): Promise<GcsConfig | null> {
  let s: Record<string, string> = {};
  try {
    s = await getSettings();
  } catch {
    // DB not available — fall through to env vars only
  }

  const bucketName = s.gcs_bucket_name || process.env.GCS_BUCKET_NAME;
  const projectId = s.gcs_project_id || process.env.GCS_PROJECT_ID;
  const clientEmail = s.gcs_client_email || process.env.GCS_CLIENT_EMAIL;
  const privateKey = s.gcs_private_key || process.env.GCS_PRIVATE_KEY;

  if (!bucketName || !projectId || !clientEmail || !privateKey) return null;
  return { bucketName, projectId, clientEmail, privateKey };
}

async function requireStorage() {
  const config = await getGcsConfig();
  if (!config) {
    throw new Error("GCS not configured. Set GCS settings in admin panel or environment variables.");
  }

  const storage = new Storage({
    projectId: config.projectId,
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey.replace(/\\n/g, "\n"),
    },
  });

  return { storage, bucketName: config.bucketName };
}

export function getPublicUrl(objectName: string, bucketName: string) {
  return `https://storage.googleapis.com/${bucketName}/${encodeURI(objectName)}`;
}

export async function generateSignedUploadUrl(
  filename: string,
  contentType: string,
  folder: string
) {
  const { storage, bucketName } = await requireStorage();

  const objectName = `${folder}/${filename}`;
  const file = storage.bucket(bucketName).file(objectName);

  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  const [signedUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType,
  });

  const publicUrl = getPublicUrl(objectName, bucketName);
  return { signedUrl, publicUrl };
}
