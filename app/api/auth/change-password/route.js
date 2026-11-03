import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import crypto from 'crypto';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request) {
  try {
    // Check if the user is authenticated
    if (!await isAdminRequest(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 200) return NextResponse.json({ success: false, message: 'New password must be between 6 and 200 characters.' }, { status: 400 });

    const passwordSetting = await prisma.settings.findUnique({
      where: { key: 'admin_password' }
    });

    let isCurrentValid = false;
    
    if (passwordSetting) {
      if (hashPassword(currentPassword) === passwordSetting.value) {
        isCurrentValid = true;
      }
    } else {
      if (currentPassword === process.env.ADMIN_PASSWORD) {
        isCurrentValid = true;
      }
    }

    if (!isCurrentValid) {
      return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
    }

    // Update password
    const hashedNewPassword = hashPassword(newPassword);

    await prisma.settings.upsert({
      where: { key: 'admin_password' },
      update: { value: hashedNewPassword },
      create: { key: 'admin_password', value: hashedNewPassword }
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
