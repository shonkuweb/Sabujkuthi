import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const clean = val => (val || '').replace(/^["']|["']$/g, '').trim();

export function getR2Config() {
  const accountId = clean(process.env.R2_ACCOUNT_ID);
  const accessKeyId = clean(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = clean(process.env.R2_SECRET_ACCESS_KEY);
  const bucket = clean(process.env.R2_BUCKET_NAME) || 'chf-media';
  const publicUrl = clean(process.env.R2_PUBLIC_URL) || 'https://pub-ce8688bc6c654bcfb99716f7c9373bcd.r2.dev';

  const isConfigured = Boolean(accountId && accessKeyId && secretAccessKey);
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl: publicUrl.replace(/\/$/, ''), isConfigured };
}

let s3ClientInstance = null;
export function getR2Client() {
  const config = getR2Config();
  if (!config.isConfigured) return null;
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

export async function uploadToR2(buffer, key, contentType = 'image/jpeg') {
  const config = getR2Config();
  const client = getR2Client();
  if (!client) throw new Error('Cloudflare R2 is not configured.');

  const cleanKey = key.replace(/^\/+/, '');
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `${config.publicUrl}/${cleanKey}`;
}

export async function uploadDataUrlToR2(dataUrl, folder = 'SabujKuthi/uploads', baseName = 'image') {
  const match = /^data:(image\/(png|jpeg|webp|jpg));base64,(.+)$/.exec(dataUrl);
  if (!match) return dataUrl; // Not a base64 data URL, return as-is
  const [, contentType, format, base64Data] = match;
  const ext = format === 'jpeg' ? 'jpg' : format;
  const buffer = Buffer.from(base64Data, 'base64');
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const key = `${folder}/${safeBaseName}_${Date.now()}.${ext}`;
  return uploadToR2(buffer, key, contentType);
}
