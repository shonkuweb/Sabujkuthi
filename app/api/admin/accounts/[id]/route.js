import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { isAdminRequest } from '../../../../../lib/admin-session.mjs';
import { normalizePhone, isValidPhone } from '../../../../../lib/customer-auth.mjs';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, phone: true, name: true, isBanned: true, banReason: true }
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer account not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // Audit rule: The ban note is permanent and cannot be modified after an account has been banned
    if (customer.isBanned && (body.banReason !== undefined || body.note !== undefined)) {
      return NextResponse.json({
        success: false,
        error: 'The ban note is permanent and cannot be edited after an account has been banned.',
      }, { status: 400 });
    }

    const data = {};

    // 1. Phone number update & validation
    if (body.phone !== undefined) {
      const cleanPhone = normalizePhone(String(body.phone));
      if (!cleanPhone || !isValidPhone(cleanPhone)) {
        return NextResponse.json({
          success: false,
          error: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).'
        }, { status: 400 });
      }

      if (cleanPhone !== customer.phone) {
        const existing = await prisma.customer.findFirst({
          where: {
            phone: cleanPhone,
            NOT: { id: customer.id }
          }
        });
        if (existing) {
          return NextResponse.json({
            success: false,
            error: `Another account is already registered with mobile number +91 ${cleanPhone}.`
          }, { status: 409 });
        }
        data.phone = cleanPhone;
      }
    }

    // 2. Full Name
    if (body.name !== undefined) {
      data.name = typeof body.name === 'string' ? body.name.trim() : null;
    }

    // 3. Address
    if (body.address !== undefined) {
      data.address = typeof body.address === 'string' ? body.address.trim() : null;
    }

    // 4. Email
    if (body.email !== undefined) {
      const cleanEmail = typeof body.email === 'string' ? body.email.trim() : '';
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json({
          success: false,
          error: 'Please enter a valid email address.'
        }, { status: 400 });
      }
      data.email = cleanEmail || null;
    }

    // 5. State / Region
    if (body.state !== undefined) {
      data.state = typeof body.state === 'string' ? body.state.trim() : null;
    }

    // 6. Delivery Pincode
    if (body.pincode !== undefined) {
      const cleanPincode = typeof body.pincode === 'string' ? body.pincode.replace(/\D/g, '').slice(0, 6) : '';
      if (cleanPincode && cleanPincode.length !== 6) {
        return NextResponse.json({
          success: false,
          error: 'Pincode must be exactly 6 digits.'
        }, { status: 400 });
      }
      data.pincode = cleanPincode || null;
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data,
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        address: true,
        state: true,
        pincode: true,
        isBanned: true,
        banReason: true,
        bannedAt: true,
        lastActiveAt: true,
        lastLoginAt: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Customer account details updated successfully.',
      customer: updated
    });
  } catch (error) {
    console.error('Customer patch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update customer account.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, phone: true, name: true }
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer account not found.' }, { status: 404 });
    }

    await prisma.customer.delete({
      where: { id: customer.id }
    });

    return NextResponse.json({
      success: true,
      message: `Account for ${customer.name ? `${customer.name} (+91 ${customer.phone})` : `+91 ${customer.phone}`} has been permanently deleted.`
    });
  } catch (error) {
    console.error('Customer delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete customer account.' }, { status: 500 });
  }
}
