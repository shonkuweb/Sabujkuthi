import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { hashPassword, isValidPhone, normalizePhone } from '../../../../../lib/customer-auth.mjs';
import { createCustomerSession } from '../../../../../lib/customer-session.mjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, password } = body;
    const rawPhone = body.phone;

    const phone = normalizePhone(rawPhone);
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';

    // Check if phone already registered
    const existing = await prisma.customer.findUnique({
      where: { phone }
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'An account with this phone number already exists. Please log in.'
      }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const customer = await prisma.customer.create({
      data: {
        phone,
        passwordHash,
        name: cleanName || null,
      }
    });

    const token = await createCustomerSession({
      id: customer.id,
      phone: customer.phone,
      name: customer.name || '',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name || '',
      }
    }, { status: 201 });

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
    console.error('Customer signup error:', error);
    return NextResponse.json({ success: false, message: 'An error occurred during sign up. Please try again.' }, { status: 500 });
  }
}
