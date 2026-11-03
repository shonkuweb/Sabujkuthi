import { NextResponse } from 'next/server';
import { uploadToR2, uploadDataUrlToR2 } from '../../../lib/r2.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!body?.dataUrl) {
        return NextResponse.json({ error: 'No image data received.' }, { status: 400 });
      }
      const filename = (body.filename || 'hero_banner').replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileUrl = await uploadDataUrlToR2(body.dataUrl, 'SabujKuthi/uploads', filename);
      return NextResponse.json({ Message: 'Success', status: 201, url: fileUrl });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No files received.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = (file.name || 'hero_banner.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `SabujKuthi/uploads/${Date.now()}_${filename}`;

    const fileUrl = await uploadToR2(buffer, objectKey, file.type || 'image/jpeg');
    return NextResponse.json({ Message: 'Success', status: 201, url: fileUrl });
  } catch (error) {
    console.error('Error occurred uploading to R2:', error);
    return NextResponse.json({ Message: 'Failed', error: error.message }, { status: 500 });
  }
}
