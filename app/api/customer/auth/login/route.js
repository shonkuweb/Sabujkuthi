import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { normalizePhone, verifyPassword } from '../../../../../lib/customer-auth.mjs';
import { createCustomerSession } from '../../../../../lib/customer-session.mjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { password } = body;
    const rawPhone = body.phone;

    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return NextResponse.json({ success: false, message: 'Please enter your registered phone number.' }, { status: 400 });
    }

    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ success: false, message: 'Please enter your password.' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { phone }
    });

    if (!customer || !verifyPassword(password, customer.passwordHash)) {
      return NextResponse.json({ success: false, message: 'Incorrect phone number or password. Please try again.' }, { status: 401 });
    }

    const token = await createCustomerSession({
      id: customer.id,
      phone: customer.phone,
      name: customer.name || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully!',
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
      }
    });

    response.cookies.set({
      name: 'customer_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json({ success: false, message: 'An error occurred during login. Please try again.' }, { status: 500 });
  }
}
