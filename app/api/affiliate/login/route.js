import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { normalizePhone, verifyPassword } from '../../../../lib/customer-auth.mjs';
import { createAffiliateSession } from '../../../../lib/affiliate-session.mjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { password } = body;
    const phone = normalizePhone(body.phone);

    if (!phone || typeof password !== 'string' || !password) {
      return NextResponse.json({ success: false, message: 'Please enter your mobile number and password.' }, { status: 400 });
    }

    const account = await prisma.affiliateAccount.findUnique({
      where: { phone }
    });

    if (!account || !verifyPassword(password, account.passwordHash)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid mobile number or password. Please verify your credentials.'
      }, { status: 401 });
    }

    const token = await createAffiliateSession(account);
    const response = NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        phone: account.phone,
        status: account.status,
      }
    });

    response.cookies.set('affiliate_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error('Affiliate login error:', err);
    return NextResponse.json({ success: false, message: 'Unable to log in. Please try again later.' }, { status: 500 });
  }
}
