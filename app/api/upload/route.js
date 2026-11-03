import { NextResponse } from 'next/server';
import { uploadToR2 } from '../../../lib/r2.mjs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No files received.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `SabujKuthi/uploads/${Date.now()}_${filename}`;

    const fileUrl = await uploadToR2(buffer, objectKey, file.type || 'image/jpeg');
    return NextResponse.json({ Message: 'Success', status: 201, url: fileUrl });
  } catch (error) {
    console.error('Error occurred uploading to R2:', error);
    return NextResponse.json({ Message: 'Failed', error: error.message }, { status: 500 });
  }
}
