import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { isAdminRequest } from '../../../../../lib/admin-session.mjs';

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
      select: { id: true, isBanned: true, banReason: true }
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // If attempting to update ban note on an already banned account
    if (customer.isBanned && (body.banReason !== undefined || body.note !== undefined)) {
      return NextResponse.json({
        success: false,
        error: 'The ban note is permanent and cannot be edited after an account has been banned.',
      }, { status: 400 });
    }

    // Allowed updates (e.g. name, state, pincode)
    const data = {};
    if (typeof body.name === 'string') data.name = body.name.trim();
    if (typeof body.state === 'string') data.state = body.state.trim();
    if (typeof body.pincode === 'string') data.pincode = body.pincode.trim();

    const updated = await prisma.customer.update({
      where: { id },
      data,
      select: { id: true, phone: true, name: true, state: true, pincode: true, isBanned: true, banReason: true }
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error) {
    console.error('Customer patch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update customer.' }, { status: 500 });
  }
}
