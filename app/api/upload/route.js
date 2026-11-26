import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadToR2, uploadDataUrlToR2 } from '../../../lib/r2.mjs';

export const dynamic = 'force-dynamic';

async function saveToLocalUploads(buffer, filename) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(uploadsDir, safeName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${safeName}`;
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!body?.dataUrl) {
        return NextResponse.json({ error: 'No image data received.' }, { status: 400 });
      }
      const filename = (body.filename || 'hero_banner').replace(/[^a-zA-Z0-9.-]/g, '_');
      try {
        const fileUrl = await uploadDataUrlToR2(body.dataUrl, 'SabujKuthi/uploads', filename);
        if (fileUrl && fileUrl.startsWith('http')) {
          return NextResponse.json({ Message: 'Success', status: 201, url: fileUrl });
        }
      } catch (r2Err) {
        console.warn('R2 upload failed, saving to local uploads directory:', r2Err.message);
      }

      // Local fallback
      const match = /^data:(image\/(png|jpeg|webp|jpg));base64,(.+)$/.exec(body.dataUrl);
      if (match) {
        const [, , format, base64Data] = match;
        const ext = format === 'jpeg' ? 'jpg' : format;
        const buffer = Buffer.from(base64Data, 'base64');
        const localUrl = await saveToLocalUploads(buffer, `${filename}.${ext}`);
        return NextResponse.json({ Message: 'Success', status: 201, url: localUrl });
      }

      return NextResponse.json({ error: 'Invalid image format.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No files received.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = (file.name || 'hero_banner.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `SabujKuthi/uploads/${Date.now()}_${filename}`;

    try {
      const fileUrl = await uploadToR2(buffer, objectKey, file.type || 'image/jpeg');
      return NextResponse.json({ Message: 'Success', status: 201, url: fileUrl });
    } catch (r2Err) {
      console.warn('R2 upload failed, saving to local uploads directory:', r2Err.message);
      const localUrl = await saveToLocalUploads(buffer, filename);
      return NextResponse.json({ Message: 'Success', status: 201, url: localUrl });
    }
  } catch (error) {
    console.error('Error occurred uploading file:', error);
    return NextResponse.json({ Message: 'Failed', error: error.message }, { status: 500 });
  }
}
