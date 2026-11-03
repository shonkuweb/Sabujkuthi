import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import crypto from 'crypto';
import { createAdminSession } from '../../../../lib/admin-session.mjs';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (typeof password !== 'string' || !password || password.length > 200) return NextResponse.json({ success: false, message: 'Enter your admin password.' }, { status: 400 });

    const passwordSetting = await prisma.settings.findUnique({
      where: { key: 'admin_password' }
    });

    let isValid = false;

    if (passwordSetting) {
      if (hashPassword(password) === passwordSetting.value) {
        isValid = true;
      }
    } else {
      // Fallback to env password
      if (password === process.env.ADMIN_PASSWORD) {
        isValid = true;
      }
    }

    if (isValid) {
      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: 'admin_token',
        value: await createAdminSession(),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      });
      return response;
    }

    return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
